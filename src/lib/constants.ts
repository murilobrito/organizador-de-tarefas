import type { BarreiraCategoria, Desfecho, Esforco, Prioridade, Status, Tipo } from '../types'

export const STATUS: { id: Status; nome: string; dica: string; cor: string }[] = [
  { id: 'entrada', nome: 'Entrada', dica: 'Chegou, ainda não avaliada', cor: '#9aa4c7' },
  { id: 'investigacao', nome: 'Investigação', dica: 'Estudando viabilidade', cor: '#5ee7ff' },
  { id: 'backlog', nome: 'Backlog', dica: 'Viável, aguardando vez', cor: '#8b7bff' },
  { id: 'foco', nome: 'Em foco', dica: 'Na sprint atual', cor: '#ffd36e' },
  { id: 'aguardando', nome: 'Aguardando', dica: 'Depende de terceiros', cor: '#ff9f6e' },
  { id: 'entregue', nome: 'Entregue', dica: 'Em uso, acompanhando', cor: '#5cf2a6' },
  { id: 'encerrado', nome: 'Encerrado', dica: 'Concluído, pesquisa ou barreira', cor: '#6b7394' },
]

export const statusInfo = (s: Status) => STATUS.find((x) => x.id === s)!

// Raio da órbita de cada status na galáxia (foco no centro)
export const ORBITA: Record<Status, number> = {
  foco: 3.2,
  investigacao: 5.6,
  backlog: 7.8,
  aguardando: 9.8,
  entrada: 11.8,
  entregue: 14,
  encerrado: 17,
}

export const DESFECHO: Record<Desfecho, { nome: string; icone: string }> = {
  concluido: { nome: 'Concluído', icone: '✓' },
  pesquisa: { nome: 'Só pesquisa', icone: '◇' },
  barreira: { nome: 'Barreira', icone: '⛔' },
}

export const BARREIRA: Record<BarreiraCategoria, string> = {
  tecnica: 'Técnica',
  custo: 'Custo',
  acesso: 'Falta de API / acesso',
  compliance: 'Compliance / LGPD',
  desistencia: 'Desistência do solicitante',
  prioridade: 'Prioridade da gestão',
}

export const TIPO: Record<Tipo, string> = {
  automacao: 'Automação',
  desenvolvimento: 'Desenvolvimento',
  pesquisa: 'Pesquisa',
  apoio: 'Apoio',
  treinamento: 'Treinamento',
}

export const PRIORIDADE: Record<Prioridade, string> = { 1: 'Alta', 2: 'Média', 3: 'Baixa' }
export const ESFORCO: Record<Esforco, string> = { P: 'Pequeno', M: 'Médio', G: 'Grande' }

// Paleta categórica para células (validada para fundo escuro, ordem fixa).
// Da 9ª célula em diante usa cinza neutro ("outras") — nunca recicla cores.
export const PALETA = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
export const COR_OUTRAS = '#7c829c'

export function corCelula(celula: string, todas: string[]): string {
  const i = todas.indexOf(celula)
  return i >= 0 && i < PALETA.length ? PALETA[i] : COR_OUTRAS
}

export const hoje = () => new Date().toISOString().slice(0, 10)
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function formatarData(iso?: string | null) {
  if (!iso) return '—'
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

export function diasEntre(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}
