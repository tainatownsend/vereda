const REFLECTIONS = [
  {
    id: 'small-choices',
    text: 'O progresso espiritual raramente acontece de uma vez. Muitas vezes ele começa numa escolha pequena, repetida com consciência.',
  },
  {
    id: 'listen-with-charity',
    text: 'Caridade também pode estar na forma como escutamos, interpretamos e respondemos ao outro.',
  },
  {
    id: 'learn-from-experience',
    text: 'Antes de procurar respostas fora, observe o que esta experiência está convidando você a aprender.',
  },
  {
    id: 'forgiveness-place',
    text: 'Perdoar não apaga o que aconteceu. Pode transformar o lugar que aquela experiência ocupa dentro de você.',
  },
  {
    id: 'freedom-responsibility',
    text: 'Liberdade e responsabilidade caminham juntas: cada escolha também educa quem estamos nos tornando.',
  },
  {
    id: 'relationships-school',
    text: 'A vida em comum é uma escola. Relações difíceis também podem revelar aquilo que ainda precisamos compreender em nós.',
  },
  {
    id: 'hope-path',
    text: 'Esperança não é negar a dificuldade; é lembrar que nenhuma etapa, sozinha, define todo o caminho.',
  },
  {
    id: 'knowledge-action',
    text: 'Conhecimento espiritual ganha sentido quando encontra uma atitude concreta na vida cotidiana.',
  },
  {
    id: 'pause-is-not-delay',
    text: 'Nem toda pausa é atraso. Às vezes, compreender exige silêncio antes de exigir resposta.',
  },
  {
    id: 'possible-good',
    text: 'O bem possível de hoje talvez pareça pequeno, mas ainda pode ser o começo de uma transformação.',
  },
  {
    id: 'sincere-question',
    text: 'Perguntar com sinceridade também é estudar: uma dúvida bem colocada pode abrir espaço para uma compreensão mais profunda.',
  },
  {
    id: 'understand-today',
    text: 'Aquilo que você compreende hoje pode transformar o modo como escolhe amanhã.',
  },
]

export function getDailyReflection(date = new Date()) {
  const dateKey = toLocalDateKey(date)
  return {
    ...REFLECTIONS[dayIndex(date) % REFLECTIONS.length],
    dateKey,
  }
}

export function getNextReflection(currentId) {
  const currentIndex = Math.max(0, REFLECTIONS.findIndex((item) => item.id === currentId))
  return REFLECTIONS[(currentIndex + 1) % REFLECTIONS.length]
}

export function getPreviousDailyReflections(count = 7, fromDate = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(fromDate)
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - (index + 1))
    return {
      ...getDailyReflection(date),
      label: formatReflectionDate(date),
    }
  })
}

export function formatReflectionDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

function dayIndex(date) {
  const local = new Date(date)
  local.setHours(12, 0, 0, 0)
  const start = new Date(2026, 0, 1, 12, 0, 0, 0)
  return Math.max(0, Math.floor((local.getTime() - start.getTime()) / 86400000))
}

function toLocalDateKey(date) {
  const local = new Date(date)
  return [
    local.getFullYear(),
    String(local.getMonth() + 1).padStart(2, '0'),
    String(local.getDate()).padStart(2, '0'),
  ].join('-')
}
