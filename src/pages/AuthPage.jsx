import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react'

import { useAuthStore } from '@/store'
import { Button, Input, VeredaLogo } from '@/components/ui'

const ERROR_MESSAGES = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email already registered': 'Este e-mail já está em uso.',
  'User already registered': 'Este e-mail já possui uma conta.',
  'Password should be at least 6 characters':
    'A senha precisa ter ao menos 6 caracteres.',
  'Email not confirmed':
    'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
  'Failed to fetch':
    'Não foi possível conectar ao Vereda. Verifique sua internet e tente novamente.',
}

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    requestPasswordReset,
  } = useAuthStore()

  const isSignup = mode === 'signup'
  const isForgot = mode === 'forgot'

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email.trim()) {
      setError('Informe seu e-mail.')
      return
    }

    if (!isForgot && !password) {
      setError('Preencha e-mail e senha.')
      return
    }

    if (isSignup && !name.trim()) {
      setError('Informe como gostaria de ser chamado.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isForgot) {
        await requestPasswordReset(email.trim())
        setMessage(
          'Se houver uma conta com este e-mail, você receberá um link para criar uma nova senha.',
        )
      } else if (isSignup) {
        await signUpWithEmail(email.trim(), password, name.trim())
      } else {
        await signInWithEmail(email.trim(), password)
      }
    } catch (caughtError) {
      setError(
        ERROR_MESSAGES[caughtError?.message] ||
          caughtError?.message ||
          'Algo deu errado. Tente novamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode((current) => (current === 'login' ? 'signup' : 'login'))
    setError('')
    setMessage('')
  }

  const openForgotPassword = () => {
    setMode('forgot')
    setPassword('')
    setError('')
    setMessage('')
  }

  const returnToLogin = () => {
    setMode('login')
    setError('')
    setMessage('')
  }

  return (
    <main className="ves-page min-h-screen">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden border-r border-line px-12 py-14 lg:flex lg:flex-col lg:justify-between dark:border-night-line">
          <VeredaLogo size={54} />

          <div className="max-w-xl">
            <p className="ves-eyebrow">Um passo por dia</p>
            <h1 className="ves-heading mt-4 text-[3.8rem] leading-[0.98]">
              Uma jornada para toda a vida.
            </h1>
            <p className="mt-7 max-w-lg text-xl leading-relaxed text-muted dark:text-night-muted">
              Estude as obras fundamentais do Espiritismo com clareza,
              continuidade e tranquilidade.
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted dark:text-night-muted">
            <ShieldCheck size={20} className="text-sage-700 dark:text-sage-300" />
            Gratuito, sem anúncios e sem fins lucrativos.
          </div>
        </section>

        <section className="flex min-h-screen items-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <VeredaLogo size={48} />
              <p className="ves-eyebrow mt-7">Vereda</p>
              <h1 className="ves-heading mt-2 text-[2.4rem]">
                Um passo por dia.
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted dark:text-night-muted">
                Seu caminho pelas obras espíritas, no seu ritmo.
              </p>
            </div>

            <div>
              <p className="ves-eyebrow">
                {isForgot
                  ? 'Recupere seu acesso'
                  : isSignup
                    ? 'Comece sua jornada'
                    : 'Que bom ter você de volta'}
              </p>
              <h2 className="ves-heading mt-2 text-[2.15rem]">
                {isForgot
                  ? 'Esqueceu sua senha?'
                  : isSignup
                    ? 'Crie sua conta'
                    : 'Entre no Vereda'}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted dark:text-night-muted">
                {isForgot
                  ? 'Informe seu e-mail. Enviaremos um link para você criar uma nova senha.'
                  : isSignup
                    ? 'Leva menos de um minuto. Depois, o Vereda ajuda você a encontrar um primeiro caminho.'
                    : 'Sua jornada continua exatamente de onde você parou.'}
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {isSignup && (
                <Input
                  label="Seu nome"
                  placeholder="Como gostaria de ser chamado"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                />
              )}

              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                inputMode="email"
                required
              />

              {!isForgot && (
                <div>
                  <div className="relative">
                    <Input
                      label="Senha"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={isSignup ? 'Mínimo 6 caracteres' : 'Sua senha'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      inputClassName="pr-14"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute bottom-1 right-1 flex h-12 w-12 items-center justify-center rounded-vesSm text-muted hover:bg-sage-100 hover:text-ink dark:text-night-muted dark:hover:bg-sage-950 dark:hover:text-night-ink"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? (
                        <EyeOff size={20} aria-hidden="true" />
                      ) : (
                        <Eye size={20} aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  {!isSignup && (
                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={openForgotPassword}
                        className="min-h-11 rounded-vesSm px-2 text-sm font-semibold text-sage-800 underline-offset-4 hover:underline dark:text-sage-300"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isSignup && (
                <div className="flex items-start gap-3 rounded-vesSm bg-sage-50 p-4 text-sm leading-relaxed text-muted dark:bg-sage-950/40 dark:text-night-muted">
                  <Check
                    size={18}
                    className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300"
                    aria-hidden="true"
                  />
                  O lugar onde você parar ficará salvo para retomar quando quiser.
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-vesSm border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-relaxed text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                >
                  {error}
                </div>
              )}

              {message && (
                <div
                  role="status"
                  className="rounded-vesSm border border-sage-200 bg-sage-50 px-4 py-3 text-sm font-medium leading-relaxed text-sage-900 dark:border-sage-900 dark:bg-sage-950/40 dark:text-sage-200"
                >
                  {message}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full">
                {isForgot ? 'Enviar link de recuperação' : isSignup ? 'Criar conta' : 'Entrar'}
                {!loading && <ArrowRight size={19} aria-hidden="true" />}
              </Button>
            </form>

            {isForgot ? (
              <button
                type="button"
                onClick={returnToLogin}
                className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-vesSm px-3 text-sm font-semibold text-sage-800 underline-offset-4 hover:underline dark:text-sage-300"
              >
                <ArrowLeft size={18} aria-hidden="true" />
                Voltar para entrar
              </button>
            ) : (
              <>
                <div className="relative my-7">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-line dark:border-night-line" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-canvas px-4 text-sm text-muted dark:bg-night dark:text-night-muted">
                      ou continue com
                    </span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  onClick={signInWithGoogle}
                  className="w-full"
                >
                  <GoogleIcon />
                  Google
                </Button>

                <p className="mt-8 text-center text-sm text-muted dark:text-night-muted">
                  {isSignup ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="min-h-11 rounded-vesSm px-2 font-semibold text-sage-800 underline-offset-4 hover:underline dark:text-sage-300"
                  >
                    {isSignup ? 'Entrar' : 'Criar conta'}
                  </button>
                </p>
              </>
            )}

            <p className="mt-5 text-center text-xs leading-relaxed text-muted dark:text-night-muted">
              Ao continuar, você concorda em usar o Vereda como ferramenta
              complementar de estudo.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
