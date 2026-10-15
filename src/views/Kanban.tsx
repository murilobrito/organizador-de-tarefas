import { useState, type CSSProperties } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useApp, useCorCelula, useProjetosFiltrados, useSprintsVisiveis } from '../store'
import { DESFECHO, STATUS, TIPO, formatarData } from '../lib/constants'
import type { Projeto, Status } from '../types'
import { Icone, Prioridade, progresso } from '../components/ui'
import { Encerrar } from '../components/Encerrar'

function ConteudoCartao({ p }: { p: Projeto }) {
  const sprints = useSprintsVisiveis()
  const podeEditar = useApp((s) => s.podeEditar)
  const sprint = p.sprintId ? sprints.find((s) => s.id === p.sprintId) : null
  const prog = progresso(p)
  const feitas = p.tarefas.filter((t) => t.feita).length
  return (
    <>
      <Prioridade p={p.prioridade} />
      <h4>
        {podeEditar && !p.publico && (
          <span title="Privado — visitantes não veem" style={{ marginRight: 5, color: 'var(--texto-3)', verticalAlign: '-2px' }}>
            <Icone nome="cadeado" tam={13} />
          </span>
        )}
        {p.titulo}
      </h4>
      <div className="meta">
        <span className="selo">{p.celula || 'Sem célula'}</span>
        <span>{TIPO[p.tipo]}</span>
        {p.desfecho && p.status === 'encerrado' && (
          <span className={'desfecho ' + p.desfecho}>
            {DESFECHO[p.desfecho].icone} {DESFECHO[p.desfecho].nome}
          </span>
        )}
      </div>
      {p.tarefas.length > 0 && (
        <div className="progresso">
          <div style={{ width: `${prog * 100}%` }} />
        </div>
      )}
      <div className="rodape">
        <span>{p.tarefas.length > 0 ? `${feitas}/${p.tarefas.length} tarefas` : 'Sem tarefas'}</span>
        <span>{sprint ? `◉ ${sprint.nome.split('·')[0].trim()}` : p.prazo ? `Prazo ${formatarData(p.prazo)}` : formatarData(p.entrada)}</span>
      </div>
    </>
  )
}

function Cartao({ p }: { p: Projeto }) {
  const podeEditar = useApp((s) => s.podeEditar)
  const selecionar = useApp((s) => s.selecionar)
  const cor = useCorCelula()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: p.id, disabled: !podeEditar })
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={'cartao' + (isDragging ? ' arrastando' : '')}
      style={
        {
          '--cor': cor(p.celula),
          transform: `perspective(700px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
        } as CSSProperties
      }
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 8, y: -((e.clientY - r.top) / r.height - 0.5) * 8 })
      }}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      onClick={() => selecionar(p.id)}
    >
      <ConteudoCartao p={p} />
    </div>
  )
}

function Coluna({ status, projetos }: { status: (typeof STATUS)[number]; projetos: Projeto[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id })
  return (
    <section ref={setNodeRef} className={'coluna' + (isOver ? ' alvo' : '')}>
      <header className="coluna-cab">
        <span className="barra" style={{ background: status.cor, boxShadow: `0 0 10px ${status.cor}` }} />
        <h3>
          {status.nome}
          <small>{status.dica}</small>
        </h3>
        <span className="contagem">{projetos.length}</span>
      </header>
      <div className="coluna-corpo">
        {projetos.length === 0 && <div className="coluna-vazia">Nada por aqui</div>}
        {projetos.map((p) => (
          <Cartao key={p.id} p={p} />
        ))}
      </div>
    </section>
  )
}

export default function Kanban() {
  const projetos = useProjetosFiltrados()
  const mover = useApp((s) => s.moverProjeto)
  const podeEditar = useApp((s) => s.podeEditar)
  const avisar = useApp((s) => s.avisar)
  const cor = useCorCelula()
  const [arrastando, setArrastando] = useState<Projeto | null>(null)
  const [encerrando, setEncerrando] = useState<string | null>(null)
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))

  const ordenar = (a: Projeto, b: Projeto) => a.prioridade - b.prioridade || b.atualizadoEm.localeCompare(a.atualizadoEm)

  const inicio = (e: DragStartEvent) => setArrastando(projetos.find((p) => p.id === e.active.id) ?? null)
  const fim = (e: DragEndEvent) => {
    setArrastando(null)
    const destino = e.over?.id as Status | undefined
    const p = projetos.find((x) => x.id === e.active.id)
    if (!destino || !p || p.status === destino) return
    if (destino === 'encerrado') return setEncerrando(p.id)
    mover(p.id, destino)
    avisar(`“${p.titulo}” → ${STATUS.find((s) => s.id === destino)!.nome}`)
  }

  return (
    <DndContext sensors={sensores} onDragStart={inicio} onDragEnd={fim} onDragCancel={() => setArrastando(null)}>
      <div className="kanban" aria-label={podeEditar ? 'Kanban (arraste para mudar o status)' : 'Kanban (somente leitura)'}>
        {STATUS.map((s) => (
          <Coluna key={s.id} status={s} projetos={projetos.filter((p) => p.status === s.id).sort(ordenar)} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
        {arrastando && (
          <div className="cartao fantasma" style={{ '--cor': cor(arrastando.celula) } as CSSProperties}>
            <ConteudoCartao p={arrastando} />
          </div>
        )}
      </DragOverlay>
      <Encerrar projetoId={encerrando} aoFechar={() => setEncerrando(null)} />
    </DndContext>
  )
}
