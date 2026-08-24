import { useState } from 'react'
import { ArrowRight, Check, Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button, Input, VeredaLogo } from '@/components/ui'
import { validateNewPassword } from '@/features/auth/passwordRecovery'
import { useAuthStore } from '@/store'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { updatePassword } = useAuthStore()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationError = validateNewPassword(password, confirmation)

    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')

    try {
      await updatePassword(password)
      setSaved(true)
    } catch (caughtError) {
      const message = caughtError?.message || ''
      setError(
        /session|expired|invalid/i.test(message)
          ? 'Este link é inválido ou expirou. Solicite um novo link na tela de entrada.'
          : message || 'Não foi possível atualizar sua senha. Tente novamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (saved) {
    return (
      <main className="ves-page ves-brand-page flex min-h-screen items-center px-6 py-10">
        <section className="mx-auto w-full max-w-md">
          <div className="ves-horizon-panel rounded-vesLg border border-line p-7 text-center shadow-editorial dark:border-night-line">
            <div className="relative z-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/70 bg-white/65 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10">
                <VeredaLogo size={62} />
              </div>
              <div className="mx-auto mt-6 flex h-11 w-11 items-center justify-center rounded-full bg-sage-700 text-white shadow-sm dark:bg-sage-300 dark:text-sage-950">
                <Check size={23} aria-hidden="true" />
              </div>
              <h1 className="ves-heading mt-4 text-[2rem]">Senha atualizada</h1>
              <p className="mt-3 leading-relaxed text-muted dark:text-night-muted">
                Pronto. Você já pode continuar sua jornada no Vereda.
              </p>
              <Button className="mt-6 w-full" onClick={() => navigate('/home', { replace: true })}>
                Continuar para o Vereda
                <ArrowRight size={19} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="ves-page ves-brand-page flex min-h-screen items-center px-6 py-10">
      <section className="mx-auto w-full max-w-md">
        <div className="mb-7 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-line/70 bg-surface/70 shadow-sm dark:border-night-line dark:bg-night-surface/70">
            <VeredaLogo size={50} />
          </div>
          <div>
            <p className="font-display text-xl font-semibold tracking-[0.08em] text-ink dark:text-night-ink">VEREDA</p>
            <p className="mt-1 text-sm text-muted dark:text-night-muted">seu caminho de aprendizado</p>
          </div>
        </div>

        <div className="rounded-vesLg border border-line bg-surface/88 p-6 shadow-editorial backdrop-blur-sm sm:p-7 dark:border-night-line dark:bg-night-surface/88">
          <p className="ves-eyebrow">Recupere seu acesso</p>
          <h1 className="ves-heading mt-2 text-[2.15rem]">Crie uma nova senha</h1>
          <p className="mt-3 leading-relaxed text-muted dark:text-night-muted">
            Escolha uma senha com pelo menos 6 caracteres.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="relative">
              <Input
                label="Nova senha"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
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

            <Input
              label="Confirme a nova senha"
              type={showPassword ? 'text' : 'password'}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              required
            />

            {error && (
              <div
                role="alert"
                className="rounded-vesSm border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-relaxed text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
              >
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Salvar nova senha
              {!loading && <ArrowRight size={19} aria-hidden="true" />}
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
