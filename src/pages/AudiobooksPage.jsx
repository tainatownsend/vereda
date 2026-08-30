import { ArrowRight, Headphones, Volume2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useBooks } from '@/hooks'
import { useReadingStore } from '@/store'
import { PageLoader } from '@/components/ui'
import { BookCover, EditorialCard } from '@/components/northstar/NorthStarUI'
import { getAudioPosition } from '@/features/audio/audioPosition'
import { speechNarrationSupported } from '@/features/audio/useSpeechNarration'

const ACCENTS = {
  1: '#5E7664',
  2: '#AB6D50',
  3: '#B9A46E',
  4: '#8FA68F',
  5: '#C98C6B',
}

export default function AudiobooksPage() {
  const navigate = useNavigate()
  const books = useBooks()
  const progress = useReadingStore((state) => state.progress)
  const supported = speechNarrationSupported()

  if (!books.length) return <PageLoader label="Carregando audiobooks" />

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-9">
        <header>
          <p className="ves-eyebrow">Ouvir as obras</p>
          <h1 className="mt-2 font-display text-[2rem] font-semibold text-ink dark:text-night-ink">Audiobooks</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted dark:text-night-muted">
            Ouça os próprios trechos das obras com a voz disponível no seu dispositivo. Nesta primeira versão, ouvir não altera seu ponto salvo de leitura.
          </p>
        </header>

        {!supported && (
          <EditorialCard className="mt-6 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay-50 text-clay-700 dark:bg-clay-950/20 dark:text-clay-300">
                <Volume2 size={19} aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-ink dark:text-night-ink">Narração não disponível neste navegador</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">
                  Você ainda pode usar a leitura normalmente. A experiência de áudio aparece quando o navegador oferece narração por voz.
                </p>
              </div>
            </div>
          </EditorialCard>
        )}

        <section className="mt-7 space-y-3" aria-label="Obras disponíveis para ouvir">
          {books.map((book) => {
            const readingPosition = Number(progress[book.id]?.current_section || 1)
            const listeningPosition = getAudioPosition(book.id, readingPosition)
            const continuing = listeningPosition > 1

            return (
              <EditorialCard
                key={book.id}
                as="button"
                type="button"
                disabled={!supported}
                onClick={() => navigate(`/audiobooks/${book.id}`)}
                className="w-full p-4 text-left disabled:opacity-55"
              >
                <div className="flex items-center gap-4">
                  <BookCover book={book} size="sm" color={ACCENTS[book.id]} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-sage-700 dark:text-sage-300">
                      {continuing ? 'Continuar ouvindo' : 'Começar a ouvir'}
                    </p>
                    <h2 className="mt-1 font-display text-[1.05rem] font-semibold leading-tight text-ink dark:text-night-ink">
                      {book.title}
                    </h2>
                    <p className="mt-2 text-xs leading-relaxed text-muted dark:text-night-muted">
                      Trecho {listeningPosition} · ponto de áudio neste dispositivo
                    </p>
                  </div>
                  <ArrowRight size={18} className="shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
                </div>
              </EditorialCard>
            )
          })}
        </section>

        <EditorialCard className="mt-6 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-50 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
              <Headphones size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink dark:text-night-ink">Sobre esta primeira versão</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">
                A voz depende do seu celular ou navegador. Mais adiante podemos substituir esta narração por arquivos de áudio próprios sem mudar a organização da experiência.
              </p>
            </div>
          </div>
        </EditorialCard>
      </div>
    </main>
  )
}
