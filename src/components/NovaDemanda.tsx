import { useEffect, useState } from 'react'
import { Modal, Interruptor } from './ui'
import { novoProjeto, useApp, useCelulas } from '../store'
import { ESFORCO, PRIORIDADE, STATUS, TIPO, hoje, uid } from '../lib/constants'
import type { Esforco, Prioridade, Status, Tipo } from '../types'

const PERGUNTAS = [
  ['problema', 'Qual é o problema real (não a solução pedida)?'],
  ['pronto', 'Já existe ferramenta pronta / algo no escritório que resolve?'],
  ['valida', 'Quem valida a entrega e como saberemos que deu certo?'],
  ['dados', 'Envolve dados sensíveis, acesso a sistemas ou custo?'],
] as const

export function NovaDemanda() {
  const aberto = useApp((s) => s.novaDemandaAberta)
  const abrir = useApp((s) => s.abrir)
  const salvar = useApp((s) => s.salvarProjeto)
  const selecionar = useApp((s) => s.selecionar)
  const avisar = useApp((s) => s.avisar)
  const celulas = useCelulas()
  const vazio = {
    titulo: '',
    descricao: '',
    solicitante: '',
    celula: '',
    tipo: 'automacao' as Tipo,
    status: 'entrada' as Status,
    prioridade: 2 as Prioridade,
    esforco: 'M' as Esforco,
    prazo: '',
    publico: true,
  }
  const [f, setF] = useState(vazio)
  const [triagem, setTriagem] = useState<Record<string, string>>({})
  useEffect(() => {
    if (aberto) {
      setF(vazio)
      setTriagem({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  const fechar = () => abrir('novaDemanda', false)
  const criar = async () => {
    if (!f.titulo.trim()) return
    const respostas = PERGUNTAS.filter(([k]) => triagem[k]?.trim()).map(([k, q]) => `• ${q}\n  ${triagem[k].trim()}`)
    const p = novoProjeto({
      ...f,
      titulo: f.titulo.trim(),
      prazo: f.prazo || undefined,
      diario: respostas.length ? [{ id: uid(), data: hoje(), texto: 'Triagem inicial:\n' + respostas.join('\n') }] : [],
    })
    await salvar(p)
    fechar()
    avisar('Demanda registrada ✦')
    selecionar(p.id)
  }

  return (
    <Modal aberto={aberto} aoFechar={fechar}>
      <h2>Nova demanda</h2>
      <p className="sub">Registre rápido — dá para detalhar depois.</p>
      <form
        className="form-grade"
        onSubmit={(e) => {
          e.preventDefault()
          criar()
        }}
      >
        <label className="inteiro">
          Título *
          <input type="text" autoFocus value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Ex.: Automatizar relatório de prazos" />
        </label>
        <label className="inteiro">
          Descrição
          <textarea value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="O que foi pedido, contexto, links…" style={{ minHeight: 64 }} />
        </label>
        <label>
          Solicitante
          <input type="text" value={f.solicitante} onChange={(e) => setF({ ...f, solicitante: e.target.value })} placeholder="Quem pediu" />
        </label>
        <label>
          Célula
          <input type="text" list="celulas-nova" value={f.celula} onChange={(e) => setF({ ...f, celula: e.target.value })} placeholder="Ex.: Marketing" />
          <datalist id="celulas-nova">
            {celulas.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label>
          Tipo
          <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as Tipo })}>
            {Object.entries(TIPO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status inicial
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Status })}>
            {STATUS.filter((s) => s.id !== 'encerrado').map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Prioridade
          <select value={f.prioridade} onChange={(e) => setF({ ...f, prioridade: Number(e.target.value) as Prioridade })}>
            {Object.entries(PRIORIDADE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Esforço estimado
          <select value={f.esforco} onChange={(e) => setF({ ...f, esforco: e.target.value as Esforco })}>
            {Object.entries(ESFORCO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Prazo (opcional)
          <input type="date" value={f.prazo} onChange={(e) => setF({ ...f, prazo: e.target.value })} />
        </label>
        <label>
          Visibilidade
          <Interruptor ligado={f.publico} aoMudar={(publico) => setF({ ...f, publico })} rotulo={f.publico ? 'Visível p/ visitantes' : 'Só eu vejo'} />
        </label>

        <details className="triagem inteiro">
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Checklist de triagem (opcional)</summary>
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {PERGUNTAS.map(([k, q]) => (
              <label key={k}>
                {q}
                <input type="text" value={triagem[k] ?? ''} onChange={(e) => setTriagem({ ...triagem, [k]: e.target.value })} />
              </label>
            ))}
            <small style={{ color: 'var(--texto-3)' }}>As respostas vão para o diário de bordo do projeto.</small>
          </div>
        </details>

        <div className="rodape-modal inteiro">
          <button type="button" className="btn fantasma" onClick={fechar}>
            Cancelar
          </button>
          <button type="submit" className="btn primario" disabled={!f.titulo.trim()}>
            Registrar demanda
          </button>
        </div>
      </form>
    </Modal>
  )
}
