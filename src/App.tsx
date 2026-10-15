import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp, useCelulas, type Visao } from './store'
import { TIPO } from './lib/constants'
import { Icone, Logo } from './components/ui'
import { Detalhe } from './components/Detalhe'
import { NovaDemanda } from './components/NovaDemanda'
import { Login } from './components/Login'
import { Paleta } from './components/Paleta'
import Kanban from './views/Kanban'
import Sprints from './views/Sprints'
import Painel from './views/Painel'

// O 3D é carregado sob demanda para o resto do site abrir rápido
const Galaxia = lazy(() => import('./views/Galaxia'))

const ABAS: { id: Visao; nome: string; icone: string }[] = [
  { id: 'galaxia', nome: 'Galáxia', icone: 'galaxia' },
  { id: 'kanban', nome: 'Kanban', icone: 'kanban' },
  { id: 'sprints', nome: 'Sprints', icone: 'sprint' },
  { id: 'painel', nome: 'Painel', icone: 'painel' },
]

function MenuAdmin() {
  const [aberto, setAberto] = useState(false)
  const usuario = useApp((s) => s.usuario)
  const sair = useApp((s) => s.sair)
  const importar = useApp((s) => s.importarExemplo)
  const projetos = useApp((s) => s.projetos)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const f = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setAberto(false)
    document.addEventListener('mousedown', f)
    return () => document.removeEventListener('mousedown', f)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn icone" onClick={() => setAberto(!aberto)} aria-label="Menu do administrador">
        <Icone nome="usuario" />
      </button>
      <AnimatePresence>
        {aberto && (
          <motion.div className="menu vidro" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }}>
            <div className="email">{usuario?.email}</div>
            <hr />
            <button
              onClick={() => {
                setAberto(false)
                if (projetos.length === 0 || confirm('Isso vai sobrescrever os projetos de exemplo com os mesmos IDs. Continuar?')) importar()
              }}
            >
              <Icone nome="importar" /> Importar dados de exemplo
            </button>
            <button
              onClick={() => {
                setAberto(false)
                sair()
              }}
            >
              <Icone nome="sair" /> Sair
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  const iniciar = useApp((s) => s.iniciar)
  const visao = useApp((s) => s.visao)
  const setVisao = useApp((s) => s.setVisao)
  const carregando = useApp((s) => s.carregando)
  const erro = useApp((s) => s.erro)
  const usuario = useApp((s) => s.usuario)
  const podeEditar = useApp((s) => s.podeEditar)
  const verComoVisitante = useApp((s) => s.verComoVisitante)
  const alternarVisitante = useApp((s) => s.alternarVerComoVisitante)
  const modo = useApp((s) => s.repo?.modo)
  const modoLeve = useApp((s) => s.modoLeve)
  const alternarModoLeve = useApp((s) => s.alternarModoLeve)
  const abrir = useApp((s) => s.abrir)
  const filtros = useApp((s) => s.filtros)
  const setFiltros = useApp((s) => s.setFiltros)
  const toast = useApp((s) => s.toast)
  const celulas = useCelulas()
  const ehAdmin = !!usuario && (podeEditar || verComoVisitante)

  useEffect(() => {
    iniciar()
  }, [iniciar])

  // Atalho "N" = nova demanda
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement
      if (alvo.closest('input, textarea, select, [contenteditable]')) return
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && useApp.getState().podeEditar) {
        e.preventDefault()
        abrir('novaDemanda', true)
      }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [abrir])

  return (
    <>
      <div className="fundo" />
      <div className="app">
        <header className="topo">
          <div className="marca">
            <Logo />
            <div>
              <h1>Órbita</h1>
              <small>Demandas de Inovação</small>
            </div>
          </div>

          <nav className="abas">
            {ABAS.map((a) => (
              <button key={a.id} className={'aba' + (visao === a.id ? ' ativa' : '')} onClick={() => setVisao(a.id)} aria-current={visao === a.id}>
                <Icone nome={a.icone} />
                <span className="txt">{a.nome}</span>
              </button>
            ))}
          </nav>

          <div className="filtros">
            <div className="busca">
              <Icone nome="busca" tam={15} />
              <input type="search" placeholder="Buscar…" value={filtros.busca} onChange={(e) => setFiltros({ busca: e.target.value })} />
            </div>
            <select value={filtros.celula} onChange={(e) => setFiltros({ celula: e.target.value })} aria-label="Filtrar por célula">
              <option value="">Todas as células</option>
              {celulas.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select value={filtros.tipo} onChange={(e) => setFiltros({ tipo: e.target.value })} aria-label="Filtrar por tipo">
              <option value="">Todos os tipos</option>
              {Object.entries(TIPO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="acoes-topo">
            <button className="btn fantasma pequeno so-desktop" onClick={() => abrir('paleta', true)} title="Paleta de comandos">
              <kbd>Ctrl</kbd>
              <kbd>K</kbd>
            </button>
            <button className={'btn icone' + (modoLeve ? ' ligado' : '')} onClick={alternarModoLeve} title={modoLeve ? 'Modo leve ligado (3D simplificado)' : 'Ligar modo leve (para PCs mais lentos)'}>
              <Icone nome="raio" />
            </button>
            {ehAdmin ? (
              <>
                <button className={'btn pequeno so-desktop' + (verComoVisitante ? ' ligado' : '')} onClick={alternarVisitante} title="Pré-visualizar o que visitantes veem">
                  <Icone nome="olho" tam={14} /> <span className="txt-largo">{verComoVisitante ? 'Vendo como visitante' : 'Ver como visitante'}</span>
                </button>
                {podeEditar && (
                  <button className="btn primario" onClick={() => abrir('novaDemanda', true)} title="Nova demanda (N)">
                    <Icone nome="mais" tam={15} /> <span className="so-desktop">Nova demanda</span>
                  </button>
                )}
                <MenuAdmin />
              </>
            ) : (
              <>
                <span className="selo visitante so-desktop">
                  <Icone nome="olho" tam={13} /> Somente leitura
                </span>
                <button className="btn pequeno" onClick={() => abrir('login', true)}>
                  <Icone nome="cadeado" tam={13} /> Entrar
                </button>
              </>
            )}
          </div>
        </header>

        {modo === 'demo' && <div className="faixa-demo">Modo demonstração — os dados ficam só neste navegador. Configure o Firebase (veja o LEIAME) para publicar para visitantes.</div>}

        <main className="conteudo">
          {erro ? (
            <div className="vidro erro-box">
              <h3>Não foi possível carregar os dados</h3>
              <p style={{ color: 'var(--texto-3)' }}>{erro}</p>
            </div>
          ) : carregando ? (
            <div className="carregando">
              <div>
                <div className="orbe-carregando" />
                Carregando órbita…
              </div>
            </div>
          ) : (
            <>
              {visao === 'galaxia' && (
                <Suspense
                  fallback={
                    <div className="carregando">
                      <div>
                        <div className="orbe-carregando" />
                        Iniciando galáxia…
                      </div>
                    </div>
                  }
                >
                  <Galaxia />
                </Suspense>
              )}
              {visao === 'kanban' && <Kanban />}
              {visao === 'sprints' && <Sprints />}
              {visao === 'painel' && <Painel />}
            </>
          )}
        </main>
      </div>

      <Detalhe />
      <NovaDemanda />
      <Login />
      <Paleta />
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} className="toast" initial={{ opacity: 0, y: 16, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 10, x: '-50%' }}>
            {toast.texto}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
