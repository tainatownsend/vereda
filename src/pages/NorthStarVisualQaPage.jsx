import { useSearchParams } from 'react-router-dom'
import {
  Bell,
  Bookmark,
  BookOpen,
  ChevronLeft,
  Heart,
  Headphones,
  FileText,
  Home,
  Leaf,
  MoreHorizontal,
  Quote,
  Share2,
  UserRound,
  UsersRound,
} from 'lucide-react'

import northStarLandscape from '@/assets/northstar-landscape.svg'
import { BookCover, EditorialCard, ProgressLine } from '@/components/northstar/NorthStarUI'

const BOOKS = [
  { id: 1, title: 'O Livro dos Espíritos', author: 'Allan Kardec', color: '#315E67', progress: 100 },
  { id: 2, title: 'O Livro dos Médiuns', author: 'Allan Kardec', color: '#AA8A59', progress: 75 },
  { id: 3, title: 'O Evangelho segundo o Espiritismo', author: 'Allan Kardec', color: '#244E5C', progress: 60 },
  { id: 4, title: 'O Céu e o Inferno', author: 'Allan Kardec', color: '#854D37', progress: 30 },
  { id: 5, title: 'A Gênese', author: 'Allan Kardec', color: '#67795A', progress: 0 },
]

const GROUPS = [
  ['Estudo Sistematizado', 'O Evangelho segundo o Espiritismo', '32 membros'],
  ['Grupo da Caridade', 'Estudo e prática', '713 membros'],
  ['Família Espírita', 'Trocas e acolhimento', '186 membros'],
]

const SCREEN_MAP = {
  home: HomePreview,
  library: LibraryPreview,
  reflection: ReflectionPreview,
  reader: ReaderPreview,
  community: CommunityPreview,
}

export default function NorthStarVisualQaPage() {
  const [searchParams] = useSearchParams()
  const requestedScreen = searchParams.get('screen')
  const SingleScreen = SCREEN_MAP[requestedScreen]

  if (SingleScreen) {
    return (
      <main className="min-h-screen bg-[#e7e0d4] p-6">
        <div className="mx-auto w-fit" data-qa-screen={requestedScreen}>
          <Phone><SingleScreen /></Phone>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#e7e0d4] px-8 py-10">
      <header className="mx-auto mb-8 max-w-[104rem]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage-700">Vereda · Visual QA</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">North Star canonical screens</h1>
        <p className="mt-2 text-sm text-muted">Flat render for source-of-truth comparison. QA-only build surface.</p>
      </header>

      <section className="mx-auto grid max-w-[104rem] grid-cols-1 justify-items-center gap-8 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <PreviewColumn label="Home"><Phone><HomePreview /></Phone></PreviewColumn>
        <PreviewColumn label="Biblioteca"><Phone><LibraryPreview /></Phone></PreviewColumn>
        <PreviewColumn label="Reflexão"><Phone><ReflectionPreview /></Phone></PreviewColumn>
        <PreviewColumn label="Reader"><Phone><ReaderPreview /></Phone></PreviewColumn>
        <PreviewColumn label="Comunidade"><Phone><CommunityPreview /></Phone></PreviewColumn>
      </section>
    </main>
  )
}

function PreviewColumn({ label, children }) {
  return (
    <div>
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-sage-800">{label}</p>
      {children}
    </div>
  )
}

function Phone({ children }) {
  return (
    <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[34px] border-[7px] border-[#2c302b] bg-canvas shadow-[0_28px_65px_rgba(52,49,42,0.28)]">
      <div className="absolute left-1/2 top-2 z-50 h-6 w-24 -translate-x-1/2 rounded-full bg-[#171a17]" />
      <div className="h-full overflow-hidden bg-canvas">{children}</div>
    </div>
  )
}

function StatusBar() {
  return (
    <div className="flex h-11 items-end justify-between px-6 pb-1 text-[11px] font-semibold text-ink">
      <span>9:41</span>
      <span className="tracking-[0.08em]">••• ◒</span>
    </div>
  )
}

function HomePreview() {
  const book = BOOKS[2]
  return (
    <div className="flex h-full flex-col bg-canvas text-ink">
      <StatusBar />
      <div className="flex-1 overflow-hidden px-5 pt-5">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-[1.92rem] font-semibold tracking-[0.06em] text-[#30452f]">VEREDA</p>
            <p className="mt-2 max-w-[17rem] text-[14px] leading-relaxed text-ink/80">Bem-vindo à sua jornada<br />de estudo que transforma.</p>
          </div>
          <div className="northstar-icon-button"><Bell size={20} strokeWidth={1.7} /></div>
        </header>

        <EditorialCard className="northstar-home-quote mt-6 overflow-hidden p-4">
          <div className="relative z-10 flex gap-2">
            <Quote size={17} className="mt-1 shrink-0 text-sage-700" />
            <div>
              <p className="font-display text-[1rem] leading-[1.5]">“A maior caridade que podemos fazer pela Doutrina Espírita é a sua divulgação.”</p>
              <p className="mt-2 text-[10px] text-muted">Allan Kardec</p>
            </div>
          </div>
        </EditorialCard>

        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Continuar estudando</h2>
            <span className="text-[10px] text-sage-700">Ver tudo</span>
          </div>
          <EditorialCard className="p-3">
            <div className="flex gap-3">
              <BookCover book={book} size="sm" color={book.color} />
              <div className="min-w-0 flex-1 pt-1">
                <p className="font-display text-[0.95rem] font-semibold leading-tight">{book.title}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">Capítulo V · Bem-aventurados os misericordiosos</p>
                <div className="mt-4 flex items-center gap-2"><ProgressLine value={60} className="flex-1" /><span className="text-[10px] font-semibold text-sage-700">60%</span></div>
              </div>
            </div>
          </EditorialCard>
        </section>

        <section className="mt-5">
          <h2 className="text-sm font-semibold">De onde você quer começar?</h2>
          <div className="mt-2 grid grid-cols-4 gap-2">
            <Quick icon={BookOpen} label="Livros" />
            <Quick icon={Leaf} label="Reflexões" />
            <Quick icon={FileText} label="Resumos" />
            <Quick icon={Headphones} label="Audiobooks" />
          </div>
        </section>

        <section className="mt-5">
          <h2 className="text-sm font-semibold">Plano de estudo</h2>
          <EditorialCard className="mt-2 p-3">
            <div className="flex items-center gap-3">
              <BookCover book={book} size="sm" color="#718061" />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-sage-700">Estudo Sistematizado</p>
                <p className="mt-1 text-xs font-semibold">{book.title}</p>
                <div className="mt-3 flex items-center gap-2"><ProgressLine value={33} className="flex-1" /><span className="text-[10px] font-semibold text-sage-700">33%</span></div>
              </div>
            </div>
          </EditorialCard>
        </section>
      </div>
      <PreviewNav active="Início" />
    </div>
  )
}

function LibraryPreview() {
  return (
    <div className="flex h-full flex-col bg-canvas text-ink">
      <StatusBar />
      <div className="flex-1 overflow-hidden px-5 pt-4">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-[1.75rem] font-semibold">Biblioteca</h1>
          <MoreHorizontal size={20} />
        </header>
        <div className="mt-5 grid grid-cols-2 border-b border-line">
          <div className="relative py-3 text-center text-xs font-medium text-sage-800">Básicas<span className="absolute inset-x-5 bottom-[-1px] h-[2px] bg-sage-600" /></div>
          <div className="py-3 text-center text-xs text-muted">Complementares</div>
        </div>
        <div className="mt-4 space-y-2">
          {BOOKS.map((book) => (
            <EditorialCard key={book.id} className="p-3">
              <div className="flex items-center gap-3">
                <BookCover book={book} size="sm" color={book.color} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[0.92rem] font-semibold leading-tight">{book.title}</p>
                  <p className="mt-1 text-[10px] text-muted">{book.author}</p>
                  <div className="mt-3 flex items-center gap-2"><ProgressLine value={book.progress} className="flex-1" /><span className="w-8 text-right text-[10px] font-semibold text-sage-700">{book.progress}%</span></div>
                </div>
              </div>
            </EditorialCard>
          ))}
        </div>
      </div>
      <PreviewNav active="Estudos" />
    </div>
  )
}

function ReflectionPreview() {
  return (
    <div className="flex h-full flex-col bg-canvas text-ink">
      <StatusBar />
      <div className="flex-1 overflow-hidden px-5 pt-4">
        <header className="flex items-center gap-3">
          <ChevronLeft size={21} />
          <h1 className="flex-1 font-display text-[1.3rem] font-semibold">Reflexão do dia</h1>
          <MoreHorizontal size={20} />
        </header>
        <div className="mt-4 overflow-hidden rounded-[18px] border border-line bg-sage-100">
          <img src={northStarLandscape} alt="" className="h-52 w-full object-cover" />
        </div>
        <EditorialCard className="mt-3 p-5">
          <div className="flex gap-3">
            <Quote size={19} className="mt-1 shrink-0 text-sage-700" />
            <div>
              <p className="font-display text-[1.17rem] leading-[1.55]">“Ninguém está bastante adiantado na vida para não aprender, nem tão simples e ignorante que não possa ensinar alguma coisa.”</p>
              <p className="mt-3 text-[10px] text-muted">Emmanuel</p>
            </div>
          </div>
        </EditorialCard>
        <section className="mt-5">
          <h2 className="text-sm font-semibold">Minha reflexão</h2>
          <div className="mt-2 min-h-20 rounded-[15px] border border-line bg-surface px-4 py-3 text-xs text-muted/70">Escreva sua reflexão...</div>
        </section>
      </div>
      <div className="flex h-[4.6rem] items-center justify-around border-t border-line bg-surface/95 px-8">
        <Share2 size={20} /><Heart size={21} fill="currentColor" /><Bookmark size={21} />
      </div>
    </div>
  )
}

function ReaderPreview() {
  return (
    <div className="flex h-full flex-col bg-canvas text-ink">
      <StatusBar />
      <header className="flex min-h-[4.3rem] items-center gap-3 border-b border-line/70 px-5">
        <ChevronLeft size={22} />
        <p className="min-w-0 flex-1 font-display text-sm font-semibold leading-tight">O Evangelho segundo<br />o Espiritismo</p>
        <MoreHorizontal size={21} />
      </header>
      <main className="flex-1 overflow-hidden px-6 pt-9">
        <p className="text-xs font-medium text-ink/80">Capítulo V</p>
        <h1 className="mt-2 font-display text-[1.85rem] font-semibold leading-[1.12]">Bem-aventurados os misericordiosos</h1>
        <article className="mt-7 font-display text-[17px] leading-[1.82]">
          <p className="mb-6"><strong>8.</strong> Bem-aventurados os misericordiosos, porque alcançarão misericórdia.</p>
          <p className="mb-6">A misericórdia é o complemento da brandura, porque aquele que não for misericordioso não poderá ser brando e pacífico.</p>
          <p>Ela consiste no esquecimento e perdão das ofensas.</p>
        </article>
      </main>
      <div className="flex h-[4.6rem] items-center justify-center gap-12 border-t border-line bg-surface/95">
        <span className="font-display text-lg font-semibold">A−</span>
        <span className="font-display text-lg font-semibold">A+</span>
        <Bookmark size={21} />
      </div>
    </div>
  )
}

function CommunityPreview() {
  return (
    <div className="flex h-full flex-col bg-canvas text-ink">
      <StatusBar />
      <div className="flex-1 overflow-hidden px-5 pt-4">
        <header className="flex items-center justify-between"><h1 className="font-display text-[1.75rem] font-semibold">Comunidade</h1><MoreHorizontal size={20} /></header>
        <div className="mt-5 grid grid-cols-3 border-b border-line text-center text-[10px]">
          <div className="relative py-3 font-medium text-sage-800">Grupos<span className="absolute inset-x-4 bottom-[-1px] h-[2px] bg-sage-600" /></div>
          <div className="py-3 text-muted">Discussões</div>
          <div className="py-3 text-muted">Amigos</div>
        </div>
        <section className="mt-5">
          <h2 className="text-sm font-semibold">Meus grupos</h2>
          <div className="mt-3 space-y-2">
            {GROUPS.map(([name, subtitle, members], index) => (
              <EditorialCard key={name} className="flex items-center gap-3 p-3">
                <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-[10px] bg-sage-100 text-sage-800">
                  {index === 0 ? <BookOpen size={21} /> : <UsersRound size={22} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{name}</p>
                  <p className="mt-1 truncate text-[10px] text-muted">{subtitle}</p>
                  <p className="mt-1 text-[9px] text-muted">{members}</p>
                </div>
                <span className="text-lg text-muted">›</span>
              </EditorialCard>
            ))}
          </div>
        </section>
        <section className="mt-6">
          <h2 className="text-sm font-semibold">Explorar grupos</h2>
          <EditorialCard className="mt-3 flex items-center gap-3 p-3">
            <div className="flex h-14 w-12 items-center justify-center rounded-[10px] bg-sage-100 text-sage-800"><UsersRound size={22} /></div>
            <div><p className="text-xs font-semibold">Jovens Espíritas</p><p className="mt-1 text-[10px] text-muted">Estudo e convivência</p></div>
          </EditorialCard>
        </section>
      </div>
      <PreviewNav active="Comunidade" />
    </div>
  )
}

function Quick({ icon: Icon, label }) {
  return (
    <div className="flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-[13px] border border-line bg-surface px-1 text-sage-700">
      <Icon size={19} strokeWidth={1.7} />
      <span className="text-[8.5px] font-semibold text-ink/80">{label}</span>
    </div>
  )
}

function PreviewNav({ active }) {
  const tabs = [
    ['Início', Home],
    ['Estudos', BookOpen],
    ['Comunidade', UsersRound],
    ['Favoritos', Heart],
    ['Perfil', UserRound],
  ]
  return (
    <div className="flex min-h-[4.7rem] items-center justify-around border-t border-line bg-surface/95 px-1 pt-1">
      {tabs.map(([label, Icon]) => (
        <div key={label} className={`flex flex-1 flex-col items-center justify-center gap-1 text-[9px] ${active === label ? 'font-semibold text-sage-800' : 'text-muted'}`}>
          <Icon size={19} strokeWidth={active === label ? 2.2 : 1.6} fill={active === label && label === 'Favoritos' ? 'currentColor' : 'none'} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}
