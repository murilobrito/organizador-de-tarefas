import { useState } from 'react'
import { Modal } from './ui'
import { useApp } from '../store'
import { ADMIN_EMAIL } from '../data/repo'

const MENSAGENS: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/user-not-found': 'Usuário não encontrado.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
  'auth/network-request-failed': 'Sem conexão com o Firebase.',
}

export function Login() {
  const aberto = useApp((s) => s.loginAberto)
  const abrir = useApp((s) => s.abrir)
  const entrar = useApp((s) => s.entrar)
  const modo = useApp((s) => s.repo?.modo)
  const [email, setEmail] = useState(ADMIN_EMAIL)
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async () => {
    setErro('')
    setEnviando(true)
    try {
      await entrar(email, senha)
      setSenha('')
    } catch (e) {
      const code = (e as { code?: string }).code ?? ''
      setErro(MENSAGENS[code] ?? (e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal aberto={aberto} aoFechar={() => abrir('login', false)} estreito>
      <h2>Entrar como administrador</h2>
      <p className="sub">
        {modo === 'demo'
          ? 'Modo demonstração: não há senha — basta entrar para testar a edição.'
          : 'Apenas o administrador pode registrar e editar demandas. Visitantes navegam sem login.'}
      </p>
      <form
        className="form-grade"
        onSubmit={(e) => {
          e.preventDefault()
          enviar()
        }}
      >
        <label className="inteiro">
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        {modo !== 'demo' && (
          <label className="inteiro">
            Senha
            <input type="password" value={senha} autoFocus onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
          </label>
        )}
        {erro && (
          <p className="inteiro" style={{ color: 'var(--perigo)', margin: 0 }}>
            {erro}
          </p>
        )}
        <div className="rodape-modal inteiro">
          <button type="button" className="btn fantasma" onClick={() => abrir('login', false)}>
            Cancelar
          </button>
          <button type="submit" className="btn primario" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
