import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  Check,
  HelpCircle,
  LockKeyhole,
  LogOut,
  MailCheck,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react'

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
  const {
    user,
    profile,
    updateProfile,
    requestPasswordReset,
    signOut,
  } = useAuthStore()
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
  const [savingName, setSavingName] = useState(false)
  const [savingReminder, setSavingReminder] = useState(false)
  const [sendingPasswordLink, setSendingPasswordLink] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    setName(profile?.name || '')
  }, [profile?.name])

  useEffect(() => {
    setNotifyTime(profile?.notify_time || '08:00')
  }, [profile?.notify_time])

  const saveName = async () => {
    setSavingName(true)
    setStatus('')
    await updateProfile({ name: name.trim() })
    setSavingName(false)
    setStatus('Seu nome foi atualizado.')
  }

  const saveReminderTime = async () => {
    setSavingReminder(true)
    setStatus('')
    await updateProfile({ notify_time: notifyTime })
    setSavingReminder(false)
    setStatus('Horário do lembrete atualizado.')
  }

  const sendPasswordLink = async () => {
    if (!user?.email || sendingPasswordLink) return

    setSendingPasswordLink(true)
    setStatus('')
    try {
      await requestPasswordReset(user.email)
      setStatus('Enviamos um link para você criar uma nova senha.')
    } catch {
      setStatus('Não foi possível enviar o link agora. Tente novamente em alguns instantes.')
    } finally {
      setSendingPasswordLink(false)
    }
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

  const emailConfirmed = Boolean(user?.email_confirmed_at || user?.confirmed_at)

  return (
    <main className="ves-page ves-brand-page pb-28">
      <header className="ves-container max-w-2xl pb-7 pt-10">
        <p className="ves-eyebrow">Seu espaço</p>
        <h1 className="ves-heading mt-2 text-[2.35rem]">Ajustes</h1>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-muted dark:text-night-muted">
          Conta, conforto de leitura e lembretes em um só lugar. Cada mudança fica perto daquilo que ela altera.
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

        <SettingsSection
          eyebrow="Sua conta"
          title="Como você entra e como o Vereda chama você"
          icon={User}
        >
          <div className="rounded-vesMd border border-line bg-canvas/45 p-4 dark:border-night-line dark:bg-night/35">
            <div className="flex items-start gap-3">
              <MailCheck size={20} className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="break-all font-medium text-ink dark:text-night-ink">{user?.email}</p>
                <p className="mt-1 text-sm text-muted dark:text-night-muted">
                  {emailConfirmed ? 'E-mail confirmado' : 'Confirmação de e-mail pendente'}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${emailConfirmed ? 'bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                {emailConfirmed ? 'Confirmado' : 'Pendente'}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <Input
              label="Como chamar você"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome"
            />
            <Button
              onClick={saveName}
              loading={savingName}
              disabled={!name.trim() || name.trim() === (profile?.name || '')}
              variant="secondary"
              size="sm"
              className="mt-3"
            >
              Salvar nome
            </Button>
          </div>

          <Divider className="my-5" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <LockKeyhole size={20} className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
              <div>
                <p className="font-medium text-ink dark:text-night-ink">Senha e acesso</p>
                <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">
                  Envie um link seguro para o seu e-mail se quiser criar uma nova senha.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={sendPasswordLink}
              loading={sendingPasswordLink}
              className="shrink-0"
            >
              Enviar link
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection
          eyebrow="Leitura e conforto"
          title="Deixe o texto agradável para você"
          icon={BookOpen}
        >
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

          <Divider className="my-5" />

          <FontChoice
            title="Textos do aplicativo"
            description="Afeta menus, botões e orientações."
            value={appFontScale}
            onChange={updateAppFont}
          />

          <Divider className="my-5" />

          <FontChoice
            title="Texto das obras"
            description="Afeta apenas os trechos de leitura."
            value={fontSize}
            onChange={updateReaderFont}
          />
        </SettingsSection>

        <SettingsSection
          eyebrow="Lembretes"
          title="Um toque gentil, somente se você quiser"
          icon={Bell}
        >
          <p className="text-sm leading-relaxed text-muted dark:text-night-muted">
            O lembrete existe para dizer que sua leitura continua disponível — não para cobrar frequência.
          </p>

          {permission === 'denied' ? (
            <p className="mt-4 rounded-vesSm bg-amber-50 p-3 text-sm leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              As notificações estão bloqueadas no navegador. Você pode continuar usando o Vereda normalmente sem elas.
            </p>
          ) : subscribed ? (
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-ink dark:text-night-ink">
                Horário preferido
                <input
                  type="time"
                  value={notifyTime}
                  onChange={(event) => setNotifyTime(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-vesSm border border-line bg-surface px-4 text-base text-ink outline-none focus:border-sage-700 focus:ring-2 focus:ring-sage-500/25 dark:border-night-line dark:bg-night-surface dark:text-night-ink"
                />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={saveReminderTime}
                  loading={savingReminder}
                  disabled={notifyTime === (profile?.notify_time || '08:00')}
                >
                  Salvar horário
                </Button>
                <Button
                  variant="ghost"
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
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={async () => {
                await requestPermission()
                setStatus('Pedido de lembrete atualizado.')
              }}
              loading={pushLoading}
              className="mt-5"
            >
              <Bell size={18} aria-hidden="true" />
              Ativar lembrete gentil
            </Button>
          )}
        </SettingsSection>

        <SettingsSection
          eyebrow="Privacidade e dados"
          title="O que fica ligado à sua conta"
          icon={ShieldCheck}
        >
          <p className="text-sm leading-relaxed text-muted dark:text-night-muted">
            O Vereda usa sua conta para manter seu progresso de leitura, preferências e trechos salvos disponíveis quando você volta. Essas informações servem para a experiência do próprio aplicativo.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted dark:text-night-muted">
            Antes de adicionarmos recursos como exportação ou exclusão de conta, eles aparecerão aqui com uma explicação clara do que acontece com os seus dados.
          </p>
        </SettingsSection>

        <SettingsSection
          eyebrow="Ajuda e sobre"
          title="Volte à orientação quando precisar"
          icon={HelpCircle}
        >
          <button
            type="button"
            onClick={() => navigate('/comecar?replay=1')}
            className="flex min-h-14 w-full items-center gap-3 rounded-vesMd border border-line bg-canvas/45 p-4 text-left transition-colors hover:border-sage-400 hover:bg-sage-50 dark:border-night-line dark:bg-night/35 dark:hover:border-sage-800 dark:hover:bg-sage-950/30"
          >
            <RotateCcw size={20} className="shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
            <span>
              <span className="block font-medium text-ink dark:text-night-ink">Refazer a introdução</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted dark:text-night-muted">Reveja como o Vereda organiza o estudo e escolha novamente um primeiro caminho.</span>
            </span>
          </button>

          <div className="mt-4 rounded-vesMd bg-clay-50/65 p-4 dark:bg-clay-950/10">
            <p className="font-medium text-ink dark:text-night-ink">Sobre o Vereda</p>
            <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">
              Um projeto gratuito, sem anúncios e sem fins lucrativos, criado para facilitar uma leitura calma e orientada das obras fundamentais do Espiritismo.
            </p>
          </div>
        </SettingsSection>

        <section aria-labelledby="session-heading" className="pt-2">
          <h2 id="session-heading" className="sr-only">Sessão</h2>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-vesSm border border-red-100 bg-surface px-4 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-950 dark:bg-night-surface dark:text-red-300 dark:hover:bg-red-950/30"
          >
            <LogOut size={18} aria-hidden="true" />
            Sair da conta
          </button>
        </section>
      </div>
    </main>
  )
}

function SettingsSection({ eyebrow, title, icon: Icon, children }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-vesSm bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
          <Icon size={20} aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sage-700 dark:text-sage-300">{eyebrow}</p>
          <h2 className="mt-1 font-display text-xl font-semibold leading-tight text-ink dark:text-night-ink">{title}</h2>
        </div>
      </div>
      {children}
    </Card>
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
