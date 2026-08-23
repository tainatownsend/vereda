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
      <main className="ves-page flex min-h-screen items-center px-6 py-10">
        <section className="mx-auto w-full max-w-md text-center">
          <VeredaLogo size={52} />
          <div className="mt-10 rounded-ves border border-sage-200 bg-sage-50 p-7 dark:border-sage-900 dark:bg-sage-950/40">
            <Check
              size={28}
              className="mx-auto text-sage-700 dark:text-sage-300"
              aria-hidden="true"
            />
            <h1 className="ves-heading mt-4 text-[2rem]">Senha atualizada</h1>
            <p className="mt-3 leading-relaxed text-muted dark:text-night-muted">
              Pronto. Você já pode continuar sua jornada no Vereda.
            </p>
            <Button className="mt-6 w-full" onClick={() => navigate('/home', { replace: true })}>
              Continuar para o Vereda
              <ArrowRight size={19} aria-hidden="true" />
            </Button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="ves-page flex min-h-screen items-center px-6 py-10">
      <section className="mx-auto w-full max-w-md">
        <VeredaLogo size={52} />
        <p className="ves-eyebrow mt-10">Recupere seu acesso</p>
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
      </section>
    </main>
  )
}
