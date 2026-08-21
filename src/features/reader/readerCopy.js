export const READER_COPY = Object.freeze({
  dailyGoalNotice:
    'Você já dedicou um bom momento a esta leitura hoje. Pode parar por aqui ou continuar, como preferir.',
  missingContinuation: 'Não encontramos a continuação desta leitura.',
  indexDescription:
    'Escolha uma parte, capítulo ou trecho. Abrir um item não muda o lugar salvo da sua leitura.',
  currentUnitLabel: 'Trecho atual',
  defaultIndexGroup: 'Trechos',
  actions: Object.freeze({
    previous: Object.freeze({
      label: 'Voltar',
      ariaLabel: 'Voltar na leitura',
      icon: 'previous',
    }),
    continue: Object.freeze({
      label: 'Continuar',
      ariaLabel: 'Continuar a leitura',
      icon: 'continue',
    }),
    chapterIntro: Object.freeze({
      label: 'Começar capítulo',
      ariaLabel: 'Começar este capítulo',
      icon: 'continue',
    }),
    final: Object.freeze({
      label: 'Concluir obra',
      ariaLabel: 'Concluir a obra',
      icon: 'complete',
    }),
  }),
  errors: Object.freeze({
    loadReading: 'Não foi possível carregar sua leitura.',
    loadContinuation: 'Não foi possível carregar a continuação desta leitura.',
    loadPrevious: 'Não foi possível voltar na leitura.',
    selectedUnit: 'O trecho escolhido não pôde ser carregado.',
  }),
})

export function getReaderPrimaryAction({
  isChapterIntro,
  isFinalReadingUnit,
}) {
  if (isFinalReadingUnit) return READER_COPY.actions.final
  if (isChapterIntro) return READER_COPY.actions.chapterIntro
  return READER_COPY.actions.continue
}

export function getReaderIndexFallbackLabel(position) {
  return `Trecho ${position}`
}
