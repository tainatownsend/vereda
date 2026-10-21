const EDITORIAL_AUTHOR = 'Vereda · texto editorial'

const LEGACY_EDITORIAL_REFLECTIONS = [
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

// Transcriptions and signatures checked against the linked edition on 2026-09-23.
// Legacy IDs remain available only for previously saved editorial favorites.
const REFLECTIONS = [
  {
    "id": "quote-faith-understanding",
    "text": "E, para crer, não basta ver; é preciso, sobretudo, compreender.",
    "author": "Allan Kardec",
    "source": "O Evangelho segundo o Espiritismo · XIX, 7",
    "sourceUrl": "https://www.kardecpedia.com/roteiro-de-estudos/887/o-evangelho-segundo-o-espiritismo/2554/capitulo-xix-a-fe-transporta-montanhas/a-fe-religiosa-condicao-da-fe-inabalavel/7",
    "kind": "quotation"
  },
  {
    "id": "quote-indulgence",
    "text": "Sede indulgentes, meus amigos, porquanto a indulgência atrai, acalma, ergue, ao passo que o rigor desanima, afasta e irrita.",
    "author": "José, Espírito protetor",
    "source": "O Evangelho segundo o Espiritismo · X, 16",
    "sourceUrl": "https://www.kardecpedia.com/roteiro-de-estudos/887/o-evangelho-segundo-o-espiritismo/2362/capitulo-x-bem-aventurados-os-que-sao-misericordiosos/instrucoes-dos-espiritos/a-indulgencia/16",
    "kind": "quotation"
  },
  {
    "id": "quote-moral-transformation",
    "text": "Reconhece-se o verdadeiro espírita pela sua transformação moral e pelos esforços que emprega para domar suas inclinações más.",
    "author": "Allan Kardec",
    "source": "O Evangelho segundo o Espiritismo · XVII, 4",
    "sourceUrl": "https://www.kardecpedia.com/roteiro-de-estudos/887/o-evangelho-segundo-o-espiritismo/2070/capitulo-xvii-sede-perfeitos",
    "kind": "quotation"
  },
  {
    "id": "quote-love-neighbor",
    "text": "Amarás o teu próximo, como a ti mesmo.",
    "author": "Jesus",
    "source": "Mateus 22:39 · citado em O Evangelho segundo o Espiritismo, XV, 4",
    "sourceUrl": "https://www.kardecpedia.com/roteiro-de-estudos/887/o-evangelho-segundo-o-espiritismo/2465/capitulo-xv-fora-da-caridade-nao-ha-salvacao/o-mandamento-maior/4",
    "kind": "quotation"
  },
  {
    "id": "quote-good-person",
    "text": "O verdadeiro homem de bem é o que pratica a lei de justiça, amor e caridade, na sua maior pureza.",
    "author": "Allan Kardec",
    "source": "O Livro dos Espíritos · questão 918, comentário de Kardec",
    "sourceUrl": "https://kardecpedia.com/roteiro-de-estudos/2/o-livrodos-espiritos/236/parte-terceira-das-leis-morais/capitulo-xii-da-perfeicao-moral/caracteres-do-homem-de-bem",
    "kind": "quotation"
  },
  {
    "id": "quote-charity",
    "text": "FORA DA CARIDADE NÃO HÁ SALVAÇÃO.",
    "author": "Allan Kardec",
    "source": "O Evangelho segundo o Espiritismo · XV, 5",
    "sourceUrl": "https://www.kardecpedia.com/roteiro-de-estudos/887/o-evangelho-segundo-o-espiritismo/2464/capitulo-xv-fora-da-caridade-nao-ha-salvacao/o-mandamento-maior",
    "kind": "quotation"
  },
  {
    "id": "quote-love-and-learn",
    "text": "Espíritas! amai-vos, este o primeiro ensinamento; instruí-vos, este o segundo.",
    "author": "Espírito de Verdade",
    "source": "O Evangelho segundo o Espiritismo · VI, 5",
    "sourceUrl": "https://www.kardecpedia.com/roteiro-de-estudos/887/o-evangelho-segundo-o-espiritismo/2271/capitulo-vi-o-cristo-consolador/instrucoes-dos-espiritos/advento-do-espirito-de-verdade/5",
    "kind": "quotation"
  }
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
  return { ...REFLECTIONS[(currentIndex + 1) % REFLECTIONS.length] }
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
  // Calendar days, unaffected by daylight-saving transitions.
  return Math.max(0, Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(2026, 0, 1)) / 86400000))
}

function toLocalDateKey(date) {
  const local = new Date(date)
  return [
    local.getFullYear(),
    String(local.getMonth() + 1).padStart(2, '0'),
    String(local.getDate()).padStart(2, '0'),
  ].join('-')
}

export function getReflectionsByIds(ids) {
  const catalog = [...REFLECTIONS, ...LEGACY_EDITORIAL_REFLECTIONS.map(reflection => ({
    ...reflection, author: EDITORIAL_AUTHOR, kind: 'editorial',
  }))]
  return ids.map(id => catalog.find(reflection => reflection.id === id)).filter(Boolean)
}
