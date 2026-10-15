import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp, useProjetosVisiveis } from '../store'
import { statusInfo } from '../lib/constants'
import { Icone } from './ui'

interface Item {
  id: string
  grupo: string
  rotulo: string
  dica?: string
  icone: string
  acao: () => void
}

/** Paleta de comandos — Ctrl/⌘ + K */
export function Paleta() {
  const aberta = useApp((s) => s.paletaAberta)
  const abrir = useApp((s) => s.abrir)
  const st = useApp()
  const projetos = useProjetosVisiveis()
  const [q, setQ] = useState('')
  const [ativo, setAtivo] = useState(0)
  const lista = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        abrir('paleta', !useApp.getState().paletaAberta)
      }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [abrir])

  useEffect(() => {
    if (aberta) {
      setQ('')
      setAtivo(0)
    }
  }, [aberta])

  const itens = useMemo<Item[]>(() => {
    const fechar = () => abrir('paleta', false)
    const acoes: Item[] = [
      { id: 'v-g', grupo: 'Ir para', rotulo: 'Galáxia', icone: 'galaxia', acao: () => st.setVisao('galaxia') },
      { id: 'v-k', grupo: 'Ir para', rotulo: 'Kanban', icone: 'kanban', acao: () => st.setVisao('kanban') },
      { id: 'v-s', grupo: 'Ir para', rotulo: 'Sprints', icone: 'sprint', acao: () => st.setVisao('sprints') },
      { id: 'v-p', grupo: 'Ir para', rotulo: 'Painel', icone: 'painel', acao: () => st.setVisao('painel') },
      { id: 'a-leve', grupo: 'Ações', rotulo: st.modoLeve ? 'Desligar modo leve (3D completo)' : 'Ligar modo leve (sem efeitos 3D)', icone: 'raio', acao: st.alternarModoLeve },
    ]
    if (st.podeEditar) acoes.unshift({ id: 'a-nova', grupo: 'Ações', rotulo: 'Nova demanda', dica: 'N', icone: 'mais', acao: () => st.abrir('novaDemanda', true) })
    if (!st.usuario) acoes.push({ id: 'a-login', grupo: 'Ações', rotulo: 'Entrar como administrador', icone: 'usuario', acao: () => st.abrir('login', true) })
    const proj: Item[] = projetos.map((p) => ({
      id: p.id,
      grupo: 'Projetos',
      rotulo: p.titulo,
      dica: `${statusInfo(p.status).nome} · ${p.celula}`,
      icone: 'galaxia',
      acao: () => st.selecionar(p.id),
    }))
    const b = q.trim().toLowerCase()
    return [...acoes, ...proj]
      .filter((i) => !b || `${i.rotulo} ${i.dica ?? ''}`.toLowerCase().includes(b))
      .map((i) => ({
        ...i,
        acao: () => {
          fechar()
          i.acao()
        },
      }))
  }, [q, projetos, st, abrir])

  useEffect(() => {
    lista.current?.querySelector('.ativo')?.scrollIntoView({ block: 'nearest' })
  }, [ativo])

  let grupoAnterior = ''
  return (
    <AnimatePresence>
      {aberta && (
        <>
          <motion.div className="vela" style={{ zIndex: 59 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => abrir('paleta', false)} />
          <div className="paleta-wrap" onClick={() => abrir('paleta', false)}>
            <motion.div
              className="paleta"
              initial={{ opacity: 0, y: -14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                type="search"
                placeholder="Buscar projeto ou ação…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setAtivo(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setAtivo((a) => Math.min(a + 1, itens.length - 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setAtivo((a) => Math.max(a - 1, 0))
                  } else if (e.key === 'Enter') {
                    itens[ativo]?.acao()
                  } else if (e.key === 'Escape') {
                    abrir('paleta', false)
                  }
                }}
              />
              <ul ref={lista}>
                {itens.length === 0 && <li>Nada encontrado.</li>}
                {itens.map((i, idx) => {
                  const cab = i.grupo !== grupoAnterior ? i.grupo : null
                  grupoAnterior = i.grupo
                  return (
                    <div key={i.id}>
                      {cab && <div className="grupo">{cab}</div>}
                      <li className={idx === ativo ? 'ativo' : ''} onMouseEnter={() => setAtivo(idx)} onClick={i.acao}>
                        <Icone nome={i.icone} />
                        {i.rotulo}
                        {i.dica && <small>{i.dica}</small>}
                      </li>
                    </div>
                  )
                })}
              </ul>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
