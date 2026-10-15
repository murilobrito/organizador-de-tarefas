import { create } from 'zustand'
import type { Projeto, Sprint, Status } from './types'
import { ADMIN_EMAIL, obterRepo, type Repo, type Usuario } from './data/repo'
import { corCelula, hoje, uid } from './lib/constants'

export type Visao = 'galaxia' | 'kanban' | 'sprints' | 'painel'

interface Filtros {
  busca: string
  celula: string
  tipo: string
}

interface Estado {
  repo: Repo | null
  carregando: boolean
  erro: string | null
  usuario: Usuario | null
  /** Admin logado E não está no modo "ver como visitante" */
  podeEditar: boolean
  verComoVisitante: boolean
  projetos: Projeto[]
  sprints: Sprint[]
  visao: Visao
  selecionado: string | null
  novaDemandaAberta: boolean
  loginAberto: boolean
  paletaAberta: boolean
  modoLeve: boolean
  filtros: Filtros
  toast: { id: number; texto: string } | null

  iniciar(): Promise<void>
  setVisao(v: Visao): void
  selecionar(id: string | null): void
  setFiltros(f: Partial<Filtros>): void
  abrir(qual: 'novaDemanda' | 'login' | 'paleta', valor: boolean): void
  alternarModoLeve(): void
  alternarVerComoVisitante(): void
  avisar(texto: string): void

  entrar(email: string, senha: string): Promise<void>
  sair(): Promise<void>

  salvarProjeto(p: Projeto): Promise<void>
  atualizarProjeto(id: string, mudancas: Partial<Projeto>): Promise<void>
  moverProjeto(id: string, status: Status): Promise<void>
  removerProjeto(id: string): Promise<void>
  salvarSprint(s: Sprint): Promise<void>
  removerSprint(id: string): Promise<void>
  importarExemplo(): Promise<void>
}

let pararObservacao: (() => void) | null = null

const lerPref = (k: string, padrao: boolean) => {
  try {
    const v = localStorage.getItem(k)
    return v === null ? padrao : v === '1'
  } catch {
    return padrao
  }
}
const gravarPref = (k: string, v: boolean) => {
  try {
    localStorage.setItem(k, v ? '1' : '0')
  } catch {
    /* ignora */
  }
}

export const useApp = create<Estado>((set, get) => {
  const ehAdmin = (u: Usuario | null) => !!u && u.email.toLowerCase() === ADMIN_EMAIL

  const reobservar = () => {
    const { repo, usuario } = get()
    if (!repo) return
    pararObservacao?.()
    pararObservacao = repo.observar(
      ehAdmin(usuario),
      (projetos, sprints) => set({ projetos, sprints, carregando: false, erro: null }),
      (e) => set({ erro: e.message, carregando: false }),
    )
  }

  const recalcular = () => {
    const { usuario, verComoVisitante } = get()
    set({ podeEditar: ehAdmin(usuario) && !verComoVisitante })
  }

  const exigirEdicao = () => {
    if (!get().podeEditar) throw new Error('Somente o administrador pode editar.')
    return get().repo!
  }

  const comAviso = async (fn: () => Promise<void>, ok?: string) => {
    try {
      await fn()
      if (ok) get().avisar(ok)
    } catch (e) {
      get().avisar('Erro: ' + (e as Error).message)
    }
  }

  return {
    repo: null,
    carregando: true,
    erro: null,
    usuario: null,
    podeEditar: false,
    verComoVisitante: false,
    projetos: [],
    sprints: [],
    visao: 'galaxia',
    selecionado: null,
    novaDemandaAberta: false,
    loginAberto: false,
    paletaAberta: false,
    modoLeve: lerPref('orbita-modo-leve', false),
    filtros: { busca: '', celula: '', tipo: '' },
    toast: null,

    async iniciar() {
      try {
        const repo = await obterRepo()
        set({ repo })
        let primeiro = true
        repo.observarUsuario((u) => {
          const mudouPapel = primeiro || ehAdmin(u) !== ehAdmin(get().usuario)
          primeiro = false
          set({ usuario: u })
          recalcular()
          if (mudouPapel) reobservar()
        })
      } catch (e) {
        set({ erro: (e as Error).message, carregando: false })
      }
    },

    setVisao: (visao) => set({ visao }),
    selecionar: (selecionado) => set({ selecionado }),
    setFiltros: (f) => set({ filtros: { ...get().filtros, ...f } }),
    abrir(qual, valor) {
      if (qual === 'novaDemanda') set({ novaDemandaAberta: valor })
      if (qual === 'login') set({ loginAberto: valor })
      if (qual === 'paleta') set({ paletaAberta: valor })
    },
    alternarModoLeve() {
      const v = !get().modoLeve
      gravarPref('orbita-modo-leve', v)
      set({ modoLeve: v })
    },
    alternarVerComoVisitante() {
      set({ verComoVisitante: !get().verComoVisitante })
      recalcular()
    },
    avisar(texto) {
      const id = Date.now()
      set({ toast: { id, texto } })
      setTimeout(() => get().toast?.id === id && set({ toast: null }), 3200)
    },

    async entrar(email, senha) {
      await get().repo!.entrar(email.trim(), senha)
      set({ loginAberto: false })
      get().avisar('Bem-vindo de volta!')
    },
    async sair() {
      await get().repo!.sair()
      set({ verComoVisitante: false })
      recalcular()
      get().avisar('Você saiu do modo administrador.')
    },

    async salvarProjeto(p) {
      await comAviso(() => exigirEdicao().salvarProjeto({ ...p, atualizadoEm: new Date().toISOString() }))
    },
    async atualizarProjeto(id, mudancas) {
      const atual = get().projetos.find((p) => p.id === id)
      if (!atual) return
      const novo: Projeto = { ...atual, ...mudancas, atualizadoEm: new Date().toISOString() }
      if (mudancas.status && mudancas.status !== atual.status) {
        novo.encerradoEm = mudancas.status === 'encerrado' ? hoje() : null
        if (mudancas.status !== 'encerrado') {
          novo.desfecho = null
        } else if (!novo.desfecho) {
          novo.desfecho = 'concluido'
        }
      }
      // Atualização otimista
      set({ projetos: get().projetos.map((p) => (p.id === id ? novo : p)) })
      await comAviso(() => exigirEdicao().salvarProjeto(novo))
    },
    async moverProjeto(id, status) {
      await get().atualizarProjeto(id, { status })
    },
    async removerProjeto(id) {
      set({ selecionado: null })
      await comAviso(() => exigirEdicao().removerProjeto(id), 'Projeto removido.')
    },
    async salvarSprint(s) {
      await comAviso(() => exigirEdicao().salvarSprint(s), 'Sprint salva.')
    },
    async removerSprint(id) {
      await comAviso(() => exigirEdicao().removerSprint(id), 'Sprint removida.')
    },
    async importarExemplo() {
      await comAviso(() => exigirEdicao().importarExemplo(), 'Dados de exemplo importados.')
    },
  }
})

export function novoProjeto(parcial: Partial<Projeto>): Projeto {
  const agora = new Date().toISOString()
  return {
    id: uid(),
    titulo: '',
    descricao: '',
    solicitante: '',
    celula: '',
    tipo: 'automacao',
    status: 'entrada',
    prioridade: 2,
    esforco: 'M',
    entrada: hoje(),
    sprintId: null,
    desfecho: null,
    barreira: null,
    tarefas: [],
    diario: [],
    publico: true,
    criadoEm: agora,
    atualizadoEm: agora,
    encerradoEm: null,
    ...parcial,
  }
}

/** Projetos filtrados conforme busca/célula/tipo */
/** Projetos visíveis (no "ver como visitante", esconde os privados) */
export function useProjetosVisiveis() {
  const projetos = useApp((s) => s.projetos)
  const preview = useApp((s) => s.verComoVisitante)
  return preview ? projetos.filter((p) => p.publico) : projetos
}

export function useSprintsVisiveis() {
  const sprints = useApp((s) => s.sprints)
  const preview = useApp((s) => s.verComoVisitante)
  return preview ? sprints.filter((x) => x.publico) : sprints
}

export function useProjetosFiltrados() {
  const projetos = useProjetosVisiveis()
  const { busca, celula, tipo } = useApp((s) => s.filtros)
  const b = busca.trim().toLowerCase()
  return projetos.filter(
    (p) =>
      (!celula || p.celula === celula) &&
      (!tipo || p.tipo === tipo) &&
      (!b || `${p.titulo} ${p.descricao} ${p.solicitante} ${p.celula}`.toLowerCase().includes(b)),
  )
}

export function useCelulas() {
  const projetos = useProjetosVisiveis()
  return Array.from(new Set(projetos.map((p) => p.celula).filter(Boolean))).sort()
}

/** Cor estável por célula (baseada em todas as células carregadas, em ordem alfabética) */
export function useCorCelula() {
  const projetos = useApp((s) => s.projetos)
  const todas = Array.from(new Set(projetos.map((p) => p.celula).filter(Boolean))).sort()
  return (celula: string) => corCelula(celula, todas)
}
