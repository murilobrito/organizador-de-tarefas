import { useState } from 'react'
import { motion } from 'framer-motion'
import { useApp, useCorCelula, useProjetosVisiveis, useSprintsVisiveis } from '../store'
import { diasEntre, formatarData, hoje, statusInfo, uid } from '../lib/constants'
import type { Sprint } from '../types'
import { Icone, Interruptor, Modal, progresso } from '../components/ui'

function EditorSprint({ sprint, aoFechar }: { sprint: Sprint | null; aoFechar: () => void }) {
  const salvar = useApp((s) => s.salvarSprint)
  const [f, setF] = useState<Sprint | null>(sprint)
  return (
    <Modal aberto={!!sprint} aoFechar={aoFechar}>
      {f && (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!f.nome.trim()) return
            await salvar(f)
            aoFechar()
          }}
        >
          <h2>{f.encerrada ? 'Retrospectiva da sprint' : 'Sprint de foco'}</h2>
          <p className="sub">Ciclos curtos (1–2 semanas) com no máximo 3 projetos funcionam melhor.</p>
          <div className="form-grade">
            <label className="inteiro">
              Nome
              <input type="text" value={f.nome} autoFocus onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Sprint 03 · Novembro" />
            </label>
            <label className="inteiro">
              Objetivo da sprint
              <input type="text" value={f.objetivo} onChange={(e) => setF({ ...f, objetivo: e.target.value })} placeholder="O que precisa estar pronto ao final?" />
            </label>
            <label>
              Início
              <input type="date" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} />
            </label>
            <label>
              Fim
              <input type="date" value={f.fim} onChange={(e) => setF({ ...f, fim: e.target.value })} />
            </label>
            <label>
              Visibilidade
              <Interruptor ligado={f.publico} aoMudar={(publico) => setF({ ...f, publico })} rotulo={f.publico ? 'Visível p/ visitantes' : 'Só eu vejo'} />
            </label>
            {f.encerrada && (
              <>
                <label className="inteiro">
                  ✅ O que andou
                  <textarea value={f.retro?.andou ?? ''} onChange={(e) => setF({ ...f, retro: { andou: e.target.value, travou: f.retro?.travou ?? '', aprendi: f.retro?.aprendi ?? '' } })} style={{ minHeight: 54 }} />
                </label>
                <label className="inteiro">
                  ⛔ O que travou
                  <textarea value={f.retro?.travou ?? ''} onChange={(e) => setF({ ...f, retro: { andou: f.retro?.andou ?? '', travou: e.target.value, aprendi: f.retro?.aprendi ?? '' } })} style={{ minHeight: 54 }} />
                </label>
                <label className="inteiro">
                  💡 O que aprendi
                  <textarea value={f.retro?.aprendi ?? ''} onChange={(e) => setF({ ...f, retro: { andou: f.retro?.andou ?? '', travou: f.retro?.travou ?? '', aprendi: e.target.value } })} style={{ minHeight: 54 }} />
                </label>
              </>
            )}
          </div>
          <div className="rodape-modal">
            <button type="button" className="btn fantasma" onClick={aoFechar}>
              Cancelar
            </button>
            <button type="submit" className="btn primario">
              Salvar
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default function Sprints() {
  const sprints = useSprintsVisiveis()
  const projetos = useProjetosVisiveis()
  const podeEditar = useApp((s) => s.podeEditar)
  const selecionar = useApp((s) => s.selecionar)
  const atualizar = useApp((s) => s.atualizarProjeto)
  const removerSprint = useApp((s) => s.removerSprint)
  const cor = useCorCelula()
  const [editando, setEditando] = useState<Sprint | null>(null)
  const [adicionar, setAdicionar] = useState('')

  const ordenadas = [...sprints].sort((a, b) => b.inicio.localeCompare(a.inicio))
  const ativa = ordenadas.find((s) => !s.encerrada)
  const passadas = ordenadas.filter((s) => s !== ativa)
  const daSprint = (id: string) => projetos.filter((p) => p.sprintId === id)

  const nova = () => {
    const ini = hoje()
    const fim = new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10)
    setEditando({ id: uid(), nome: `Sprint ${String(sprints.length + 1).padStart(2, '0')}`, objetivo: '', inicio: ini, fim, encerrada: false, retro: null, publico: true })
  }

  const encerrarSprint = (s: Sprint) => setEditando({ ...s, encerrada: true, retro: s.retro ?? { andou: '', travou: '', aprendi: '' } })

  const candidatos = projetos.filter((p) => p.status !== 'encerrado' && p.sprintId !== ativa?.id)

  return (
    <div className="rolavel">
      <div className="sprints">
        <div className="cab-pagina">
          <div>
            <h2>Sprints de foco</h2>
            <p>Escolha poucos projetos por ciclo e proteja o tempo deles.</p>
          </div>
          {podeEditar && !ativa && (
            <button className="btn primario" onClick={nova}>
              <Icone nome="mais" tam={15} /> Nova sprint
            </button>
          )}
        </div>

        {ativa ? (
          <motion.section className="vidro sprint-ativa" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <span className="rotulo-ativa">◉ Sprint ativa</span>
                <h3>{ativa.nome}</h3>
                <p className="objetivo">🎯 {ativa.objetivo || 'Sem objetivo definido'}</p>
              </div>
              {podeEditar && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <button className="btn pequeno" onClick={() => setEditando(ativa)}>
                    Editar
                  </button>
                  <button className="btn pequeno" onClick={() => encerrarSprint(ativa)}>
                    Encerrar e fazer retro
                  </button>
                </div>
              )}
            </div>
            {(() => {
              const total = Math.max(1, diasEntre(ativa.inicio, ativa.fim))
              const passados = Math.min(total, diasEntre(ativa.inicio, hoje()))
              const restam = Math.max(0, diasEntre(hoje(), ativa.fim))
              return (
                <div className="linha-tempo">
                  <span>{formatarData(ativa.inicio)}</span>
                  <div className="progresso">
                    <div style={{ width: `${(passados / total) * 100}%` }} />
                  </div>
                  <span>{formatarData(ativa.fim)}</span>
                  <b style={{ color: '#ffd36e' }}>{restam === 0 ? 'último dia' : `${restam} dias restantes`}</b>
                </div>
              )
            })()}
            <div className="grade-sprint">
              {daSprint(ativa.id).map((p) => (
                <div key={p.id} className="mini-projeto" onClick={() => selecionar(p.id)}>
                  {podeEditar && (
                    <button
                      className="btn fantasma pequeno tirar"
                      title="Tirar da sprint"
                      onClick={(e) => {
                        e.stopPropagation()
                        atualizar(p.id, { sprintId: null, status: p.status === 'foco' ? 'backlog' : p.status })
                      }}
                    >
                      <Icone nome="fechar" tam={12} />
                    </button>
                  )}
                  <h4>{p.titulo}</h4>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--texto-3)' }}>
                    <span className="ponto" style={{ width: 8, height: 8, borderRadius: '50%', background: cor(p.celula) }} />
                    {p.celula} · {statusInfo(p.status).nome}
                  </div>
                  <div className="progresso">
                    <div style={{ width: `${progresso(p) * 100}%` }} />
                  </div>
                </div>
              ))}
              {daSprint(ativa.id).length === 0 && <div className="coluna-vazia">Nenhum projeto nesta sprint ainda.</div>}
            </div>
            {daSprint(ativa.id).length > 3 && <p className="aviso-foco">⚠ {daSprint(ativa.id).length} projetos na sprint — considere reduzir para manter o foco.</p>}
            {podeEditar && candidatos.length > 0 && (
              <div className="linha-add" style={{ marginTop: 14, maxWidth: 520 }}>
                <select value={adicionar} onChange={(e) => setAdicionar(e.target.value)} style={{ flex: 1 }}>
                  <option value="">Adicionar projeto à sprint…</option>
                  {candidatos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.titulo} ({statusInfo(p.status).nome})
                    </option>
                  ))}
                </select>
                <button
                  className="btn"
                  disabled={!adicionar}
                  onClick={() => {
                    atualizar(adicionar, { sprintId: ativa.id, status: 'foco' })
                    setAdicionar('')
                  }}
                >
                  Adicionar
                </button>
              </div>
            )}
          </motion.section>
        ) : (
          <div className="vidro vazio-grande" style={{ marginBottom: 22 }}>
            Nenhuma sprint ativa no momento.
          </div>
        )}

        <h3 style={{ fontSize: 16, margin: '0 0 12px' }}>Histórico</h3>
        <div className="lista-sprints">
          {passadas.length === 0 && <p style={{ color: 'var(--texto-3)' }}>Nenhuma sprint encerrada ainda.</p>}
          {passadas.map((s) => {
            const ps = daSprint(s.id)
            return (
              <div key={s.id} className="vidro sprint-item">
                <div className="linha">
                  <h4>{s.nome}</h4>
                  <span className="selo">
                    {formatarData(s.inicio)} → {formatarData(s.fim)}
                  </span>
                  <span className="selo">{ps.length} projetos</span>
                  {podeEditar && (
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      <button className="btn pequeno" onClick={() => setEditando(s)}>
                        Editar retro
                      </button>
                      <button className="btn perigo pequeno" onClick={() => removerSprint(s.id)} title="Excluir sprint">
                        <Icone nome="lixo" tam={13} />
                      </button>
                    </span>
                  )}
                </div>
                {s.objetivo && <p style={{ margin: '6px 0 0', color: 'var(--texto-2)' }}>🎯 {s.objetivo}</p>}
                {ps.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {ps.map((p) => (
                      <button key={p.id} className="selo" style={{ cursor: 'pointer' }} onClick={() => selecionar(p.id)}>
                        <span className="ponto" style={{ background: cor(p.celula) }} />
                        {p.titulo}
                      </button>
                    ))}
                  </div>
                )}
                {s.retro && (s.retro.andou || s.retro.travou || s.retro.aprendi) && (
                  <div className="retro">
                    <div>
                      <b>✅ Andou</b>
                      {s.retro.andou || '—'}
                    </div>
                    <div>
                      <b>⛔ Travou</b>
                      {s.retro.travou || '—'}
                    </div>
                    <div>
                      <b>💡 Aprendi</b>
                      {s.retro.aprendi || '—'}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <EditorSprint key={editando ? editando.id + String(editando.encerrada) : 'nenhuma'} sprint={editando} aoFechar={() => setEditando(null)} />
    </div>
  )
}
