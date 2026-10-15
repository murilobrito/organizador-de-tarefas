/**
 * Camada de dados.
 *  - Com as variáveis VITE_FIREBASE_* preenchidas → usa Firestore + Firebase Auth.
 *  - Sem elas → MODO DEMONSTRAÇÃO: dados no localStorage deste navegador.
 * O resto do app só conhece a interface `Repo`, então trocar de back-end no futuro
 * (ex.: SharePoint) é só escrever outra implementação.
 */
import type { Projeto, Sprint } from '../types'
import { PROJETOS_EXEMPLO, SPRINTS_EXEMPLO } from './seed'

export interface Usuario {
  email: string
}

export interface Repo {
  modo: 'firebase' | 'demo'
  observar(admin: boolean, cb: (p: Projeto[], s: Sprint[]) => void, erro: (e: Error) => void): () => void
  salvarProjeto(p: Projeto): Promise<void>
  removerProjeto(id: string): Promise<void>
  salvarSprint(s: Sprint): Promise<void>
  removerSprint(id: string): Promise<void>
  importarExemplo(): Promise<void>
  observarUsuario(cb: (u: Usuario | null) => void): () => void
  entrar(email: string, senha: string): Promise<void>
  sair(): Promise<void>
}

const env = import.meta.env
export const ADMIN_EMAIL = (env.VITE_ADMIN_EMAIL || 'murilo.brito@chebabi.com').toLowerCase()
const temFirebase = Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID)

/* ----------------------------- Modo demonstração ----------------------------- */

function criarRepoDemo(): Repo {
  const CHAVE = 'orbita-demo-v1'
  const CHAVE_USER = 'orbita-demo-user'
  type Estado = { projetos: Projeto[]; sprints: Sprint[] }
  const ouvintes = new Set<() => void>()
  const ouvintesUser = new Set<(u: Usuario | null) => void>()

  const ler = (): Estado => {
    try {
      const raw = localStorage.getItem(CHAVE)
      if (raw) return JSON.parse(raw)
    } catch {
      /* ignora */
    }
    return { projetos: PROJETOS_EXEMPLO, sprints: SPRINTS_EXEMPLO }
  }
  let estado = ler()
  const gravar = () => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado))
    } catch {
      /* ignora */
    }
    ouvintes.forEach((f) => f())
  }
  let usuario: Usuario | null = null
  try {
    const u = localStorage.getItem(CHAVE_USER)
    usuario = u ? JSON.parse(u) : null
  } catch {
    usuario = null
  }
  const setUser = (u: Usuario | null) => {
    usuario = u
    try {
      if (u) localStorage.setItem(CHAVE_USER, JSON.stringify(u))
      else localStorage.removeItem(CHAVE_USER)
    } catch {
      /* ignora */
    }
    ouvintesUser.forEach((f) => f(u))
  }

  return {
    modo: 'demo',
    observar(admin, cb) {
      const emitir = () =>
        cb(
          admin ? estado.projetos : estado.projetos.filter((p) => p.publico),
          admin ? estado.sprints : estado.sprints.filter((s) => s.publico),
        )
      ouvintes.add(emitir)
      emitir()
      return () => ouvintes.delete(emitir)
    },
    async salvarProjeto(p) {
      const i = estado.projetos.findIndex((x) => x.id === p.id)
      estado = { ...estado, projetos: i >= 0 ? estado.projetos.map((x) => (x.id === p.id ? p : x)) : [...estado.projetos, p] }
      gravar()
    },
    async removerProjeto(id) {
      estado = { ...estado, projetos: estado.projetos.filter((x) => x.id !== id) }
      gravar()
    },
    async salvarSprint(s) {
      const i = estado.sprints.findIndex((x) => x.id === s.id)
      estado = { ...estado, sprints: i >= 0 ? estado.sprints.map((x) => (x.id === s.id ? s : x)) : [...estado.sprints, s] }
      gravar()
    },
    async removerSprint(id) {
      estado = {
        projetos: estado.projetos.map((p) => (p.sprintId === id ? { ...p, sprintId: null } : p)),
        sprints: estado.sprints.filter((x) => x.id !== id),
      }
      gravar()
    },
    async importarExemplo() {
      estado = { projetos: PROJETOS_EXEMPLO, sprints: SPRINTS_EXEMPLO }
      gravar()
    },
    observarUsuario(cb) {
      ouvintesUser.add(cb)
      cb(usuario)
      return () => ouvintesUser.delete(cb)
    },
    async entrar(email) {
      setUser({ email: email || ADMIN_EMAIL })
    },
    async sair() {
      setUser(null)
    },
  }
}

/* --------------------------------- Firebase --------------------------------- */

async function criarRepoFirebase(): Promise<Repo> {
  const { initializeApp } = await import('firebase/app')
  const auth = await import('firebase/auth')
  const fs = await import('firebase/firestore')

  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  })
  const a = auth.getAuth(app)
  await auth.setPersistence(a, auth.browserLocalPersistence)
  const db = fs.initializeFirestore(app, { ignoreUndefinedProperties: true })

  const colProj = fs.collection(db, 'projetos')
  const colSpr = fs.collection(db, 'sprints')

  return {
    modo: 'firebase',
    observar(admin, cb, erro) {
      let projetos: Projeto[] = []
      let sprints: Sprint[] = []
      let prontoP = false
      let prontoS = false
      const emitir = () => prontoP && prontoS && cb(projetos, sprints)
      // Visitantes só podem consultar documentos públicos (as regras do Firestore exigem o filtro)
      const qP = admin ? colProj : fs.query(colProj, fs.where('publico', '==', true))
      const qS = admin ? colSpr : fs.query(colSpr, fs.where('publico', '==', true))
      const u1 = fs.onSnapshot(
        qP,
        (snap) => {
          projetos = snap.docs.map((d) => ({ ...(d.data() as Projeto), id: d.id }))
          prontoP = true
          emitir()
        },
        erro,
      )
      const u2 = fs.onSnapshot(
        qS,
        (snap) => {
          sprints = snap.docs.map((d) => ({ ...(d.data() as Sprint), id: d.id }))
          prontoS = true
          emitir()
        },
        erro,
      )
      return () => {
        u1()
        u2()
      }
    },
    async salvarProjeto(p) {
      await fs.setDoc(fs.doc(colProj, p.id), p)
    },
    async removerProjeto(id) {
      await fs.deleteDoc(fs.doc(colProj, id))
    },
    async salvarSprint(s) {
      await fs.setDoc(fs.doc(colSpr, s.id), s)
    },
    async removerSprint(id) {
      const lote = fs.writeBatch(db)
      const ligados = await fs.getDocs(fs.query(colProj, fs.where('sprintId', '==', id)))
      ligados.forEach((d) => lote.update(d.ref, { sprintId: null }))
      lote.delete(fs.doc(colSpr, id))
      await lote.commit()
    },
    async importarExemplo() {
      const lote = fs.writeBatch(db)
      PROJETOS_EXEMPLO.forEach((p) => lote.set(fs.doc(colProj, p.id), p))
      SPRINTS_EXEMPLO.forEach((s) => lote.set(fs.doc(colSpr, s.id), s))
      await lote.commit()
    },
    observarUsuario(cb) {
      return auth.onAuthStateChanged(a, (u) => cb(u?.email ? { email: u.email } : null))
    },
    async entrar(email, senha) {
      await auth.signInWithEmailAndPassword(a, email, senha)
    },
    async sair() {
      await auth.signOut(a)
    },
  }
}

let instancia: Promise<Repo> | null = null
export function obterRepo(): Promise<Repo> {
  if (!instancia) instancia = temFirebase ? criarRepoFirebase() : Promise.resolve(criarRepoDemo())
  return instancia
}
