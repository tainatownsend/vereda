import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Check, LogOut, Moon, Sun, User } from 'lucide-react'

import { useAuthStore, useUIStore } from '@/store'
import { Button, Card, Divider, Input } from '@/components/ui'
import { usePushNotifications } from '@/hooks/usePushNotifications'

const FONT_OPTIONS = [
  { id: 'sm', label: 'Pequena' },
  { id: 'md', label: 'Média' },
  { id: 'lg', label: 'Grande' },
  { id: 'xl', label: 'Extra' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, profile, updateProfile, signOut } = useAuthStore()
  const {
    permission,
    subscribed,
    loading: pushLoading,
    requestPermission,
    unsubscribe,
  } = usePushNotifications(user?.id)
  const {
    darkMode,
    toggleDark,
    fontSize,
    setFontSize,
    appFontScale,
    setAppFontScale,
  } = useUIStore()

  const [name, setName] = useState(profile?.name || '')
  const [notifyTime, setNotifyTime] = useState(profile?.notify_time || '08:00')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const save = async () => {
    setSaving(true)
    setStatus('')
    await updateProfile({ name, notify_time: notifyTime })
    setSaving(false)
    setStatus('Alterações salvas.')
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const updateAppFont = (value) => {
    setAppFontScale(value)
    setStatus(`Tamanho dos textos do aplicativo: ${labelForFont(value)}.`)
  }

  const updateReaderFont = (value) => {
    setFontSize(value)
    setStatus(`Tamanho do texto de leitura: ${labelForFont(value)}.`)
  }

  const updateDarkMode = () => {
    toggleDark()
    setStatus(darkMode ? 'Modo claro ativado.' : 'Modo escuro ativado.')
  }

  return (
    <main className="ves-page ves-brand-page pb-28">
      <header className="ves-container pb-7 pt-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex min-h-12 items-center gap-2 rounded-vesSm px-2 text-sm font-semibold text-sage-800 hover:bg-sage-100 dark:text-sage-300 dark:hover:bg-sage-950"
        >
          <ArrowLeft size={20} aria-hidden="true" />
          Voltar
        </button>

        <p className="ves-eyebrow mt-7">Seu espaço</p>
        <h1 className="ves-heading mt-2 text-[2.35rem]">Ajustes</h1>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-muted dark:text-night-muted">
          Deixe o Vereda confortável para você. As escolhas podem ser alteradas a qualquer momento.
        </p>
      </header>

      <div className="ves-container max-w-2xl space-y-5 pb-10">
        {status && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 rounded-vesMd border border-sage-200 bg-sage-50 p-4 text-sm text-sage-900 dark:border-sage-900 dark:bg-sage-950/35 dark:text-sage-200"
          >
            <Check size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            {status}
          </div>
        )}

        <Card className="p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-vesSm bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
              <User size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-ink dark:text-night-ink">Como chamar você</h2>
              <p className="mt-1 truncate text-sm text-muted dark:text-night-muted">{user?.email}</p>
            </div>
          </div>
          <Input
            label="Nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Seu nome"
          />
        </Card>

        <Card className="space-y-5 p-5">
          <div>
            <h2 className="font-semibold text-ink dark:text-night-ink">Conforto visual</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">
              Ajuste contraste e tamanho do texto sem precisar entrar na leitura.
            </p>
          </div>

          <div className="flex min-h-14 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {darkMode ? (
                <Moon size={20} className="shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
              ) : (
                <Sun size={20} className="shrink-0 text-amber-500" aria-hidden="true" />
              )}
              <div>
                <p className="font-medium text-ink dark:text-night-ink">Modo escuro</p>
                <p className="text-sm text-muted dark:text-night-muted">Pode ser mais confortável em ambientes com pouca luz.</p>
              </div>
            </div>
            <Toggle
              value={darkMode}
              onChange={updateDarkMode}
              label={darkMode ? 'Desativar modo escuro' : 'Ativar modo escuro'}
            />
          </div>

          <Divider />

          <FontChoice
            title="Tamanho dos textos do aplicativo"
            description="Afeta menus, botões e textos em geral."
            value={appFontScale}
            onChange={updateAppFont}
          />

          <Divider />

          <FontChoice
            title="Tamanho do texto de leitura"
            description="Afeta apenas o texto das obras."
            value={fontSize}
            onChange={updateReaderFont}
          />
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-start gap-3">
            <Bell size={20} className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-ink dark:text-night-ink">Lembrete gentil</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">
                Opcional. Serve apenas para lembrar que sua leitura está disponível — não para cobrar frequência.
              </p>
            </div>
          </div>

          {permission === 'denied' ? (
            <p className="rounded-vesSm bg-amber-50 p-3 text-sm leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              As notificações estão bloqueadas no navegador. Você pode continuar usando o Vereda normalmente sem elas.
            </p>
          ) : subscribed ? (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-ink dark:text-night-ink">
                Horário preferido
                <input
                  type="time"
                  value={notifyTime}
                  onChange={(event) => setNotifyTime(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-vesSm border border-line bg-surface px-4 text-base text-ink outline-none focus:border-sage-700 focus:ring-2 focus:ring-sage-500/25 dark:border-night-line dark:bg-night-surface dark:text-night-ink"
                />
              </label>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await unsubscribe()
                  setStatus('Lembretes desativados.')
                }}
                loading={pushLoading}
              >
                Desativar lembrete
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={async () => {
                await requestPermission()
                setStatus('Pedido de lembrete atualizado.')
              }}
              loading={pushLoading}
            >
              <Bell size={18} aria-hidden="true" />
              Ativar lembrete gentil
            </Button>
          )}
        </Card>

        <Button onClick={save} loading={saving} className="w-full">
          Salvar ajustes
        </Button>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-vesSm text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          <LogOut size={18} aria-hidden="true" />
          Sair da conta
        </button>

        <p className="pb-4 text-center text-xs leading-relaxed text-muted dark:text-night-muted">
          Vereda é gratuito, sem anúncios e sem fins lucrativos.
        </p>
      </div>
    </main>
  )
}

function FontChoice({ title, description, value, onChange }) {
  return (
    <div>
      <p className="font-medium text-ink dark:text-night-ink">{title}</p>
      <p className="mt-1 text-sm text-muted dark:text-night-muted">{description}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FONT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
            className={`min-h-12 rounded-vesSm border px-3 text-sm font-semibold transition-colors ${
              value === option.id
                ? 'border-sage-800 bg-sage-800 text-white dark:border-sage-300 dark:bg-sage-300 dark:text-sage-950'
                : 'border-line bg-surface text-ink hover:border-sage-400 dark:border-night-line dark:bg-night-surface dark:text-night-ink'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Toggle({ value, onChange, label }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={value}
      aria-label={label}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
        value ? 'bg-sage-700 dark:bg-sage-300' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-[left] ${
          value ? 'left-7 dark:bg-sage-950' : 'left-1'
        }`}
        aria-hidden="true"
      />
    </button>
  )
}

function labelForFont(value) {
  return FONT_OPTIONS.find((option) => option.id === value)?.label || 'Média'
}
