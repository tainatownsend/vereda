import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useBooks } from '@/hooks'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { Button, Card, PageLoader } from '@/components/ui'

const FAMILIARITY = [
  { id: 'new', label: 'Estou começando agora', description: 'Quero uma primeira orientação simples.' },
  { id: 'some', label: 'Já conheço um pouco', description: 'Já li ou ouvi falar de alguns temas.' },
  { id: 'experienced', label: 'Já estudo há algum tempo', description: 'Quero encontrar um caminho sem perder liberdade.' },
]

const INTENTIONS = [
  { id: 'foundation', label: 'Quero conhecer a Doutrina', description: 'Começar pelos fundamentos e pelas perguntas centrais.', titleIncludes: 'Espíritos' },
  { id: 'meaning', label: 'Quero compreender melhor a vida', description: 'Explorar questões sobre existência, escolhas e vida espiritual.', titleIncludes: 'Espíritos' },
  { id: 'gospel', label: 'Quero estudar os ensinamentos morais', description: 'Ler a abordagem espírita dos ensinamentos do Evangelho.', titleIncludes: 'Evangelho' },
  { id: 'mediumship', label: 'Quero entender mediunidade', description: 'Ir à obra dedicada ao estudo da mediunidade.', titleIncludes: 'Médiuns' },
  { id: 'question', label: 'Tenho uma dúvida específica', description: 'Começar pela busca por temas e passagens das obras.', route: '/descobrir' },
  { id: 'explore', label: 'Só quero explorar', description: 'Conhecer as obras antes de escolher.', route: '/biblioteca' },
]

export default function GettingStartedPage() {
  const navigate = useNavigate()
  const books = useBooks()
  const onboarding = useOnboardingStore()
  const [step, setStep] = useState(1)
  const [familiarity, setFamiliarity] = useState(onboarding.familiarity || '')
  const [intention, setIntention] = useState(onboarding.intention || '')

  const selectedIntent = INTENTIONS.find((item) => item.id === intention)

  const recommendation = useMemo(() => {
    if (!selectedIntent?.titleIncludes) return null
    return books.find((book) =>
      book.title?.toLocaleLowerCase('pt-BR').includes(
        selectedIntent.titleIncludes.toLocaleLowerCase('pt-BR'),
      ),
    ) || books[0] || null
  }, [books, selectedIntent])

  if (!books.length) return <PageLoader label="Preparando seu primeiro passo" />

  const finish = () => {
    if (!selectedIntent) return

    onboarding.setChoice({
      familiarity,
      intention,
      recommendedBookId: recommendation?.id || null,
    })
    onboarding.complete()

    if (selectedIntent.route) {
      navigate(selectedIntent.route)
      return
    }

    if (recommendation) navigate(`/livro/${recommendation.id}`)
  }

  return (
    <main className="ves-page min-h-screen pb-12">
      <div className="ves-container pt-7">
        <button
          type="button"
          onClick={() => (step === 1 ? navigate('/home') : setStep(1))}
          className="flex min-h-12 items-center gap-2 rounded-vesSm px-2 text-sm font-semibold text-sage-800 hover:bg-sage-100 dark:text-sage-300 dark:hover:bg-sage-950"
        >
          <ArrowLeft size={20} aria-hidden="true" />
          {step === 1 ? 'Voltar ao início' : 'Voltar'}
        </button>
      </div>

      <div className="ves-container max-w-2xl pb-12 pt-7">
        <div className="flex h-14 w-14 items-center justify-center rounded-vesLg bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
          <Compass size={26} aria-hidden="true" />
        </div>

        <p className="ves-eyebrow mt-7">Comece com tranquilidade</p>
        <h1 className="ves-heading mt-2 text-[2.35rem] leading-[1.08]">
          {step === 1 ? 'Você não precisa conhecer o aplicativo.' : 'O que trouxe você até aqui?'}
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted dark:text-night-muted">
          {step === 1
            ? 'Duas escolhas rápidas ajudam o Vereda a indicar um primeiro caminho. Nada fica bloqueado e você pode mudar de ideia quando quiser.'
            : 'Escolha a opção que mais se aproxima do que você procura hoje.'}
        </p>

        {step === 1 ? (
          <fieldset className="mt-8 space-y-3">
            <legend className="mb-4 font-semibold text-ink dark:text-night-ink">
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
              onClick={() => setStep(2)}
              disabled={!familiarity}
              className="mt-6 w-full sm:w-auto"
            >
              Continuar
              <ArrowRight size={19} aria-hidden="true" />
            </Button>
          </fieldset>
        ) : (
          <fieldset className="mt-8 space-y-3">
            <legend className="sr-only">O que você procura no Vereda?</legend>
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
              <Card className="mt-6 border-sage-200 bg-sage-50 p-5 dark:border-sage-900 dark:bg-sage-950/35">
                <p className="text-sm font-semibold text-sage-800 dark:text-sage-300">Uma boa primeira direção</p>
                <div className="mt-3 flex items-start gap-3">
                  <BookOpen size={22} className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-ink dark:text-night-ink">{recommendation.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">
                      Esta indicação só organiza seu primeiro passo. A leitura da obra continua sendo a fonte principal.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Button
              onClick={finish}
              disabled={!intention}
              className="mt-6 w-full sm:w-auto"
            >
              {selectedIntent?.route ? 'Seguir por este caminho' : 'Conhecer esta obra'}
              <ArrowRight size={19} aria-hidden="true" />
            </Button>
          </fieldset>
        )}
      </div>
    </main>
  )
}

function Choice({ selected, onClick, title, description }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-20 w-full items-start gap-4 rounded-vesMd border p-5 text-left transition-colors ${
        selected
          ? 'border-sage-700 bg-sage-50 ring-2 ring-sage-500/20 dark:border-sage-300 dark:bg-sage-950/35'
          : 'border-line bg-surface hover:border-sage-400 dark:border-night-line dark:bg-night-surface'
      }`}
    >
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-sage-700 bg-sage-700 text-white dark:border-sage-300 dark:bg-sage-300 dark:text-sage-950' : 'border-line dark:border-night-line'}`}>
        {selected && <Check size={15} aria-hidden="true" />}
      </span>
      <span>
        <span className="block font-semibold text-ink dark:text-night-ink">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-muted dark:text-night-muted">{description}</span>
      </span>
    </button>
  )
}
