import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, type CSSProperties } from 'react'
import { useApp, useCelulas, useCorCelula, useProjetosVisiveis, useSprintsVisiveis } from '../store'
import { BARREIRA, DESFECHO, ESFORCO, PRIORIDADE, STATUS, TIPO, formatarData, hoje, uid } from '../lib/constants'
import type { Esforco, Prioridade, Projeto, Status, Tipo } from '../types'
import { Icone, Interruptor, progresso } from './ui'
import { Encerrar } from './Encerrar'

/** Campo de texto que só salva ao sair do campo (evita gravar a cada tecla) */
function TextoSalvo({
  valor,
  aoSalvar,
  multilinha,
  className,
  placeholder,
  desabilitado,
  lista,
}: {
  lista?: string
  valor: string
  aoSalvar: (v: string) => void
  multilinha?: boolean
  className?: string
  placeholder?: string
  desabilitado: boolean
}) {
  const [v, setV] = useState(valor)
  useEffect(() => setV(valor), [valor])
  const salvar = () => v !== valor && aoSalvar(v)
  if (multilinha)
    return desabilitado ? (
      <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: valor ? 'var(--texto)' : 'var(--texto-3)' }}>{valor || 'Sem descrição.'}</p>
    ) : (
      <textarea className={className} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={salvar} />
    )
  return (
    <input
      type="text"
      list={lista}
      className={className}
      value={v}
      placeholder={placeholder}
      disabled={desabilitado}
      onChange={(e) => setV(e.target.value)}
      onBlur={salvar}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  )
}

function Conteudo({ p }: { p: Projeto }) {
  const podeEditar = useApp((s) => s.podeEditar)
  const atualizar = useApp((s) => s.atualizarProjeto)
  const remover = useApp((s) => s.removerProjeto)
  const selecionar = useApp((s) => s.selecionar)
  const sprints = useSprintsVisiveis()
  const celulas = useCelulas()
  const cor = useCorCelula()
  const [novaTarefa, setNovaTarefa] = useState('')
  const [novaNota, setNovaNota] = useState('')
  const [encerrando, setEncerrando] = useState(false)
  const [confirmarRemocao, setConfirmarRemocao] = useState(false)
  const ro = !podeEditar
  const set = (m: Partial<Projeto>) => atualizar(p.id, m)
  const prog = progresso(p)

  const mudarStatus = (s: Status) => (s === 'encerrado' ? setEncerrando(true) : set({ status: s }))

  const addTarefa = () => {
    if (!novaTarefa.trim()) return
    set({ tarefas: [...p.tarefas, { id: uid(), titulo: novaTarefa.trim(), feita: false }] })
    setNovaTarefa('')
  }
  const addNota = () => {
    if (!novaNota.trim()) return
    set({ diario: [...p.diario, { id: uid(), data: hoje(), texto: novaNota.trim() }] })
    setNovaNota('')
  }

  return (
    <>
      <header className="gaveta-cab" style={{ '--cor': cor(p.celula) } as CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span className="selo">
            <span className="ponto" style={{ background: STATUS.find((s) => s.id === p.status)!.cor }} />
            {STATUS.find((s) => s.id === p.status)!.nome}
          </span>
          {p.desfecho && p.status === 'encerrado' && (
            <span className={'desfecho ' + p.desfecho}>
              {DESFECHO[p.desfecho].icone} {DESFECHO[p.desfecho].nome}
            </span>
          )}
          {!p.publico && podeEditar && (
            <span className="selo">
              <Icone nome="cadeado" tam={12} /> Privado
            </span>
          )}
          <button className="btn fantasma icone" style={{ marginLeft: 'auto' }} onClick={() => selecionar(null)} aria-label="Fechar">
            <Icone nome="fechar" />
          </button>
        </div>
        <TextoSalvo className="titulo" valor={p.titulo} aoSalvar={(titulo) => titulo.trim() && set({ titulo: titulo.trim() })} desabilitado={ro} />
        {p.tarefas.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, fontSize: 12, color: 'var(--texto-3)' }}>
            <div className="progresso" style={{ flex: 1, margin: 0 }}>
              <div style={{ width: `${prog * 100}%` }} />
            </div>
            {Math.round(prog * 100)}%
          </div>
        )}
      </header>

      <div className="gaveta-corpo">
        {p.status === 'encerrado' && p.desfecho && (
          <div className={'caixa-encerramento ' + (p.desfecho === 'concluido' ? 'ok' : p.desfecho)}>
            <b>
              {DESFECHO[p.desfecho].icone} {DESFECHO[p.desfecho].nome}
            </b>{' '}
            em {formatarData(p.encerradoEm)}
            {p.barreira && (
              <div style={{ marginTop: 6, fontSize: 13 }}>
                <span className="selo" style={{ marginRight: 6 }}>
                  {BARREIRA[p.barreira.categoria]}
                </span>
                {p.barreira.descricao}
              </div>
            )}
          </div>
        )}

        <div className="grade-campos">
          <label>
            <span>Status</span>
            <select value={p.status} disabled={ro} onChange={(e) => mudarStatus(e.target.value as Status)}>
              {STATUS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Sprint</span>
            <select value={p.sprintId ?? ''} disabled={ro} onChange={(e) => set({ sprintId: e.target.value || null })}>
              <option value="">— Nenhuma —</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                  {s.encerrada ? ' (encerrada)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Solicitante</span>
            <TextoSalvo valor={p.solicitante} aoSalvar={(solicitante) => set({ solicitante })} desabilitado={ro} placeholder="Quem pediu" />
          </label>
          <label>
            <span>Célula</span>
            {ro ? (
              <input type="text" value={p.celula} disabled />
            ) : (
              <>
                <TextoSalvo lista="celulas" valor={p.celula} aoSalvar={(celula) => set({ celula })} desabilitado={ro} placeholder="Ex.: Marketing" />
                <datalist id="celulas">
                  {celulas.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </>
            )}
          </label>
          <label>
            <span>Tipo</span>
            <select value={p.tipo} disabled={ro} onChange={(e) => set({ tipo: e.target.value as Tipo })}>
              {Object.entries(TIPO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Prioridade</span>
            <select value={p.prioridade} disabled={ro} onChange={(e) => set({ prioridade: Number(e.target.value) as Prioridade })}>
              {Object.entries(PRIORIDADE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Esforço</span>
            <select value={p.esforco} disabled={ro} onChange={(e) => set({ esforco: e.target.value as Esforco })}>
              {Object.entries(ESFORCO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Entrada</span>
            {ro ? <input type="text" disabled value={formatarData(p.entrada)} /> : <input type="date" value={p.entrada} onChange={(e) => e.target.value && set({ entrada: e.target.value })} />}
          </label>
          <label>
            <span>Prazo</span>
            {ro ? <input type="text" disabled value={formatarData(p.prazo)} /> : <input type="date" value={p.prazo ?? ''} onChange={(e) => set({ prazo: e.target.value || undefined })} />}
          </label>
          {podeEditar && (
            <label>
              <span>Visibilidade</span>
              <Interruptor ligado={p.publico} aoMudar={(publico) => set({ publico })} rotulo={p.publico ? 'Visível p/ visitantes' : 'Só eu vejo'} />
            </label>
          )}
        </div>

        <section className="secao">
          <div className="secao-cab">
            <h4>Descrição</h4>
          </div>
          <TextoSalvo multilinha valor={p.descricao} aoSalvar={(descricao) => set({ descricao })} desabilitado={ro} placeholder="Contexto, objetivo, links…" />
        </section>

        <section className="secao">
          <div className="secao-cab">
            <h4>Tarefas</h4>
            <small style={{ color: 'var(--texto-3)' }}>
              {p.tarefas.filter((t) => t.feita).length}/{p.tarefas.length}
            </small>
          </div>
          {p.tarefas.length === 0 && <p style={{ color: 'var(--texto-3)', margin: '0 0 6px' }}>Nenhuma tarefa.</p>}
          {p.tarefas.map((t) => (
            <div key={t.id} className={'tarefa' + (t.feita ? ' feita' : '')}>
              <button
                className={'check' + (t.feita ? ' on' : '')}
                disabled={ro}
                aria-label={t.feita ? 'Desmarcar' : 'Marcar como feita'}
                onClick={() => set({ tarefas: p.tarefas.map((x) => (x.id === t.id ? { ...x, feita: !x.feita } : x)) })}
              >
                {t.feita && <Icone nome="check" tam={12} />}
              </button>
              <span className="texto">{t.titulo}</span>
              {!ro && (
                <button className="btn fantasma pequeno remover" aria-label="Remover tarefa" onClick={() => set({ tarefas: p.tarefas.filter((x) => x.id !== t.id) })}>
                  <Icone nome="fechar" tam={13} />
                </button>
              )}
            </div>
          ))}
          {!ro && (
            <div className="linha-add">
              <input type="text" value={novaTarefa} placeholder="Nova tarefa…" onChange={(e) => setNovaTarefa(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTarefa()} />
              <button className="btn" onClick={addTarefa}>
                <Icone nome="mais" tam={14} />
              </button>
            </div>
          )}
        </section>

        <section className="secao">
          <div className="secao-cab">
            <h4>Diário de bordo</h4>
          </div>
          {!ro && (
            <div className="linha-add" style={{ marginBottom: 14 }}>
              <input type="text" value={novaNota} placeholder="Registrar avanço, descoberta, link…" onChange={(e) => setNovaNota(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNota()} />
              <button className="btn" onClick={addNota}>
                Registrar
              </button>
            </div>
          )}
          {p.diario.length === 0 && <p style={{ color: 'var(--texto-3)', margin: 0 }}>Sem registros ainda.</p>}
          {[...p.diario].reverse().map((d) => (
            <div key={d.id} className="diario-item">
              <time>{formatarData(d.data)}</time>
              <p>{d.texto}</p>
            </div>
          ))}
        </section>

        {podeEditar && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, paddingTop: 10, borderTop: '1px solid var(--borda)' }}>
            <small style={{ color: 'var(--texto-3)', alignSelf: 'center' }}>Atualizado {formatarData(p.atualizadoEm)}</small>
            {confirmarRemocao ? (
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="btn fantasma pequeno" onClick={() => setConfirmarRemocao(false)}>
                  Cancelar
                </button>
                <button className="btn perigo pequeno" onClick={() => remover(p.id)}>
                  Confirmar exclusão
                </button>
              </span>
            ) : (
              <button className="btn perigo pequeno" onClick={() => setConfirmarRemocao(true)}>
                <Icone nome="lixo" tam={14} /> Excluir
              </button>
            )}
          </div>
        )}
      </div>
      <Encerrar projetoId={encerrando ? p.id : null} aoFechar={() => setEncerrando(false)} />
    </>
  )
}

export function Detalhe() {
  const id = useApp((s) => s.selecionado)
  const selecionar = useApp((s) => s.selecionar)
  const projetos = useProjetosVisiveis()
  const p = projetos.find((x) => x.id === id)

  useEffect(() => {
    if (!id) return
    const f = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('.modal') && selecionar(null)
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [id, selecionar])

  return (
    <AnimatePresence>
      {p && (
        <motion.aside
          key="gaveta"
          className="gaveta"
          initial={{ x: '100%', opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.6 }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        >
          <Conteudo key={p.id} p={p} />
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
