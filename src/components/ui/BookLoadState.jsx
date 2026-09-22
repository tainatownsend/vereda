import { useReadingStore } from '@/store'
import { Button, PageLoader } from '@/components/ui'
export default function BookLoadState() {
  const { booksStatus, fetchBooks } = useReadingStore()
  if (booksStatus !== 'error') return <PageLoader label="Carregando obras" />
  return <main className="northstar-page px-6 py-16"><div className="mx-auto max-w-md text-center">
    <h1 className="font-display text-2xl">Vamos tentar novamente?</h1>
    <p role="alert" className="mt-4 text-base leading-relaxed">Não foi possível carregar as obras. Seus estudos continuam salvos.</p>
    <Button onClick={fetchBooks} className="mt-6">Tentar novamente</Button>
  </div></main>
}
