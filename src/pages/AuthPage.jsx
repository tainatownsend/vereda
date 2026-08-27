import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

import { useAuthStore } from '@/store'
import { Button, Input, VeredaLogo } from '@/components/ui'
import { getSignupOutcome } from '@/features/auth/signupConfirmation'

const ERROR_MESSAGES = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email already registered': 'Este e-mail já está em uso.',
  'User already registered': 'Este e-mail já possui uma conta.',
  'Password should be at least 6 characters': 'A senha precisa ter ao menos 6 caracteres.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
  'Failed to fetch': 'Não foi possível conectar ao Vereda. Verifique sua internet e tente novamente.',
}

export default function AuthPage({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    resendSignupConfirmation,
    requestPasswordReset,
  } = useAuthStore()

  const isSignup = mode === 'signup'
  const isForgot = mode === 'forgot'
  const isConfirm = mode === 'confirm'

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
        setMessage('Se houver uma conta com este e-mail, você receberá um link para criar uma nova senha.')
      } else if (isSignup) {
        const data = await signUpWithEmail(email.trim(), password, name.trim())
        const outcome = getSignupOutcome(data)

        if (outcome.requiresEmailConfirmation) {
          setPassword('')
          setMode('confirm')
          setMessage('Conta criada. Falta apenas confirmar seu e-mail para continuar.')
        }
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

  const clearFeedback = () => {
    setError('')
    setMessage('')
  }

  const switchMode = () => {
    setMode((current) => (current === 'login' ? 'signup' : 'login'))
    clearFeedback()
  }

  const openForgotPassword = () => {
    setMode('forgot')
    setPassword('')
    clearFeedback()
  }

  const returnToLogin = () => {
    setMode('login')
    setPassword('')
    clearFeedback()
  }

  const useAnotherEmail = () => {
    setMode('signup')
    setEmail('')
    setPassword('')
    clearFeedback()
  }

  const resendConfirmation = async () => {
    if (!email.trim() || resending) return

    setResending(true)
    setError('')
    setMessage('')

    try {
      await resendSignupConfirmation(email.trim())
      setMessage('Enviamos um novo e-mail de confirmação. Confira sua caixa de entrada e a pasta de spam.')
    } catch {
      setError('Não foi possível reenviar agora. Aguarde um pouco e tente novamente.')
    } finally {
      setResending(false)
    }
  }

  const heading = isConfirm
    ? 'Agora confirme seu e-mail.'
    : isForgot
      ? 'Vamos recuperar seu acesso.'
      : isSignup
        ? 'Comece pelo seu primeiro passo.'
        : 'Que bom ter você por aqui.'

  const supportingCopy = isConfirm
    ? `Enviamos uma mensagem para ${email.trim()}. Abra o e-mail e toque no link de confirmação. Depois, o Vereda abre uma breve introdução para orientar seu primeiro passo.`
    : isForgot
      ? 'Informe seu e-mail e enviaremos um link para você criar uma nova senha.'
      : isSignup
        ? 'Crie sua conta. Depois de confirmar o e-mail, o Vereda apresenta como funciona e ajuda você a escolher por onde começar.'
        : 'Entre para continuar sua leitura exatamente de onde parou.'

  return (
    <main className="ves-page ves-brand-page min-h-screen lg:p-4">
      <div className="mx-auto grid min-h-screen w-full max-w-[1280px] overflow-hidden bg-surface lg:min-h-[calc(100vh-2rem)] lg:grid-cols-[1.02fr_0.98fr] lg:rounded-[2.25rem] lg:border lg:border-line lg:shadow-editorial dark:bg-night-surface dark:lg:border-night-line">
        <section className="ves-warm-panel relative hidden overflow-hidden px-12 py-9 lg:flex lg:flex-col">
          <BrandLockup size={64} />

          <div className="relative z-10 mt-12 max-w-[32rem] pb-36">
            <p className="ves-eyebrow">Estudo no seu ritmo</p>
            <h1 className="ves-heading mt-3 text-[3.15rem] leading-[1.03] xl:text-[3.45rem]">
              Um caminho simples para aprender e refletir.
            </h1>
            <p className="mt-5 max-w-[30rem] text-base leading-relaxed text-muted dark:text-night-muted">
              Obras fundamentais do Espiritismo, leitura confortável e orientação para seguir no seu próprio ritmo.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-sm font-medium text-ink/80 dark:text-night-ink/80">
              <BrandPill>Sem pressa</BrandPill>
              <BrandPill>Sem anúncios</BrandPill>
              <BrandPill>Sempre do ponto onde parou</BrandPill>
            </div>
          </div>

          <BrandLandscape />
        </section>

        <section className="flex min-h-screen items-center px-4 py-7 min-[360px]:px-5 sm:px-9 lg:min-h-0 lg:px-12 lg:py-8">
          <div className="mx-auto w-full max-w-[29rem]">
            <div className="mb-8 flex justify-center sm:mb-10 lg:hidden">
              <BrandLockup size={68} centered />
            </div>

            <div className="rounded-vesLg border border-line bg-surface p-5 shadow-editorial min-[360px]:p-6 sm:p-8 lg:border-0 lg:p-0 lg:shadow-none dark:border-night-line dark:bg-night-surface">
              <p className="ves-eyebrow">
                {isConfirm
                  ? 'Só falta uma etapa'
                  : isForgot
                    ? 'Recupere seu acesso'
                    : isSignup
                      ? 'Sua jornada começa aqui'
                      : 'Bem-vindo de volta'}
              </p>
              <h2 className="ves-heading mt-2 text-[2rem] leading-[1.08] min-[360px]:text-[2.2rem] sm:text-[2.35rem]">
                {heading}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted dark:text-night-muted">
                {supportingCopy}
              </p>

              {isConfirm ? (
                <ConfirmationPanel
                  email={email}
                  message={message}
                  error={error}
                  resending={resending}
                  onResend={resendConfirmation}
                  onUseAnotherEmail={useAnotherEmail}
                  onReturnToLogin={returnToLogin}
                />
              ) : (
                <>
                  <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                    {isSignup && (
                      <Input
                        label="Como gostaria de ser chamado?"
                        placeholder="Seu nome"
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
                            placeholder={isSignup ? 'Mínimo de 6 caracteres' : 'Sua senha'}
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
                            {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                          </button>
                        </div>

                        {!isSignup && (
                          <div className="mt-1 text-right">
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
                      <div className="flex items-start gap-3 rounded-vesMd bg-sage-50 p-4 text-sm leading-relaxed text-muted dark:bg-sage-950/40 dark:text-night-muted">
                        <Check size={18} className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
                        <span>O Vereda salva automaticamente onde você parou. Você pode fazer pausas e voltar quando quiser.</span>
                      </div>
                    )}

                    <Feedback message={message} error={error} />

                    <Button type="submit" loading={loading} className="w-full">
                      {isForgot ? 'Enviar link de recuperação' : isSignup ? 'Criar minha conta' : 'Entrar'}
                      {!loading && <ArrowRight size={19} aria-hidden="true" />}
                    </Button>
                  </form>

                  {isForgot ? (
                    <button
                      type="button"
                      onClick={returnToLogin}
                      className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-vesSm px-3 text-sm font-semibold text-sage-800 underline-offset-4 hover:underline dark:text-sage-300"
                    >
                      <ArrowLeft size={18} aria-hidden="true" />
                      Voltar para entrar
                    </button>
                  ) : (
                    <>
                      <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-line dark:border-night-line" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-surface px-4 text-sm text-muted dark:bg-night-surface dark:text-night-muted">ou</span>
                        </div>
                      </div>

                      <Button variant="secondary" onClick={signInWithGoogle} className="w-full">
                        <GoogleIcon />
                        Continuar com Google
                      </Button>

                      <p className="mt-5 text-center text-sm leading-relaxed text-muted dark:text-night-muted">
                        {isSignup ? 'Já tem uma conta?' : 'Primeira vez no Vereda?'}{' '}
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
                </>
              )}

              <div className="mt-5 flex items-center justify-center gap-2 text-center text-xs leading-relaxed text-muted dark:text-night-muted">
                <ShieldCheck size={15} className="shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
                Gratuito, sem anúncios e sem fins lucrativos.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function ConfirmationPanel({ email, message, error, resending, onResend, onUseAnotherEmail, onReturnToLogin }) {
  return (
    <div className="mt-8">
      <div className="rounded-vesLg border border-sage-200 bg-sage-50/80 p-5 dark:border-sage-900 dark:bg-sage-950/35">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage-700 text-white dark:bg-sage-300 dark:text-sage-950">
            <Mail size={20} aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-ink dark:text-night-ink">Verifique sua caixa de entrada</p>
            <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">
              O link confirma que {email.trim()} pertence a você. Se a mensagem não aparecer, confira também a pasta de spam.
            </p>
          </div>
        </div>
      </div>

      <Feedback message={message} error={error} />

      <div className="mt-5 space-y-2">
        <Button variant="secondary" onClick={onResend} loading={resending} className="w-full">
          {!resending && <RefreshCw size={18} aria-hidden="true" />}
          Reenviar e-mail de confirmação
        </Button>
        <button
          type="button"
          onClick={onUseAnotherEmail}
          className="flex min-h-12 w-full items-center justify-center rounded-vesSm px-3 text-sm font-semibold text-sage-800 hover:bg-sage-50 dark:text-sage-300 dark:hover:bg-sage-950"
        >
          Usei outro e-mail
        </button>
        <button
          type="button"
          onClick={onReturnToLogin}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-vesSm px-3 text-sm font-semibold text-sage-800 underline-offset-4 hover:underline dark:text-sage-300"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Voltar para entrar
        </button>
      </div>
    </div>
  )
}

function Feedback({ message, error }) {
  if (error) {
    return (
      <div role="alert" className="mt-5 rounded-vesSm border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-relaxed text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </div>
    )
  }

  if (!message) return null

  return (
    <div role="status" aria-live="polite" className="mt-5 rounded-vesSm border border-sage-200 bg-sage-50 px-4 py-3 text-sm font-medium leading-relaxed text-sage-900 dark:border-sage-900 dark:bg-sage-950/40 dark:text-sage-200">
      {message}
    </div>
  )
}

function BrandLockup({ size, centered = false }) {
  return (
    <div className={`relative z-10 flex items-center gap-4 ${centered ? 'flex-col gap-2 text-center' : ''}`}>
      <VeredaLogo size={size} />
      <div>
        <p className="font-display text-[1.8rem] font-semibold tracking-[0.13em] text-ink dark:text-night-ink">VEREDA</p>
        <p className="mt-0.5 text-xs font-medium tracking-[0.06em] text-muted dark:text-night-muted">seu caminho de aprendizado</p>
      </div>
    </div>
  )
}

function BrandPill({ children }) {
  return (
    <span className="rounded-full border border-sage-700/15 bg-white/55 px-3.5 py-1.5 dark:border-sage-300/20 dark:bg-white/5">
      {children}
    </span>
  )
}

function BrandLandscape() {
  return (
    <svg viewBox="0 0 640 260" className="pointer-events-none absolute inset-x-0 bottom-0 w-full" aria-hidden="true">
      <circle cx="360" cy="92" r="68" fill="#E7B977" opacity="0.3" />
      <path d="M0 134C105 88 180 96 254 136C330 177 396 164 470 120C535 82 585 86 640 105V260H0Z" fill="#CAD7C7" opacity="0.72" />
      <path d="M0 167C82 126 167 128 244 171C318 212 393 203 465 161C532 123 590 123 640 145V260H0Z" fill="#8FA68F" opacity="0.58" />
      <path d="M0 205C82 171 160 172 225 204C302 242 388 236 458 199C526 163 587 166 640 184V260H0Z" fill="#4F6757" opacity="0.34" />
      <path d="M327 260C315 230 314 208 326 190C339 171 364 168 377 149C386 135 383 120 369 112C389 116 407 126 409 143C412 160 397 173 383 183C366 195 357 211 360 233C362 244 365 253 370 260Z" fill="#FFF9F1" opacity="0.9" />
      <path d="M334 260C330 237 332 219 341 204C349 190 366 179 379 165" fill="none" stroke="#D8BFA9" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
    </svg>
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
