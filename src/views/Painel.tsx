import { useApp, useProjetosFiltrados } from '../store'
import { BARREIRA, DESFECHO, STATUS, TIPO, diasEntre, formatarData, hoje, statusInfo } from '../lib/constants'

function Barras({ dados, unidade = 'projetos' }: { dados: { nome: string; valor: number }[]; unidade?: string }) {
  const max = Math.max(1, ...dados.map((d) => d.valor))
  if (!dados.length) return <p style={{ color: 'var(--texto-3)', margin: 0 }}>Sem dados.</p>
  return (
    <div className="barras" role="table">
      {dados.map((d) => (
        <div key={d.nome} className="barra-linha" role="row">
          <span className="nome" role="cell" title={d.nome}>
            {d.nome}
          </span>
          <span className="trilho" role="cell">
            <div style={{ width: `${(d.valor / max) * 100}%` }} />
          </span>
          <span className="num" role="cell">
            {d.valor}
          </span>
          <span className="dica">
            {d.nome}: {d.valor} {d.valor === 1 ? unidade.replace(/s$/, '') : unidade}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Painel() {
  const projetos = useProjetosFiltrados()
  const selecionar = useApp((s) => s.selecionar)

  const abertos = projetos.filter((p) => p.status !== 'encerrado' && p.status !== 'entregue')
  const encerrados = projetos.filter((p) => p.status === 'encerrado')
  const finalizados = projetos.filter((p) => p.status === 'entregue' || (p.status === 'encerrado' && p.desfecho !== 'barreira'))
  const barreiras = encerrados.filter((p) => p.desfecho === 'barreira')
  const comCiclo = encerrados.filter((p) => p.encerradoEm)
  const ciclo = comCiclo.length ? Math.round(comCiclo.reduce((s, p) => s + diasEntre(p.entrada, p.encerradoEm!), 0) / comCiclo.length) : null

  const contar = <K extends string>(chaves: K[], f: (k: K) => number, nome: (k: K) => string) =>
    chaves.map((k) => ({ nome: nome(k), valor: f(k) })).filter((d) => d.valor > 0)

  const porStatus = STATUS.map((s) => ({ nome: s.nome, valor: projetos.filter((p) => p.status === s.id).length }))
  const celulas = Array.from(new Set(abertos.map((p) => p.celula || 'Sem célula')))
  const porCelula = celulas.map((c) => ({ nome: c, valor: abertos.filter((p) => (p.celula || 'Sem célula') === c).length })).sort((a, b) => b.valor - a.valor)
  const porTipo = contar(Object.keys(TIPO) as (keyof typeof TIPO)[], (k) => projetos.filter((p) => p.tipo === k).length, (k) => TIPO[k])
  const porDesfecho = contar(Object.keys(DESFECHO) as (keyof typeof DESFECHO)[], (k) => encerrados.filter((p) => p.desfecho === k).length, (k) => DESFECHO[k].nome)
  const porBarreira = contar(Object.keys(BARREIRA) as (keyof typeof BARREIRA)[], (k) => barreiras.filter((p) => p.barreira?.categoria === k).length, (k) => BARREIRA[k])
  const antigos = [...abertos].sort((a, b) => a.entrada.localeCompare(b.entrada)).slice(0, 6)

  return (
    <div className="rolavel">
      <div className="painel">
        <div className="cab-pagina">
          <div>
            <h2>Painel</h2>
            <p>Visão geral das demandas (respeita os filtros do topo).</p>
          </div>
        </div>

        <div className="kpis">
          <div className="vidro kpi">
            <div className="rot">Em aberto</div>
            <div className="val">{abertos.length}</div>
            <div className="det">entrada → aguardando</div>
          </div>
          <div className="vidro kpi">
            <div className="rot">Em foco</div>
            <div className="val" style={{ color: '#ffd36e' }}>
              {projetos.filter((p) => p.status === 'foco').length}
            </div>
            <div className="det">na sprint atual</div>
          </div>
          <div className="vidro kpi">
            <div className="rot">Entregues / concluídos</div>
            <div className="val">{finalizados.length}</div>
            <div className="det">inclui pesquisas finalizadas</div>
          </div>
          <div className="vidro kpi">
            <div className="rot">Encerrados por barreira</div>
            <div className="val">{barreiras.length}</div>
            <div className="det">{encerrados.length ? `${Math.round((barreiras.length / encerrados.length) * 100)}% dos encerrados` : 'nenhum encerrado'}</div>
          </div>
          <div className="vidro kpi">
            <div className="rot">Ciclo médio</div>
            <div className="val">{ciclo === null ? '—' : `${ciclo}d`}</div>
            <div className="det">da entrada ao encerramento</div>
          </div>
        </div>

        <div className="graficos">
          <section className="vidro grafico">
            <h3>Projetos por status</h3>
            <p className="sub">Onde está o volume de trabalho</p>
            <Barras dados={porStatus} />
          </section>
          <section className="vidro grafico">
            <h3>Demandas abertas por célula</h3>
            <p className="sub">Quem mais demanda neste momento</p>
            <Barras dados={porCelula} unidade="demandas" />
          </section>
          <section className="vidro grafico">
            <h3>Por tipo</h3>
            <p className="sub">Natureza das demandas</p>
            <Barras dados={porTipo} />
          </section>
          <section className="vidro grafico">
            <h3>Como as demandas terminam</h3>
            <p className="sub">Desfecho dos encerrados{porBarreira.length ? ' · barreiras por tipo abaixo' : ''}</p>
            <Barras dados={porDesfecho} />
            {porBarreira.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Barras dados={porBarreira} />
              </div>
            )}
          </section>
          <section className="vidro grafico" style={{ gridColumn: '1 / -1' }}>
            <h3>Abertas há mais tempo</h3>
            <p className="sub">Candidatas a decisão: priorizar, pesquisar ou encerrar</p>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th>Célula</th>
                  <th>Status</th>
                  <th>Entrada</th>
                  <th className="n">Dias</th>
                </tr>
              </thead>
              <tbody>
                {antigos.map((p) => (
                  <tr key={p.id} onClick={() => selecionar(p.id)}>
                    <td>{p.titulo}</td>
                    <td>{p.celula}</td>
                    <td>{statusInfo(p.status).nome}</td>
                    <td>{formatarData(p.entrada)}</td>
                    <td className="n">{diasEntre(p.entrada, hoje())}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  )
}
