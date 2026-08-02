import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut, Moon, Sun, Bell, User } from 'lucide-react'
import { useAuthStore, useUIStore } from '@/store'
import { Input, Card, Divider } from '@/components/ui'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, profile, updateProfile, signOut } = useAuthStore()
  const { permission, subscribed, loading: pushLoading, requestPermission, unsubscribe } = usePushNotifications(user?.id)
  const { darkMode, toggleDark, fontSize, setFontSize, appFontScale, setAppFontScale } = useUIStore()

  const [name,       setName]       = useState(profile?.name || '')
  const [notifyTime, setNotifyTime] = useState(profile?.notify_time || '08:00')
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)

  const save = async () => {
    setSaving(true)
    await updateProfile({ name, notify_time: notifyTime })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-slate-900 pb-24">

      <header className="bg-white dark:bg-slate-800 border-b border-primary-100 dark:border-slate-700 px-5 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-primary-600 dark:text-primary-400" />
        </button>
        <h1 className="font-display text-2xl text-slate-700 dark:text-slate-50">Configurações</h1>
      </header>

      <div className="px-4 mt-4 space-y-4 max-w-lg mx-auto">

        {/* Conta */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <User size={18} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-700 dark:text-slate-100">Conta</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{user?.email}</p>
            </div>
          </div>
          <Input label="Nome" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
        </Card>

        {/* Aparência */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-sm text-slate-700 dark:text-slate-100">Aparência</h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode
                ? <Moon size={18} className="text-primary-500" />
                : <Sun size={18} className="text-amber-400" />
              }
              <span className="text-sm text-slate-700 dark:text-slate-200">Modo escuro</span>
            </div>
            <Toggle value={darkMode} onChange={toggleDark} />
          </div>

          <Divider />

          <div>
            <p className="text-sm text-slate-700 dark:text-slate-200 mb-1">Tamanho da fonte do app</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">Afeta menus, botões e textos em geral</p>
            <div className="flex gap-2">
              {[
                { id: 'sm', label: 'Pequena' },
                { id: 'md', label: 'Média' },
                { id: 'lg', label: 'Grande' },
                { id: 'xl', label: 'Extra' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setAppFontScale(f.id)}
                  style={{
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: '2px solid',
                    borderColor: appFontScale === f.id ? '#7B5EA7' : '#E2E8F0',
                    background: appFontScale === f.id ? '#7B5EA7' : 'white',
                    color: appFontScale === f.id ? 'white' : '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <Divider />

          <div>
            <p className="text-sm text-slate-700 dark:text-slate-200 mb-1">Tamanho da fonte de leitura</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">Afeta apenas o texto dos livros</p>
            <div className="flex gap-2">
              {[
                { id: 'sm', label: 'Pequena' },
                { id: 'md', label: 'Média' },
                { id: 'lg', label: 'Grande' },
                { id: 'xl', label: 'Extra' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFontSize(f.id)}
                  style={{
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: '2px solid',
                    borderColor: fontSize === f.id ? '#7B5EA7' : '#E2E8F0',
                    background: fontSize === f.id ? '#7B5EA7' : 'white',
                    color: fontSize === f.id ? 'white' : '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Lembrete */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Bell size={18} className="text-amber-500" />
            <h2 className="font-semibold text-sm text-forest-900 dark:text-slate-100">Lembrete diário</h2>
          </div>

          {permission === 'denied' ? (
            <p className="text-xs text-red-400">
              Notificações bloqueadas nas configurações do navegador. Para ativar, acesse as configurações do seu navegador e permita notificações para este site.
            </p>
          ) : subscribed ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-400 dark:text-slate-500">Horário preferido</p>
                <input
                  type="time"
                  value={notifyTime}
                  onChange={e => setNotifyTime(e.target.value)}
                  className="text-sm font-semibold text-forest-900 dark:text-slate-100 bg-primary-50 dark:bg-slate-900 px-3 py-2 rounded-lg outline-none border border-primary-100 dark:border-slate-700"
                />
              </div>
              <button
                onClick={unsubscribe}
                disabled={pushLoading}
                className="text-xs text-red-400 hover:text-red-500"
              >
                {pushLoading ? 'Aguarde...' : 'Desativar lembretes'}
              </button>
            </>
          ) : (
            <div>
              <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">
                Ative para receber um lembrete diário para não perder sua sequência de leitura.
              </p>
              <button
                onClick={requestPermission}
                disabled={pushLoading}
                style={{
                  width: '100%', padding: '10px', borderRadius: '10px',
                  border: 'none', background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: 'white', fontSize: '13px', fontWeight: '600',
                  cursor: pushLoading ? 'not-allowed' : 'pointer',
                  opacity: pushLoading ? 0.7 : 1,
                }}
              >
                {pushLoading ? 'Ativando...' : '🔔 Ativar lembretes'}
              </button>
            </div>
          )}
        </Card>

        <button
          onClick={save}
          disabled={saving}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #8B6BBF, #5A3F88)',
            color: 'white',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saved ? '✓ Salvo!' : 'Salvar alterações'}
        </button>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-500 hover:text-red-600"
        >
          <LogOut size={16} /> Sair da conta
        </button>

        <p className="text-center pb-4" style={{ fontSize: '12px', color: '#94A3B8' }}>
          Vereda é gratuito, sem anúncios e sem fins lucrativos.
        </p>
      </div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={onChange}
      style={{
        position: 'relative',
        width: 48,
        height: 26,
        borderRadius: 100,
        border: 'none',
        cursor: 'pointer',
        background: value ? 'linear-gradient(135deg, #A98FCC, #7B5EA7)' : '#CBD5E1',
        transition: 'background 0.3s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 3,
        left: value ? 'calc(100% - 22px)' : 3,
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.3s',
      }} />
    </button>
  )
}