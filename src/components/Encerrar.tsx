import { useEffect, useState } from 'react'
import { Modal } from './ui'
import { BARREIRA, DESFECHO } from '../lib/constants'
import type { BarreiraCategoria, Desfecho } from '../types'
import { useApp } from '../store'
import { hoje, uid } from '../lib/constants'

/** Pergunta COMO a demanda foi encerrada (concluída, só pesquisa ou barreira) */
export function Encerrar({ projetoId, aoFechar }: { projetoId: string | null; aoFechar: () => void }) {
  const projeto = useApp((s) => s.projetos.find((p) => p.id === projetoId))
  const atualizar = useApp((s) => s.atualizarProjeto)
  const [desfecho, setDesfecho] = useState<Desfecho>('concluido')
  const [categoria, setCategoria] = useState<BarreiraCategoria>('tecnica')
  const [nota, setNota] = useState('')

  useEffect(() => {
    if (projetoId) {
      setDesfecho('concluido')
      setCategoria('tecnica')
      setNota('')
    }
  }, [projetoId])

  const confirmar = async () => {
    if (!projeto) return
    const diario = nota.trim()
      ? [...projeto.diario, { id: uid(), data: hoje(), texto: `Encerrado (${DESFECHO[desfecho].nome}): ${nota.trim()}` }]
      : projeto.diario
    await atualizar(projeto.id, {
      status: 'encerrado',
      desfecho,
      barreira: desfecho === 'barreira' ? { categoria, descricao: nota.trim() } : null,
      diario,
    })
    aoFechar()
  }

  return (
    <Modal aberto={!!projetoId} aoFechar={aoFechar}>
      <h2>Encerrar demanda</h2>
      <p className="sub">{projeto?.titulo}</p>
      <div className="opcoes-desfecho">
        {(
          [
            ['concluido', 'Entregue e finalizado'],
            ['pesquisa', 'Pesquisei e entreguei a conclusão'],
            ['barreira', 'Parou por um impedimento'],
          ] as [Desfecho, string][]
        ).map(([id, txt]) => (
          <button key={id} type="button" className={'opcao' + (desfecho === id ? ' on' : '')} onClick={() => setDesfecho(id)}>
            <b>
              {DESFECHO[id].icone} {DESFECHO[id].nome}
            </b>
            <span>{txt}</span>
          </button>
        ))}
      </div>
      {desfecho === 'barreira' && (
        <div className="form-grade" style={{ marginBottom: 12 }}>
          <label className="inteiro">
            Tipo de barreira
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as BarreiraCategoria)}>
              {Object.entries(BARREIRA).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <label className="rotulo" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12, color: 'var(--texto-2)' }}>
        {desfecho === 'barreira' ? 'O que travou? (vira aprendizado para próximas demandas)' : desfecho === 'pesquisa' ? 'Conclusão da pesquisa' : 'Observação final (opcional)'}
        <textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Escreva aqui…" />
      </label>
      <div className="rodape-modal">
        <button className="btn fantasma" onClick={aoFechar}>
          Cancelar
        </button>
        <button className="btn primario" onClick={confirmar}>
          Encerrar
        </button>
      </div>
    </Modal>
  )
}
