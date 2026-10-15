import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import type { Projeto } from '../types'

/* Ícones simples (traço) */
const caminhos: Record<string, ReactNode> = {
  galaxia: (
    <>
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-25 12 12)" />
    </>
  ),
  kanban: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="10" rx="1.5" />
      <rect x="17" y="4" width="4" height="13" rx="1.5" />
    </>
  ),
  sprint: (
    <>
      <path d="M4 20 L10 8 L14 14 L20 4" />
      <circle cx="20" cy="4" r="1.5" />
    </>
  ),
  painel: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  busca: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  mais: <path d="M12 5v14M5 12h14" />,
  fechar: <path d="M6 6l12 12M18 6L6 18" />,
  olho: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  cadeado: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  usuario: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  raio: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />,
  lixo: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  check: <path d="M5 12l5 5 9-10" />,
  sair: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  importar: <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />,
  comando: <path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z" />,
}

export function Icone({ nome, tam = 16 }: { nome: keyof typeof caminhos | string; tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {caminhos[nome]}
    </svg>
  )
}

export function Logo() {
  return (
    <svg className="marca-logo" viewBox="0 0 64 64" aria-hidden>
      <defs>
        <radialGradient id="lg" cx="40%" cy="35%">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".45" stopColor="#8b7bff" />
          <stop offset="1" stopColor="#3a2bb8" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="32" rx="29" ry="11" fill="none" stroke="#5ee7ff" strokeWidth="3" transform="rotate(-20 32 32)" />
      <circle cx="32" cy="32" r="14" fill="url(#lg)" />
    </svg>
  )
}

export function Modal({ aberto, aoFechar, children, estreito }: { aberto: boolean; aoFechar: () => void; children: ReactNode; estreito?: boolean }) {
  useEffect(() => {
    if (!aberto) return
    const f = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [aberto, aoFechar])
  return (
    <AnimatePresence>
      {aberto && (
        <>
          <motion.div className="vela" style={{ zIndex: 49 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={aoFechar} />
          <div className="modal-wrap" onClick={aoFechar}>
            <motion.div
              className={'modal' + (estreito ? ' estreito' : '')}
              role="dialog"
              aria-modal
              initial={{ opacity: 0, y: 24, scale: 0.97, rotateX: 8 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export function Interruptor({ ligado, aoMudar, rotulo, desabilitado }: { ligado: boolean; aoMudar: (v: boolean) => void; rotulo: string; desabilitado?: boolean }) {
  return (
    <button
      type="button"
      className={'interruptor btn fantasma pequeno' + (ligado ? ' on' : '')}
      onClick={() => !desabilitado && aoMudar(!ligado)}
      disabled={desabilitado}
      role="switch"
      aria-checked={ligado}
      style={{ paddingLeft: 0 }}
    >
      <span className="trilho" />
      {rotulo}
    </button>
  )
}

export function Prioridade({ p }: { p: 1 | 2 | 3 }) {
  const n = 4 - p
  return (
    <span className="prio" title={`Prioridade ${p === 1 ? 'alta' : p === 2 ? 'média' : 'baixa'}`}>
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= n ? 'on' : ''} />
      ))}
    </span>
  )
}

export function progresso(p: Projeto) {
  if (!p.tarefas.length) return 0
  return p.tarefas.filter((t) => t.feita).length / p.tarefas.length
}
