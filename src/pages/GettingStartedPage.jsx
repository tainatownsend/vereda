import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, Compass, Map } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useBooks } from '@/hooks'
import { useAuthStore } from '@/store'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { Button, Card, VeredaLogo } from '@/components/ui'

const TOTAL_STEPS = 4

const FAMILIARITY = [
  { id: 'new', label: 'Estou começando agora', description: 'Quero uma primeira orientação simples.' },
  { id: 'some', label: 'Já conheço um pouco', description: 'Já li ou ouvi falar de alguns temas.' },
  { id: 'experienced', label: 'Já estudo há algum tempo', description: 'Quero encontrar um caminho sem perder liberdade.' },
]

const INTENTIONS = [
  {
    id: 'foundation',
    label: 'Quero começar do início',
    description: 'Mostre uma boa primeira obra para conhecer os fundamentos.',
    titleIncludes: 'Espíritos',
  },
  {
    id: 'question',
    label: 'Tenho uma dúvida específica',
    description: 'Quero procurar um assunto e ler o que as obras dizem sobre ele.',
    route: '/descobrir',
  },
  {
    id: 'explore',
    label: 'Quero escolher uma obra',
    description: 'Prefiro conhecer os livros disponíveis antes de decidir.',
    route: '/biblioteca',
  },
]

export default function GettingStartedPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const books = useBooks()
  const onboarding = useOnboardingStore()
  const completeFirstTimeOnboarding = useAuthStore((state) => state.completeFirstTimeOnboarding)
  const [step, setStep] = useState(1)
  const [familiarity, setFamiliarity] = useState(onboarding.familiarity || '')
  const [intention, setIntention] = useState(onboarding.intention || '')
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState('')

  const isNewAccount = searchParams.get('novo') === '1'
  const selectedIntent = INTENTIONS.find((item) => item.id === intention)

  const recommendation = useMemo(() => {
    if (!selectedIntent?.titleIncludes) return null
    return books.find((book) =>
      book.title?.toLocaleLowerCase('pt-BR').includes(
        selectedIntent.titleIncludes.toLocaleLowerCase('pt-BR'),
      ),
    ) || books[0] || null
  }, [books, selectedIntent])

  const finish = async () => {
    if (!selectedIntent || finishing) return

    setFinishing(true)
    setError('')

    try {
      onboarding.setChoice({
        familiarity,
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
      setError('Não foi possível concluir esta etapa agora. Tente novamente.')
      setFinishing(false)
    }
  }

  const goBack = () => {
    if (step > 1) {
      setStep((current) => current - 1)
      return
    }

    navigate('/home')
  }

  return (
    <main className="ves-page ves-brand-page min-h-screen pb-12">
      <div className="ves-container pt-7">
        {(!isNewAccount || step > 1) && (
          <button
            type="button"
            onClick={goBack}
            className="flex min-h-12 items-center gap-2 rounded-vesSm px-2 text-sm font-semibold text-sage-800 hover:bg-sage-100 dark:text-sage-300 dark:hover:bg-sage-950"
          >
            <ArrowLeft size={20} aria-hidden="true" />
            {step === 1 ? 'Voltar ao início' : 'Voltar'}
          </button>
        )}
      </div>

      <div className="ves-container max-w-2xl pb-12 pt-5">
        <section className="ves-horizon-panel rounded-vesLg border border-line p-6 shadow-editorial sm:p-8 dark:border-night-line">
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-white/65 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10">
                <VeredaLogo size={46} />
              </div>
              <span className="rounded-full border border-line/70 bg-surface/70 px-3 py-1 text-xs font-semibold text-muted shadow-sm dark:border-night-line dark:bg-night-surface/70 dark:text-night-muted">
                passo {step} de {TOTAL_STEPS}
              </span>
            </div>

            <p className="ves-eyebrow mt-7">
              {step === 1 && isNewAccount ? 'E-mail confirmado' : step <= 2 ? 'Antes da primeira leitura' : 'Seu primeiro caminho'}
            </p>
            <h1 className="ves-heading mt-2 max-w-xl text-[2.15rem] leading-[1.08] sm:text-[2.35rem]">
              {stepTitle(step)}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg dark:text-night-muted">
              {stepCopy(step)}
            </p>
          </div>
        </section>

        {step === 1 && (
          <section className="mt-8" aria-labelledby="welcome-principles-heading">
            <h2 id="welcome-principles-heading" className="sr-only">Como o Vereda funciona</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <IntroCard icon={BookOpen} title="Fonte primeiro">As obras continuam no centro do estudo.</IntroCard>
              <IntroCard icon={Compass} title="Seu ritmo">Não há meta diária obrigatória nem cobrança.</IntroCard>
              <IntroCard icon={Map} title="Sempre orientado">O Vereda guarda onde você parou e sugere o próximo passo.</IntroCard>
            </div>
            <StepButton onClick={() => setStep(2)}>Entendi, continuar</StepButton>
          </section>
        )}

        {step === 2 && (
          <section className="mt-8 space-y-4" aria-labelledby="study-intro-heading">
            <h2 id="study-intro-heading" className="sr-only">Uma introdução ao estudo</h2>
            <Card className="p-5 sm:p-6">
              <p className="font-display text-lg font-semibold text-ink dark:text-night-ink">
                Você não precisa compreender tudo de uma vez.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base dark:text-night-muted">
                O estudo pode crescer por comparação, leitura e reflexão. Quando uma ideia despertar uma pergunta, você pode procurar o tema nas próprias obras e voltar ao seu caminho depois.
              </p>
            </Card>
            <Card className="border-sage-200 bg-sage-50/75 p-5 sm:p-6 dark:border-sage-900 dark:bg-sage-950/30">
              <p className="font-display text-lg font-semibold text-ink dark:text-night-ink">
                A sequência é uma orientação, não uma obrigação.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base dark:text-night-muted">
                Você pode começar pelos fundamentos, pesquisar uma dúvida específica ou escolher livremente uma obra. O Vereda ajuda a encontrar o texto; não substitui a fonte.
              </p>
            </Card>
            <StepButton onClick={() => setStep(3)}>Encontrar meu primeiro caminho</StepButton>
          </section>
        )}

        {step === 3 && (
          <fieldset className="mt-8 space-y-3">
            <legend className="mb-4 font-display text-lg font-semibold text-ink dark:text-night-ink">
              Você já estudou Espiritismo antes?
            </legend>
            {FAMILIARITY.map((option) => (
              <Choice
                key={option.id}
                selected={familiarity === option.id}
                onClick={() => setFamiliarity(option.id)}
                title={option.label}
                description={option.description}
              />
            ))}

            <Button
              onClick={() => setStep(4)}
              disabled={!familiarity}
              className="mt-6 w-full sm:w-auto"
            >
              Continuar
              <ArrowRight size={19} aria-hidden="true" />
            </Button>
          </fieldset>
        )}

        {step === 4 && (
          <fieldset className="mt-8 space-y-3">
            <legend className="sr-only">O que você quer fazer primeiro?</legend>
            {INTENTIONS.map((option) => (
              <Choice
                key={option.id}
                selected={intention === option.id}
                onClick={() => setIntention(option.id)}
                title={option.label}
                description={option.description}
              />
            ))}

            {selectedIntent?.titleIncludes && recommendation && (
              <Card className="mt-6 border-sage-200 bg-sage-50/80 p-5 shadow-sm dark:border-sage-900 dark:bg-sage-950/35">
                <p className="text-sm font-semibold text-sage-800 dark:text-sage-300">Uma boa primeira direção</p>
                <div className="mt-3 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-sage-800 shadow-sm dark:bg-night-surface dark:text-sage-300">
                    <BookOpen size={20} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold text-ink dark:text-night-ink">{recommendation.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">
                      Esta indicação só organiza seu primeiro passo. Você continua livre para explorar todas as obras.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {error && (
              <p role="alert" className="mt-5 rounded-vesSm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                {error}
              </p>
            )}

            <Button
              onClick={finish}
              disabled={!intention}
              loading={finishing}
              className="mt-6 w-full sm:w-auto"
            >
              {selectedIntent?.route ? 'Seguir por este caminho' : 'Conhecer esta obra'}
              {!finishing && <ArrowRight size={19} aria-hidden="true" />}
            </Button>
          </fieldset>
        )}
      </div>
    </main>
  )
}

function stepTitle(step) {
  if (step === 1) return 'Bem-vindo ao Vereda.'
  if (step === 2) return 'Um estudo que cresce por etapas.'
  if (step === 3) return 'Vamos ajustar a primeira orientação.'
  return 'O que você quer fazer primeiro?'
}

function stepCopy(step) {
  if (step === 1) return 'Aqui você encontra as obras fundamentais do Espiritismo em uma leitura confortável, com liberdade para pausar, refletir e voltar quando quiser.'
  if (step === 2) return 'O Vereda organiza o caminho para que você possa estudar sem precisar aprender o aplicativo antes.'
  if (step === 3) return 'Uma pergunta rápida ajuda a deixar a primeira sugestão mais adequada ao ponto em que você está.'
  return 'Escolha a opção que parece mais simples para você agora. Nada fica bloqueado depois.'
}

function IntroCard({ icon: Icon, title, children }) {
  return (
    <Card className="p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
        <Icon size={20} aria-hidden="true" />
      </div>
      <p className="mt-4 font-display text-lg font-semibold text-ink dark:text-night-ink">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">{children}</p>
    </Card>
  )
}

function StepButton({ onClick, children }) {
  return (
    <Button onClick={onClick} className="mt-6 w-full sm:w-auto">
      {children}
      <ArrowRight size={19} aria-hidden="true" />
    </Button>
  )
}

function Choice({ selected, onClick, title, description }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-20 w-full items-start gap-4 rounded-vesMd border p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 ${
        selected
          ? 'border-sage-700 bg-sage-50 ring-2 ring-sage-500/20 dark:border-sage-300 dark:bg-sage-950/35'
          : 'border-line bg-surface/90 hover:border-sage-400 hover:shadow-editorial dark:border-night-line dark:bg-night-surface/90'
      }`}
    >
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-sage-700 bg-sage-700 text-white dark:border-sage-300 dark:bg-sage-300 dark:text-sage-950' : 'border-line bg-canvas dark:border-night-line dark:bg-night'}`}>
        {selected && <Check size={15} aria-hidden="true" />}
      </span>
      <span>
        <span className="block font-display text-lg font-semibold text-ink dark:text-night-ink">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-muted dark:text-night-muted">{description}</span>
      </span>
    </button>
  )
}
