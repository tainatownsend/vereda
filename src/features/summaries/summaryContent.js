export const BOOK_SUMMARIES = {
  1: {
    eyebrow: 'Fundamentos da doutrina',
    overview: 'O Livro dos Espíritos organiza, em perguntas e respostas, os princípios fundamentais do Espiritismo. A obra parte de questões sobre Deus, o mundo espiritual e a origem dos espíritos e avança para encarnação, leis morais, vida em sociedade e esperança diante da morte.',
    themes: [
      'Deus, criação e elementos gerais do universo',
      'Origem, natureza e evolução dos espíritos',
      'Encarnação, desencarnação e reencarnação',
      'Leis morais e responsabilidade pelas escolhas',
      'Esperanças e consolações diante da vida futura',
    ],
    questions: [
      'O que o Espiritismo entende por espírito e mundo espiritual?',
      'Como liberdade, responsabilidade e progresso se relacionam?',
      'Qual é o papel da reencarnação na visão espírita da vida?',
    ],
    note: 'É a melhor porta de entrada para compreender o vocabulário e os princípios que reaparecem nas demais obras básicas.',
  },
  2: {
    eyebrow: 'Mediunidade e discernimento',
    overview: 'O Livro dos Médiuns aprofunda a dimensão experimental e prática da mediunidade. Kardec discute manifestações espíritas, diferentes formas de mediunidade, comunicação com os espíritos e critérios de observação e discernimento.',
    themes: [
      'Natureza das manifestações espíritas',
      'Médiuns e diferentes tipos de mediunidade',
      'Comunicação, linguagem e identidade dos espíritos',
      'Influência moral, mistificação e obsessão',
      'Responsabilidade e cuidado na prática mediúnica',
    ],
    questions: [
      'Como Kardec propõe avaliar uma comunicação mediúnica?',
      'Quais riscos de interpretação e influência a obra discute?',
      'Por que a dimensão moral é importante no exercício da mediunidade?',
    ],
    note: 'A obra funciona melhor quando lida com atenção aos exemplos e às distinções que Kardec faz entre fenômeno, interpretação e qualidade moral da comunicação.',
  },
  3: {
    eyebrow: 'Vida moral e ensinamentos de Jesus',
    overview: 'O Evangelho segundo o Espiritismo reúne ensinamentos morais de Jesus e os examina à luz dos princípios espíritas. O foco não é recontar os Evangelhos, mas aprofundar temas de conduta, transformação interior, relações humanas e esperança.',
    themes: [
      'Justiça, misericórdia e caridade',
      'Perdão, reconciliação e relações humanas',
      'Aflições, provas e esperança',
      'Fé, oração e transformação interior',
      'Família, responsabilidade e amor ao próximo',
    ],
    questions: [
      'Como os ensinamentos morais de Jesus são relacionados à visão espírita?',
      'Que atitudes a obra associa à caridade e ao perdão?',
      'Como a obra aborda sofrimento, esperança e responsabilidade pessoal?',
    ],
    note: 'É uma obra especialmente adequada para estudo temático e reflexão cotidiana, sempre voltando ao contexto completo dos capítulos.',
  },
  4: {
    eyebrow: 'Justiça divina e vida futura',
    overview: 'O Céu e o Inferno examina ideias sobre destino após a morte, justiça divina, penas e recompensas futuras. A obra combina reflexão doutrinária com relatos de espíritos em diferentes condições para discutir consequências morais e transformação.',
    themes: [
      'Céu, inferno e purgatório na perspectiva espírita',
      'Justiça divina e responsabilidade individual',
      'Condição do espírito após a morte',
      'Arrependimento, reparação e progresso',
      'Relatos de espíritos felizes, sofredores e em diferentes situações',
    ],
    questions: [
      'Como a obra relaciona justiça divina e consequências das escolhas?',
      'O que muda na compreensão de penas e recompensas futuras?',
      'Qual é a função dos relatos apresentados na segunda parte?',
    ],
    note: 'A primeira parte apresenta a argumentação; a segunda oferece casos e depoimentos que precisam ser lidos como parte da proposta investigativa da obra.',
  },
  5: {
    eyebrow: 'Criação, milagres e previsões',
    overview: 'A Gênese articula princípios espíritas com questões sobre origem do mundo, formação dos seres vivos, milagres e previsões. A obra procura mostrar como fenômenos considerados sobrenaturais podem ser analisados dentro de leis naturais e espirituais.',
    themes: [
      'Caráter da revelação espírita',
      'Deus, criação e leis naturais',
      'Formação do mundo e da humanidade',
      'Milagres e fenômenos atribuídos ao sobrenatural',
      'Previsões, sinais dos tempos e transformação moral',
    ],
    questions: [
      'Como a obra diferencia revelação, ciência e interpretação religiosa?',
      'De que forma Kardec procura naturalizar a explicação dos milagres?',
      'Como progresso material e progresso moral aparecem na obra?',
    ],
    note: 'Algumas discussões científicas refletem o conhecimento disponível no século XIX. Vale distinguir o princípio doutrinário da explicação científica histórica usada por Kardec.',
  },
}

export function getBookSummary(bookId) {
  return BOOK_SUMMARIES[Number(bookId)] || null
}
