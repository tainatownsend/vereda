import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Compass, Heart, Home, ArrowRight, ArrowLeft, Type, ShieldCheck } from 'lucide-react'

const SCREENS = [
  { key: 'home', label: 'Início', Icon: Home },
  { key: 'studies', label: 'Estudos', Icon: BookOpen },
  { key: 'reader', label: 'Leitura guiada', Icon: Compass },
  { key: 'reflections', label: 'Reflexões', Icon: Heart },
]
const ACTIONS = {
  home: { title: 'Um caminho tranquilo para continuar', subtitle: 'Seu estudo, no seu ritmo.', cta: 'Abrir meu início', href: '/home' },
  studies: { title: 'Descubra seu próximo estudo', subtitle: 'Escolha uma das obras ou um caminho guiado.', cta: 'Explorar estudos', href: '/biblioteca' },
  reader: { title: 'A leitura também precisa respirar', subtitle: 'Ajuste a tipografia, leia sem distrações e retome do ponto salvo.', cta: 'Abrir estudo guiado', href: '/estudo-guiado' },
  reflections: { title: 'Um espaço para refletir', subtitle: 'Guarde suas próprias palavras e volte a elas quando quiser.', cta: 'Abrir minhas reflexões', href: '/reflexoes' },
}

export default function NorthStarPreviewPage() {
  const [screen, setScreen] = useState('home')
  const [fontSize, setFontSize] = useState('normal')
  const navigate = useNavigate()
  const content = ACTIONS[screen]
  return (
    <main className="northstar-page min-h-screen pb-12">
      <div className="northstar-container pt-6 sm:pt-10">
        <div className="mb-6 flex items-start gap-3">
          <button type="button" className="northstar-icon-button" aria-label="Voltar ao aplicativo" onClick={() => navigate('/home')}><ArrowLeft size={19}/></button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-700 dark:text-sage-300">Prévia isolada · v1.3</p>
            <h1 className="font-display text-3xl text-ink dark:text-night-ink">North Star · quatro telas</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted dark:text-night-muted">Protótipo com conteúdo demonstrativo. A versão publicada, o progresso real e as notas não são alterados por esta prévia.</p>
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Selecionar tela da prévia">
          {SCREENS.map(({key,label,Icon}) => (
            <button key={key} type="button" aria-pressed={screen===key} onClick={()=>setScreen(key)}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm ${screen===key ? 'border-sage-700 bg-sage-100 text-sage-900 dark:border-sage-300 dark:bg-night-surface dark:text-sage-200' : 'border-line bg-surface dark:border-night-line dark:bg-night-surface'}`}>
              <Icon size={18} aria-hidden="true"/>{label}
            </button>
          ))}
        </nav>
        <section className="mt-6 overflow-hidden rounded-[24px] border border-line bg-surface p-5 dark:border-night-line dark:bg-night-surface sm:p-8" aria-live="polite">
          <div className="mx-auto max-w-xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.16em] text-sage-700 dark:text-sage-300">Vereda · {SCREENS.find(s=>s.key===screen)?.label}</p>
            <h2 className="font-display text-3xl leading-tight text-ink dark:text-night-ink">{content.title}</h2>
            <p className="mt-3 text-base leading-relaxed text-muted dark:text-night-muted">{content.subtitle}</p>
            <div className="my-7 h-40 rounded-[20px] bg-gradient-to-br from-[#E8E9DB] via-[#F4E9D7] to-[#D3DDD0] p-6 dark:from-[#39483D] dark:via-[#343D38] dark:to-[#24362F]">
              <div className="max-w-xs font-display text-2xl italic leading-snug text-[#2D4433] dark:text-[#F3F1E5]">{screen==='home'?'A cada página, um novo horizonte.':screen==='studies'?'Conhecer. Compreender. Continuar.':screen==='reader'?'Seu lugar está aqui, exatamente onde você parou.':'Uma reflexão por vez.'}</div>
            </div>
            {screen==='reader' && <div className="mb-6 rounded-xl border border-line p-4 dark:border-night-line">
              <label htmlFor="ns13-type" className="mb-2 flex items-center gap-2 text-sm font-semibold"><Type size={18}/> Exemplo de leitura ampliada</label>
              <select id="ns13-type" className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 dark:border-night-line dark:bg-night" value={fontSize} onChange={e=>setFontSize(e.target.value)}>
                <option value="normal">Tamanho normal</option><option value="large">Grande</option><option value="extra">Extra grande</option>
              </select>
              <p className={`mt-4 max-w-prose leading-relaxed ${fontSize==='extra'?'text-[27px]':fontSize==='large'?'text-[23px]':'text-[18px]'}`}>Leitura de demonstração. O tamanho aumenta sem esconder as ações nem alterar o progresso.</p>
            </div>}
            <button type="button" onClick={()=>navigate(content.href)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-sage-700 px-5 text-base font-semibold text-white dark:bg-sage-300 dark:text-night">
              {content.cta} <ArrowRight size={18} aria-hidden="true"/>
            </button>
          </div>
        </section>
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted dark:text-night-muted"><ShieldCheck size={16} className="shrink-0" aria-hidden="true"/> Nenhum conteúdo sintético é gravado. Testar no iPhone antes de aceitar alterações na V1.2 publicada.</p>
      </div>
    </main>
  )
}
