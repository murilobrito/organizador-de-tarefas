export type Status =
  | 'entrada'
  | 'investigacao'
  | 'backlog'
  | 'foco'
  | 'aguardando'
  | 'entregue'
  | 'encerrado'

export type Desfecho = 'concluido' | 'pesquisa' | 'barreira'

export type BarreiraCategoria =
  | 'tecnica'
  | 'custo'
  | 'acesso'
  | 'compliance'
  | 'desistencia'
  | 'prioridade'

export type Tipo = 'automacao' | 'desenvolvimento' | 'pesquisa' | 'apoio' | 'treinamento'

export type Prioridade = 1 | 2 | 3 // 1 = alta, 3 = baixa
export type Esforco = 'P' | 'M' | 'G'

export interface Tarefa {
  id: string
  titulo: string
  feita: boolean
}

export interface EntradaDiario {
  id: string
  data: string // ISO
  texto: string
}

export interface Projeto {
  id: string
  titulo: string
  descricao: string
  solicitante: string
  celula: string
  tipo: Tipo
  status: Status
  prioridade: Prioridade
  esforco: Esforco
  entrada: string // YYYY-MM-DD
  prazo?: string
  sprintId?: string | null
  desfecho?: Desfecho | null
  barreira?: { categoria: BarreiraCategoria; descricao: string } | null
  tarefas: Tarefa[]
  diario: EntradaDiario[]
  publico: boolean
  criadoEm: string
  atualizadoEm: string
  encerradoEm?: string | null
}

export interface Sprint {
  id: string
  nome: string
  objetivo: string
  inicio: string
  fim: string
  encerrada: boolean
  retro?: { andou: string; travou: string; aprendi: string } | null
  publico: boolean
}
