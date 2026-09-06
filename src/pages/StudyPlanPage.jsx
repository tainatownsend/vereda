import { useMemo, useState } from 'react'
import { ArrowLeft, Check, Clock3, CalendarDays, Leaf } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button, Card } from '@/components/ui'
import { useAuthStore } from '@/store'
import {
  buildStudyPlan,
  getStudyPlan,
  SESSION_LENGTH_OPTIONS,
  WEEKLY_FREQUENCY_OPTIONS,
} from '@/features/studyPlan/studyPlan'

export default function StudyPlanPage() {
  const navigate = useNavigate()
  const { user, updateStudyPlan } = useAuthStore()
  const existingPlan = useMemo(() => getStudyPlan(user), [user])
  const [sessionLength, setSessionLength] = useState(existingPlan?.session_length || 'medium')
  const [weeklyFrequency, setWeeklyFrequency] = useState(existingPlan?.weekly_frequency || 'three')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const savePlan = async () => {
    const plan = buildStudyPlan(sessionLength, weeklyFrequency)
    if (!plan || saving) return

    setSaving(true)
    setStatus('')
    try {
      await updateStudyPlan(plan)
      setStatus('Seu ritmo foi salvo. O Vereda vai usar isso para tornar o próximo passo mais claro, sem cobrar sequência.')
    } catch {
      setStatus('Não foi possível salvar agora. Tente novamente em instantes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="ves-page ves-brand-page min-h-screen pb-28">
      <div className="ves-container max-w-2xl pt-8 sm:pt-12">
        <header>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex min-h-11 items-center gap-2 rounded-vesSm px-2 text-sm font-semibold text-sage-800 hover:bg-sage-50 dark:text-sage-300 dark:hover:bg-sage-950"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Voltar
          </button>
          <p className="ves-eyebrow mt-5">Seu ritmo</p>
          <h1 className="ves-heading mt-2 text-[2.35rem] leading-[1.08] sm:text-[2.8rem]">Quanto estudo cabe na sua rotina?</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted dark:text-night-muted">
            Isso não cria uma obrigação. Serve apenas para o Vereda sugerir sessões que caibam de verdade no seu dia e ajudar você a retomar sem culpa depois de uma pausa.
          </p>
        </header>

        <div className="mt-8 space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-vesSm bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
                <Clock3 size={20} aria-hidden="true" />
              </div>
              <div>
                <p className="ves-eyebrow">Duração</p>
                <h2 className="mt-1 font-display text-xl font-semibold">Quanto tempo costuma funcionar melhor?</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {SESSION_LENGTH_OPTIONS.map((option) => (
                <ChoiceButton
                  key={option.id}
                  selected={sessionLength === option.id}
                  onClick={() => setSessionLength(option.id)}
                  label={option.label}
                />
              ))}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-vesSm bg-clay-50 text-clay-700 dark:bg-clay-950/20 dark:text-clay-300">
                <CalendarDays size={20} aria-hidden="true" />
              </div>
              <div>
                <p className="ves-eyebrow">Frequência</p>
                <h2 className="mt-1 font-display text-xl font-semibold">Quantas vezes por semana parece realista?</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {WEEKLY_FREQUENCY_OPTIONS.map((option) => (
                <ChoiceButton
                  key={option.id}
                  selected={weeklyFrequency === option.id}
                  onClick={() => setWeeklyFrequency(option.id)}
                  label={option.label}
                />
              ))}
            </div>
          </Card>

          <div className="rounded-vesLg border border-sage-200 bg-sage-50/75 p-5 dark:border-sage-900 dark:bg-sage-950/30">
            <div className="flex items-start gap-3">
              <Leaf size={20} className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-sage-900 dark:text-sage-200">
                Uma semana mais cheia não apaga seu caminho. O Vereda nunca transforma frequência em punição, ranking ou cobrança.
              </p>
            </div>
          </div>

          {status && (
            <p role="status" aria-live="polite" className="rounded-vesMd border border-line bg-surface p-4 text-sm leading-relaxed text-muted dark:border-night-line dark:bg-night-surface dark:text-night-muted">
              {status}
            </p>
          )}

          <Button onClick={savePlan} loading={saving} className="w-full sm:w-auto">
            <Check size={18} aria-hidden="true" />
            {existingPlan ? 'Atualizar meu ritmo' : 'Salvar meu ritmo'}
          </Button>
        </div>
      </div>
    </main>
  )
}

function ChoiceButton({ selected, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-14 rounded-vesMd border px-4 py-3 text-left text-sm font-semibold transition-colors ${
        selected
          ? 'border-sage-700 bg-sage-50 text-sage-900 ring-2 ring-sage-500/15 dark:border-sage-400 dark:bg-sage-950/45 dark:text-sage-100'
          : 'border-line bg-surface text-ink hover:border-sage-300 hover:bg-sage-50/50 dark:border-night-line dark:bg-night-surface dark:text-night-ink dark:hover:border-sage-800'
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        {label}
        {selected && <Check size={17} className="shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />}
      </span>
    </button>
  )
}
