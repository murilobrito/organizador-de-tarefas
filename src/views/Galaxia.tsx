import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useApp, useCorCelula, useProjetosFiltrados, useProjetosVisiveis, useSprintsVisiveis, useCelulas } from '../store'
import { ESFORCO, ORBITA, STATUS, statusInfo, formatarData } from '../lib/constants'
import type { Projeto, Status } from '../types'
import { progresso } from '../components/ui'

/** Posições atuais de cada planeta (atualizadas a cada frame) — usadas pela câmera */
const posicoes = new Map<string, THREE.Vector3>()
const CASA = new THREE.Vector3(0, 15, 25)
const CASA_RETRATO = new THREE.Vector3(0, 40, 12) // celular em pé: visão mais de cima
const TAMANHO = { P: 0.34, M: 0.5, G: 0.7 } as const

function hash(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h / 4294967295
}

/* ------------------------------- Núcleo ------------------------------- */
function Nucleo({ rotulo }: { rotulo: string }) {
  const ref = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ref.current) ref.current.rotation.y = t * 0.15
    if (halo.current) halo.current.scale.setScalar(1 + Math.sin(t * 1.4) * 0.05)
  })
  return (
    <group>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.05, 4]} />
        <meshBasicMaterial color="#ffe3a0" toneMapped={false} />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[1.55, 32, 32]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <pointLight intensity={2.4} distance={0} decay={0} color="#ffe2b0" />
      <Sparkles count={50} scale={7} size={2.2} speed={0.25} color="#ffd36e" opacity={0.7} />
      <Html position={[0, -1.9, 0]} center zIndexRange={[4, 0]}>
        <div className="rotulo-anel" style={{ color: '#ffd36e', textAlign: 'center' }}>
          {rotulo}
        </div>
      </Html>
    </group>
  )
}

/* ------------------------------- Anéis ------------------------------- */
function Anel({ status, quantidade }: { status: Status; quantidade: number }) {
  const r = ORBITA[status]
  const info = statusInfo(status)
  const a = Math.PI / 2 - 0.1 - r * 0.012
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[r - 0.012, r + 0.012, 160]} />
        <meshBasicMaterial color={info.cor} transparent opacity={status === 'encerrado' ? 0.18 : 0.38} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[r - 0.5, r + 0.5, 160]} />
        <meshBasicMaterial color={info.cor} transparent opacity={0.025} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {status !== 'foco' && (
        <Html position={[Math.cos(a) * r, 0.02, Math.sin(a) * r]} center zIndexRange={[3, 0]}>
          <div className="rotulo-anel" style={{ color: info.cor }}>
            {info.nome} · {quantidade}
          </div>
        </Html>
      )}
    </group>
  )
}

/* ------------------------------- Planeta ------------------------------- */
interface PlanetaProps {
  projeto: Projeto
  anguloInicial: number
  cor: string
  apagado: boolean
  animar: boolean
  privado: boolean
}

function Planeta({ projeto, anguloInicial, cor, apagado, animar, privado }: PlanetaProps) {
  const grupo = useRef<THREE.Group>(null)
  const esfera = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const [hover, setHover] = useState(false)
  const selecionar = useApp((s) => s.selecionar)
  const selecionado = useApp((s) => s.selecionado === projeto.id)
  const r = ORBITA[projeto.status]
  const encerrado = projeto.status === 'encerrado'
  const tam = TAMANHO[projeto.esforco] * (encerrado ? 0.7 : 1)
  const prog = progresso(projeto)
  const semente = useMemo(() => hash(projeto.id), [projeto.id])
  const angulo = useRef(anguloInicial)
  const vel = 0.55 / Math.pow(r, 1.25)

  useEffect(() => {
    angulo.current = anguloInicial
  }, [anguloInicial, projeto.status])

  useFrame(({ clock }, dt) => {
    if (!grupo.current) return
    if (animar) angulo.current += dt * vel
    const a = angulo.current
    const y = Math.sin(clock.getElapsedTime() * 0.6 + semente * 10) * 0.18
    grupo.current.position.set(Math.cos(a) * r, y, Math.sin(a) * r)
    const p = posicoes.get(projeto.id) ?? new THREE.Vector3()
    posicoes.set(projeto.id, p.copy(grupo.current.position))
    if (esfera.current) {
      esfera.current.rotation.y += dt * 0.4
      const alvo = hover || selecionado ? 1.35 : 1
      const s = THREE.MathUtils.lerp(esfera.current.scale.x, alvo, 1 - Math.exp(-dt * 10))
      esfera.current.scale.setScalar(s)
    }
    if (halo.current) {
      const t = clock.getElapsedTime()
      const k = (Math.sin(t * 2.6 + semente * 6) + 1) / 2
      halo.current.scale.setScalar(1.5 + k * 0.6)
      ;(halo.current.material as THREE.MeshBasicMaterial).opacity = (apagado ? 0.03 : 0.22) * (1 - k * 0.7)
    }
  })

  useEffect(() => () => void posicoes.delete(projeto.id), [projeto.id])

  const opacidade = apagado ? 0.12 : encerrado ? 0.55 : 1
  const st = statusInfo(projeto.status)

  return (
    <group ref={grupo}>
      <mesh
        ref={esfera}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHover(false)
          document.body.style.cursor = ''
        }}
        onClick={(e) => {
          e.stopPropagation()
          selecionar(projeto.id)
        }}
      >
        <sphereGeometry args={[tam, 40, 40]} />
        <meshStandardMaterial
          color={cor}
          emissive={cor}
          emissiveIntensity={encerrado ? 0.15 : selecionado ? 1.4 : 0.75}
          roughness={0.35}
          metalness={0.15}
          transparent={opacidade < 1}
          opacity={opacidade}
        />
      </mesh>

      {/* Trilha e arco de progresso das tarefas */}
      {!apagado && projeto.tarefas.length > 0 && (
        <group rotation-x={Math.PI / 2}>
          <mesh>
            <torusGeometry args={[tam * 1.65, 0.018, 8, 80]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.12} depthWrite={false} />
          </mesh>
          {prog > 0 && (
            <mesh rotation-z={Math.PI / 2}>
              <torusGeometry args={[tam * 1.65, 0.035, 8, 80, Math.PI * 2 * prog]} />
              <meshBasicMaterial color="#e9ebf8" toneMapped={false} />
            </mesh>
          )}
        </group>
      )}

      {/* Prioridade alta: halo pulsante */}
      {projeto.prioridade === 1 && !encerrado && (
        <mesh ref={halo} scale={1.6}>
          <sphereGeometry args={[tam, 24, 24]} />
          <meshBasicMaterial color="#ffd36e" transparent opacity={0.2} depthWrite={false} />
        </mesh>
      )}

      {/* Encerrado por barreira: anel vermelho inclinado */}
      {projeto.desfecho === 'barreira' && (
        <mesh rotation={[1.1, 0.3, 0]}>
          <torusGeometry args={[tam * 1.45, 0.03, 8, 60]} />
          <meshBasicMaterial color="#ff6b7a" transparent opacity={apagado ? 0.1 : 0.8} />
        </mesh>
      )}

      {(hover || selecionado) && (
        <Html position={[0, tam + 0.35, 0]} zIndexRange={[10, 0]}>
          <div className="tooltip-planeta">
            <strong>
              {privado ? '🔒 ' : ''}
              {projeto.titulo}
            </strong>
            <span>
              {st.nome} · {projeto.celula || 'Sem célula'} · {ESFORCO[projeto.esforco]}
              {projeto.tarefas.length > 0 && ` · ${Math.round(prog * 100)}%`}
            </span>
          </div>
        </Html>
      )}
    </group>
  )
}

/* ------------------------------- Câmera ------------------------------- */
function Rig({ controles }: { controles: React.RefObject<OrbitControlsImpl> }) {
  const { camera, size } = useThree()
  const casa = size.width < size.height ? CASA_RETRATO : CASA
  const selecionado = useApp((s) => s.selecionado)
  const inicio = useRef(performance.now())
  useEffect(() => {
    inicio.current = performance.now()
  }, [selecionado])

  useFrame((_, dt) => {
    const c = controles.current
    if (!c) return
    const k = 1 - Math.exp(-dt * 3)
    const t = (performance.now() - inicio.current) / 1000
    const pos = selecionado ? posicoes.get(selecionado) : undefined
    if (pos) {
      const delta = pos.clone().sub(c.target).multiplyScalar(k)
      c.target.add(delta)
      camera.position.add(delta)
      if (t < 1.6) {
        const dir = camera.position.clone().sub(c.target).normalize()
        camera.position.lerp(c.target.clone().add(dir.multiplyScalar(7.5)), k)
      }
      c.update()
    } else if (t < 2.2) {
      c.target.lerp(new THREE.Vector3(), k)
      camera.position.lerp(casa, k * 0.9)
      c.update()
    }
  })
  return null
}

/* ------------------------------- Cena ------------------------------- */
function Cena() {
  const projetos = useProjetosVisiveis()
  const filtrados = useProjetosFiltrados()
  const sprints = useSprintsVisiveis()
  const cor = useCorCelula()
  const modoLeve = useApp((s) => s.modoLeve)
  const selecionado = useApp((s) => s.selecionado)
  const usuarioAdmin = useApp((s) => s.podeEditar)
  const controles = useRef<OrbitControlsImpl>(null)
  const idsFiltrados = new Set(filtrados.map((p) => p.id))
  const ativa = sprints.find((s) => !s.encerrada)

  const porStatus = useMemo(() => {
    const m = new Map<Status, Projeto[]>()
    STATUS.forEach((s) => m.set(s.id, []))
    ;[...projetos].sort((a, b) => a.id.localeCompare(b.id)).forEach((p) => m.get(p.status)?.push(p))
    return m
  }, [projetos])

  return (
    <>
      <color attach="background" args={['#060814']} />
      <fog attach="fog" args={['#060814', 34, 80]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[10, 20, 10]} intensity={0.5} />
      <Stars radius={100} depth={50} count={modoLeve ? 1500 : 5000} factor={3.2} saturation={0.4} fade speed={0.6} />

      <Nucleo rotulo={ativa ? `◉ ${ativa.nome}` : 'Sem sprint ativa'} />

      {STATUS.map((s) => (
        <Anel key={s.id} status={s.id} quantidade={porStatus.get(s.id)!.length} />
      ))}

      {STATUS.flatMap((s) => {
        const lista = porStatus.get(s.id)!
        const desloc = hash(s.id) * Math.PI * 2
        return lista.map((p, i) => (
          <Planeta
            key={p.id}
            projeto={p}
            anguloInicial={desloc + (i / Math.max(lista.length, 1)) * Math.PI * 2}
            cor={cor(p.celula)}
            apagado={!idsFiltrados.has(p.id)}
            animar={!modoLeve}
            privado={usuarioAdmin && !p.publico}
          />
        ))
      })}

      <OrbitControls
        ref={controles}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={60}
        maxPolarAngle={Math.PI * 0.82}
        autoRotate={!selecionado && !modoLeve}
        autoRotateSpeed={0.22}
        enablePan={false}
      />
      <Rig controles={controles} />

      {!modoLeve && (
        <EffectComposer>
          <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.2} luminanceSmoothing={0.35} />
          <Vignette eskil={false} offset={0.25} darkness={0.75} />
        </EffectComposer>
      )}
    </>
  )
}

/* ------------------------------- Overlay ------------------------------- */
function Legenda() {
  const celulas = useCelulas()
  const cor = useCorCelula()
  const filtro = useApp((s) => s.filtros.celula)
  const setFiltros = useApp((s) => s.setFiltros)
  return (
    <div className="overlay-galaxia legenda vidro">
      <h4>Células</h4>
      <ul>
        {celulas.map((c) => (
          <li key={c} className={filtro && filtro !== c ? 'apagado' : ''}>
            <button onClick={() => setFiltros({ celula: filtro === c ? '' : c })} title="Filtrar por esta célula">
              <span className="ponto" style={{ background: cor(c), color: cor(c) }} />
              {c}
            </button>
          </li>
        ))}
      </ul>
      <h4>Leitura</h4>
      <ul>
        <li>Anel = status · tamanho = esforço</li>
        <li>Arco branco = % de tarefas feitas</li>
        <li>
          <span className="ponto" style={{ background: '#ffd36e', color: '#ffd36e' }} /> Halo = prioridade alta
        </li>
        <li>
          <span className="ponto" style={{ background: 'transparent', border: '2px solid #ff6b7a', boxShadow: 'none' }} /> Anel vermelho = barreira
        </li>
      </ul>
    </div>
  )
}

function FocoAgora() {
  const projetos = useProjetosVisiveis()
  const sprints = useSprintsVisiveis()
  const selecionar = useApp((s) => s.selecionar)
  const setVisao = useApp((s) => s.setVisao)
  const cor = useCorCelula()
  const ativa = sprints.find((s) => !s.encerrada)
  const foco = projetos.filter((p) => p.status === 'foco')
  return (
    <div className="overlay-galaxia foco-agora vidro">
      <h3>Em foco agora</h3>
      <div className="sub">
        {ativa ? (
          <>
            {ativa.nome} · até {formatarData(ativa.fim)}
          </>
        ) : (
          'Nenhuma sprint ativa'
        )}
      </div>
      {foco.length === 0 && <div className="sub">Nenhum projeto em foco.</div>}
      {foco.map((p) => (
        <button key={p.id} className="item-foco" onClick={() => selecionar(p.id)}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
            <span className="ponto" style={{ width: 8, height: 8, borderRadius: '50%', background: cor(p.celula), flex: 'none' }} />
            {p.titulo}
          </div>
          <div className="progresso">
            <div style={{ width: `${progresso(p) * 100}%` }} />
          </div>
        </button>
      ))}
      {ativa?.objetivo && <p style={{ fontSize: 12.5, color: 'var(--texto-2)', margin: '10px 0 8px' }}>🎯 {ativa.objetivo}</p>}
      <button className="btn pequeno" onClick={() => setVisao('sprints')}>
        Ver sprints →
      </button>
    </div>
  )
}

class LimiteErro extends Component<{ children: ReactNode }, { erro: boolean }> {
  state = { erro: false }
  static getDerivedStateFromError() {
    return { erro: true }
  }
  render() {
    if (this.state.erro)
      return (
        <div className="carregando">
          <div className="vidro erro-box">
            <h3>Não foi possível iniciar o 3D</h3>
            <p style={{ color: 'var(--texto-3)' }}>Seu navegador ou placa de vídeo não suportou WebGL. Use o Kanban, Sprints ou Painel normalmente.</p>
          </div>
        </div>
      )
    return this.props.children
  }
}

export default function Galaxia() {
  const modoLeve = useApp((s) => s.modoLeve)
  return (
    <div className="galaxia">
      <LimiteErro>
        <Canvas
          camera={{ position: [0, 38, 62], fov: 50, near: 0.1, far: 300 }}
          dpr={modoLeve ? 1 : [1, 1.75]}
          gl={{ antialias: !modoLeve, powerPreference: 'high-performance' }}
          onPointerMissed={() => (document.body.style.cursor = '')}
        >
          <Suspense fallback={null}>
            <Cena />
          </Suspense>
        </Canvas>
      </LimiteErro>
      <Legenda />
      <FocoAgora />
      <div className="overlay-galaxia dica-galaxia">Arraste para girar · role para aproximar · clique num planeta para abrir</div>
    </div>
  )
}
