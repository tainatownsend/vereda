import { ArrowRight, BookOpen, BookPlus, Bookmark, Check, Compass, Search, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { VeredaLogo } from '@/components/ui'
import { useAuthStore } from '@/store'

const WORKS = [
  'O Livro dos Espíritos',
  'O Livro dos Médiuns',
  'O Evangelho Segundo o Espiritismo',
  'O Céu e o Inferno',
  'A Gênese',
]

const FAQ = [
  {
    question: 'Preciso seguir a ordem dos livros?',
    answer: 'Não. O Vereda mostra uma sequência sugerida para quem quer uma referência, mas todas as obras continuam disponíveis para você escolher livremente.',
  },
  {
    question: 'A pesquisa responde perguntas sobre Espiritismo?',
    answer: 'A pesquisa leva você a passagens das próprias obras. O Vereda organiza o acesso ao texto, sem responder no lugar das fontes.',
  },
  {
    question: 'Por que criar uma conta?',
    answer: 'A conta permite retomar a leitura de onde você parou, guardar passagens e manter suas preferências quando voltar ao Vereda.',
  },
  {
    question: 'O Vereda é pago?',
    answer: 'Não. O projeto é gratuito, sem anúncios e sem fins lucrativos.',
  },
]

export default function LandingPage() {
  const user = useAuthStore((state) => state.user)
  const primaryHref = user ? '/home' : '/criar-conta'
  const primaryLabel = user ? 'Abrir o Vereda' : 'Criar conta'

  return (
    <main className="min-h-screen overflow-x-hidden bg-canvas text-ink dark:bg-night dark:text-night-ink">
      <header className="border-b border-line/70 bg-canvas/90 backdrop-blur dark:border-night-line dark:bg-night/90">
        <div className="ves-container flex min-h-20 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3" aria-label="Vereda — início">
            <VeredaLogo size={48} />
            <div>
              <p className="font-display text-xl font-semibold tracking-[0.12em] text-ink dark:text-night-ink">VEREDA</p>
              <p className="text-[11px] font-medium text-muted dark:text-night-muted">seu caminho de aprendizado</p>
            </div>
          </Link>

          <nav className="flex items-center gap-2" aria-label="Acesso">
            {!user && (
              <Link
                to="/entrar"
                className="flex min-h-11 items-center rounded-vesSm px-3 text-sm font-semibold text-sage-800 hover:bg-sage-100 dark:text-sage-300 dark:hover:bg-sage-950"
              >
                Entrar
              </Link>
            )}
            <Link
              to={primaryHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-vesSm bg-sage-800 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sage-900 dark:bg-sage-300 dark:text-sage-950"
            >
              {primaryLabel}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="ves-brand-page relative border-b border-line/70 py-14 sm:py-20 lg:py-24 dark:border-night-line">
        <div className="ves-container grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div>
            <p className="ves-eyebrow">Estudo no seu ritmo</p>
            <h1 className="ves-heading mt-4 max-w-3xl text-[2.65rem] leading-[1.02] sm:text-[3.6rem] lg:text-[4.35rem]">
              Um caminho simples para ler, estudar e refletir.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl dark:text-night-muted">
              Leia as obras fundamentais do Espiritismo em trechos confortáveis, encontre passagens por tema e volte sempre do ponto onde parou.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={primaryHref}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-vesMd bg-sage-800 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-sage-900 dark:bg-sage-300 dark:text-sage-950"
              >
                {primaryLabel}
                <ArrowRight size={19} aria-hidden="true" />
              </Link>
              {!user && (
                <Link
                  to="/entrar"
                  className="inline-flex min-h-14 items-center justify-center rounded-vesMd border border-line bg-surface px-6 py-3 text-base font-semibold text-ink hover:bg-surface-soft dark:border-night-line dark:bg-night-surface dark:text-night-ink"
                >
                  Já tenho uma conta
                </Link>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-sm font-medium text-ink/80 dark:text-night-ink/80">
              {['Gratuito', 'Sem anúncios', 'Sem sequência obrigatória', 'Sempre do ponto onde parou'].map((item) => (
                <span key={item} className="rounded-full border border-line/70 bg-surface/70 px-3 py-2 dark:border-night-line dark:bg-night-surface/70">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="ves-horizon-panel relative min-h-[390px] overflow-hidden rounded-[2.25rem] border border-line p-8 shadow-editorial dark:border-night-line sm:min-h-[450px]">
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/70 bg-white/65 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10">
                <VeredaLogo size={80} />
              </div>
              <div className="mt-20 max-w-md rounded-vesLg border border-white/60 bg-surface/75 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-night-surface/75">
                <p className="ves-eyebrow">Seu próximo passo</p>
                <p className="mt-2 font-display text-2xl font-semibold leading-tight">Você não precisa saber por onde começar.</p>
                <p className="mt-3 text-sm leading-relaxed text-muted dark:text-night-muted">O Vereda pode sugerir uma primeira direção, mas você continua livre para explorar todas as obras.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="how-heading">
        <div className="ves-container">
          <p className="ves-eyebrow">Como funciona</p>
          <h2 id="how-heading" className="ves-heading mt-2 max-w-2xl text-[2.25rem] sm:text-[2.75rem]">Menos aplicativo para aprender. Mais espaço para estudar.</h2>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            <FeatureCard icon={Compass} number="1" title="Escolha um caminho">Comece pelos fundamentos, por uma pergunta ou por uma obra específica.</FeatureCard>
            <FeatureCard icon={BookOpen} number="2" title="Leia em trechos">O texto é apresentado em partes confortáveis, com fonte ajustável e modo escuro.</FeatureCard>
            <FeatureCard icon={Bookmark} number="3" title="Volte quando quiser">Seu ponto de leitura e passagens salvas ficam disponíveis para continuar depois.</FeatureCard>
          </div>
        </div>
      </section>

      <section className="border-y border-line/70 bg-surface/55 py-16 sm:py-20 dark:border-night-line dark:bg-night-surface/35" aria-labelledby="library-heading">
        <div className="ves-container grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <p className="ves-eyebrow">Biblioteca atual</p>
            <h2 id="library-heading" className="ves-heading mt-2 text-[2.25rem] sm:text-[2.75rem]">Cinco obras fundamentais, com uma sequência opcional.</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted dark:text-night-muted">
              Os números ajudam quem quer uma referência de percurso. Eles não bloqueiam nenhuma escolha e não transformam estudo em competição.
            </p>
          </div>

          <ol className="space-y-3">
            {WORKS.map((work, index) => (
              <li key={work} className="flex min-h-16 items-center gap-4 rounded-vesMd border border-line bg-canvas/75 px-4 py-3 shadow-sm dark:border-night-line dark:bg-night/50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sage-300 bg-sage-50 font-display font-semibold text-sage-800 dark:border-sage-800 dark:bg-sage-950 dark:text-sage-300">{index + 1}</span>
                <span className="font-display text-lg font-semibold">{work}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="why-heading">
        <div className="ves-container">
          <p className="ves-eyebrow">Por que o Vereda</p>
          <h2 id="why-heading" className="ves-heading mt-2 max-w-2xl text-[2.25rem] sm:text-[2.75rem]">Orientação sem substituir as obras.</h2>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ValueCard icon={Search} title="Busca nas fontes">Pesquise uma dúvida e abra passagens diretamente nas obras.</ValueCard>
            <ValueCard icon={Check} title="Sem cobrança">Nada de metas obrigatórias, culpa por pausas ou linguagem de produtividade.</ValueCard>
            <ValueCard icon={ShieldCheck} title="Conta com propósito">A conta existe para preservar leitura, preferências e trechos salvos.</ValueCard>
            <ValueCard icon={Compass} title="Liberdade para explorar">A sequência sugerida orienta quem precisa dela e sai do caminho de quem não precisa.</ValueCard>
          </div>
        </div>
      </section>

      <section className="ves-warm-panel border-y border-line/70 py-16 sm:py-20 dark:border-night-line" aria-labelledby="community-heading">
        <div className="ves-container max-w-3xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface/80 text-sage-800 shadow-sm dark:bg-night-surface/80 dark:text-sage-300">
            <BookPlus size={24} aria-hidden="true" />
          </div>
          <p className="ves-eyebrow mt-5">Uma biblioteca que pode crescer</p>
          <h2 id="community-heading" className="ves-heading mt-2 text-[2.25rem] sm:text-[2.75rem]">Diga o que você gostaria de estudar depois.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted dark:text-night-muted">
            Pessoas com conta podem sugerir uma obra ou votar em pedidos que já existem. Os votos ajudam a mostrar interesse, mas não garantem inclusão: cada título ainda passa por revisão de fonte, direitos e preparação editorial.
          </p>
          <Link
            to={user ? '/sugerir-obra' : '/criar-conta'}
            className="mt-7 inline-flex min-h-14 items-center justify-center gap-2 rounded-vesMd border border-sage-300 bg-surface/85 px-6 py-3 text-base font-semibold text-sage-900 shadow-sm hover:bg-sage-50 dark:border-sage-800 dark:bg-night-surface/85 dark:text-sage-200 dark:hover:bg-sage-950"
          >
            <BookPlus size={19} aria-hidden="true" />
            {user ? 'Sugerir ou votar em uma obra' : 'Criar conta para sugerir uma obra'}
          </Link>
        </div>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="faq-heading">
        <div className="ves-container max-w-3xl">
          <p className="ves-eyebrow">Perguntas frequentes</p>
          <h2 id="faq-heading" className="ves-heading mt-2 text-[2.25rem] sm:text-[2.75rem]">Antes de começar</h2>

          <div className="mt-8 divide-y divide-line rounded-vesLg border border-line bg-surface px-5 shadow-sm dark:divide-night-line dark:border-night-line dark:bg-night-surface sm:px-7">
            {FAQ.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="cursor-pointer list-none pr-6 font-display text-lg font-semibold marker:hidden">
                  {item.question}
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base dark:text-night-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20 pt-4">
        <div className="ves-container">
          <div className="ves-horizon-panel rounded-[2rem] border border-line p-7 text-center shadow-editorial dark:border-night-line sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface/80 shadow-sm dark:bg-night-surface/80">
              <VeredaLogo size={54} />
            </div>
            <h2 className="ves-heading mx-auto mt-5 max-w-xl text-[2.1rem]">Seu primeiro passo pode ser simples.</h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted dark:text-night-muted">Crie sua conta, confirme seu e-mail e o Vereda apresenta o caminho antes de pedir que você escolha uma leitura.</p>
            <Link
              to={primaryHref}
              className="mt-7 inline-flex min-h-14 items-center justify-center gap-2 rounded-vesMd bg-sage-800 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-sage-900 dark:bg-sage-300 dark:text-sage-950"
            >
              {primaryLabel}
              <ArrowRight size={19} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line/70 py-8 text-center text-sm text-muted dark:border-night-line dark:text-night-muted">
        <div className="ves-container">Vereda · gratuito, sem anúncios e sem fins lucrativos.</div>
      </footer>
    </main>
  )
}

function FeatureCard({ icon: Icon, number, title, children }) {
  return (
    <article className="rounded-vesLg border border-line bg-surface p-6 shadow-sm dark:border-night-line dark:bg-night-surface">
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300"><Icon size={20} aria-hidden="true" /></div>
        <span className="font-display text-2xl font-semibold text-gold-700 dark:text-gold-400">{number}</span>
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base dark:text-night-muted">{children}</p>
    </article>
  )
}

function ValueCard({ icon: Icon, title, children }) {
  return (
    <article className="rounded-vesLg border border-line bg-surface/80 p-5 dark:border-night-line dark:bg-night-surface/80">
      <Icon size={21} className="text-sage-700 dark:text-sage-300" aria-hidden="true" />
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">{children}</p>
    </article>
  )
}
