import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, Compass, Search } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useBooks } from '@/hooks'
import { useAuthStore } from '@/store'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { Button, Card, VeredaLogo } from '@/components/ui'

const INTENTIONS = [
  {
    id: 'foundation',
    label: 'Quero começar pelos fundamentos',
    description: 'Sugira uma primeira obra e me leve direto para ela.',
    titleIncludes: 'Espíritos',
    icon: BookOpen,
  },
  {
    id: 'question',
    label: 'Tenho uma dúvida específica',
    description: 'Quero procurar um assunto nas próprias obras.',
    route: '/descobrir',
    icon: Search,
  },
  {
    id: 'explore',
    label: 'Quero escolher uma obra',
    description: 'Prefiro ver a biblioteca e decidir por conta própria.',
    route: '/biblioteca',
    icon: Compass,
  },
]

export default function GettingStartedPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const books = useBooks()
  const onboarding = useOnboardingStore()
  const completeFirstTimeOnboarding = useAuthStore((state) => state.completeFirstTimeOnboarding)
  const [intention, setIntention] = useState(onboarding.intention || '')
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState('')

  const isNewAccount = searchParams.get('novo') === '1'
  const isReplay = searchParams.get('replay') === '1'
  const selectedIntent = INTENTIONS.find((item) => item.id === intention)

  const recommendation = useMemo(() => {
    if (!selectedIntent?.titleIncludes) return null
    return books.find((book) =>
      book.title?.toLocaleLowerCase('pt-BR').includes(
        selectedIntent.titleIncludes.toLocaleLowerCase('pt-BR'),
      ),
    ) || books[0] || null
  }, [books, selectedIntent])

  const foundationWaiting = selectedIntent?.id === 'foundation' && !recommendation

  const finish = async () => {
    if (!selectedIntent || finishing || foundationWaiting) return

    setFinishing(true)
    setError('')

    try {
      onboarding.setChoice({
        intention,
        recommendedBookId: recommendation?.id || null,
      })
      await completeFirstTimeOnboarding()

      if (selectedIntent.route) {
        navigate(selectedIntent.route, { replace: isNewAccount })
        return
      }

      if (recommendation) {
        navigate(`/livro/${recommendation.id}`, { replace: isNewAccount })
        return
      }

      navigate('/biblioteca', { replace: isNewAccount })
    } catch {
      setError('Não foi possível abrir esse caminho agora. Tente novamente.')
      setFinishing(false)
    }
  }

  const ctaLabel = selectedIntent?.id === 'foundation'
    ? foundationWaiting ? 'Preparando sugestão…' : 'Começar pelos fundamentos'
    : selectedIntent?.id === 'question'
      ? 'Procurar minha dúvida'
      : selectedIntent?.id === 'explore'
        ? 'Ver as obras'
        : 'Escolha uma opção acima'

  return (
    <main className="ves-page ves-brand-page min-h-screen pb-12">
      <div className="ves-container max-w-2xl pb-12 pt-7">
        {(!isNewAccount || isReplay) && (
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="mb-5 flex min-h-11 items-center gap-2 rounded-vesSm px-2 text-sm font-semibold text-sage-800 hover:bg-sage-100 dark:text-sage-300 dark:hover:bg-sage-950"
          >
            <ArrowLeft size={20} aria-hidden="true" />
            Voltar ao início
          </button>
        )}

        <section className="ves-horizon-panel rounded-vesLg border border-line p-6 shadow-editorial sm:p-8 dark:border-night-line">
          <div className="relative z-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-white/65 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10">
              <VeredaLogo size={46} />
            </div>
            <p className="ves-eyebrow mt-6">{isNewAccount ? 'E-mail confirmado · bem-vindo' : 'Sua orientação'}</p>
            <h1 className="ves-heading mt-2 max-w-xl text-[2.15rem] leading-[1.08] sm:text-[2.35rem]">
              O que você quer fazer primeiro?
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg dark:text-night-muted">
              Escolha o que parece mais útil agora. Você pode mudar de ideia e explorar outro caminho a qualquer momento.
            </p>
          </div>
        </section>

        <fieldset className="mt-7 space-y-3">
          <legend className="sr-only">Escolha seu primeiro caminho no Vereda</legend>
          {INTENTIONS.map((option) => (
            <Choice
              key={option.id}
              icon={option.icon}
              selected={intention === option.id}
              onClick={() => setIntention(option.id)}
              title={option.label}
              description={option.description}
            />
          ))}
        </fieldset>

        {selectedIntent?.id === 'foundation' && recommendation && (
          <Card className="mt-5 border-sage-200 bg-sage-50/80 p-5 shadow-sm dark:border-sage-900 dark:bg-sage-950/35">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sage-700 dark:text-sage-300">Nossa sugestão para começar</p>
            <p className="mt-2 font-display text-xl font-semibold text-ink dark:text-night-ink">{recommendation.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">
              É a porta de entrada mais direta para os fundamentos. A sugestão só organiza seu primeiro passo — nenhuma outra obra fica bloqueada.
            </p>
          </Card>
        )}

        <p className="mt-5 text-sm leading-relaxed text-muted dark:text-night-muted">
          O Vereda leva você às fontes e ajuda a retomar de onde parou; ele não responde no lugar das obras.
        </p>

        {error && (
          <p role="alert" className="mt-5 rounded-vesSm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </p>
        )}

        <Button
          onClick={finish}
          disabled={!selectedIntent || foundationWaiting}
          loading={finishing}
          className="mt-6 w-full sm:w-auto"
        >
          {ctaLabel}
          {!finishing && !foundationWaiting && <ArrowRight size={19} aria-hidden="true" />}
        </Button>
      </div>
    </main>
  )
}

function Choice({ icon: Icon, selected, onClick, title, description }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-20 w-full items-start gap-4 rounded-vesMd border p-5 text-left shadow-sm transition-colors ${
        selected
          ? 'border-sage-700 bg-sage-50 ring-2 ring-sage-500/20 dark:border-sage-300 dark:bg-sage-950/35'
          : 'border-line bg-surface/90 hover:border-sage-400 hover:bg-sage-50/40 dark:border-night-line dark:bg-night-surface/90 dark:hover:border-sage-800'
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-sage-700 text-white dark:bg-sage-300 dark:text-sage-950' : 'bg-sage-50 text-sage-800 dark:bg-night dark:text-sage-300'}`}>
        {selected ? <Check size={18} aria-hidden="true" /> : <Icon size={19} aria-hidden="true" />}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-lg font-semibold text-ink dark:text-night-ink">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-muted dark:text-night-muted">{description}</span>
      </span>
    </button>
  )
}
