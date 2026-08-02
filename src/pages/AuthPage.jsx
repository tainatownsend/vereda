import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { Input, VeredaLogo } from '@/components/ui'

export default function AuthPage() {
  const [mode,     setMode]     = useState('login')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuthStore()
  const navigate = useNavigate()

  const handle = async () => {
    if (!email || !password) { setError('Preencha e-mail e senha.'); return }
    if (mode === 'signup' && !name) { setError('Informe seu nome.'); return }
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password)
      } else {
        await signUpWithEmail(email, password, name)
      }
      navigate('/home')
    } catch (e) {
      const msgs = {
        'Invalid login credentials':                'E-mail ou senha incorretos.',
        'Email already registered':                 'Este e-mail já está em uso.',
        'Password should be at least 6 characters': 'A senha precisa ter ao menos 6 caracteres.',
      }
      setError(msgs[e.message] || 'Algo deu errado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
      style={{ background: 'linear-gradient(160deg, #F4F1FA 0%, #EEE9F8 50%, #FBF3E6 100%)' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <VeredaLogo size={56} />
          <div className="text-center">
            <h1 className="font-display text-3xl text-forest-900 tracking-tight">Vereda</h1>
            <p className="text-sm text-slate-500 mt-1">
              Seu caminho pelos livros espíritas, no seu ritmo.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-primary-200/50 p-7 shadow-lg">
          <h2 className="font-display text-xl text-forest-900 mb-6 text-center">
            {mode === 'login' ? 'Entrar na Vereda' : 'Criar sua conta'}
          </h2>

          <div className="flex flex-col gap-4">
            {mode === 'signup' && (
              <Input
                label="Seu nome"
                placeholder="Como gostaria de ser chamado"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            )}
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              label="Senha"
              type="password"
              placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle()}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <button
              onClick={handle}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '4px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #8B6BBF, #5A3F88)',
                color: 'white',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-slate-400 bg-white">ou continue com</span>
            </div>
          </div>

          <button
            onClick={signInWithGoogle}
            className="w-full h-11 flex items-center justify-center gap-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <GoogleIcon />
            Google
          </button>
        </div>

        {/* Toggle modo */}
        <p className="text-center text-sm text-slate-400 mt-6">
          {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}
          {' '}
          <button
            className="text-primary-600 font-medium hover:underline"
            onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError('') }}
          >
            {mode === 'login' ? 'Criar conta' : 'Entrar'}
          </button>
        </p>

        <p className="text-center mt-8 leading-relaxed" style={{ fontSize: '12px', color: '#94A3B8' }}>
          Gratuito · Sem anúncios · Sem fins lucrativos
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}