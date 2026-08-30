import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  classifyReaderKind,
  cleanReaderContent,
  cleanReaderStructuralTitle,
  extractChapterOverview,
  extractChapterTopics,
  isReaderDisplayable,
} from '@/features/reader/readerStructure'

const service = readFileSync('src/features/reader/readerService.js', 'utf8')
const reader = readFileSync('src/pages/ReaderPage.jsx', 'utf8')
const bookDetail = readFileSync('src/pages/BookDetailPage.jsx', 'utf8')
const indexPanel = readFileSync('src/features/reader/BookIndexPanel.jsx', 'utf8')
const copy = readFileSync('src/features/reader/readerCopy.js', 'utf8')

describe('reader structural presentation', () => {
  it('skips a chapter cover that adds no useful overview', () => {
    const section = {
      kind: 'chapter_intro',
      chapter_label: 'CAPÍTULO I',
      chapter_title: 'O porvir e o nada',
      content: '',
    }

    expect(classifyReaderKind(section)).toBe('chapter_intro_skip')
    expect(isReaderDisplayable({ ...section, kind: classifyReaderKind(section) })).toBe(false)
  })

  it('keeps a chapter opening when it previews several real topics', () => {
    const section = {
      kind: 'chapter_intro',
      chapter_label: 'CAPÍTULO I',
      chapter_title: 'Não vim destruir a lei',
      content: 'As três revelações: Moisés, Cristo, Espiritismo\nAliança da Ciência e da Religião',
    }

    expect(extractChapterTopics(section.content)).toEqual([
      'As três revelações: Moisés, Cristo, Espiritismo',
      'Aliança da Ciência e da Religião',
    ])
    expect(classifyReaderKind(section)).toBe('chapter_intro')
  })

  it('normalizes inline numbered chapter topics to the same line-based format used by the Reader', () => {
    const inline = '1. Primeiro tema 2. Segundo tema 3. Terceiro tema'
    const cleaned = cleanReaderContent(inline, 'chapter_intro')

    expect(cleaned).toBe('1. Primeiro tema\n2. Segundo tema\n3. Terceiro tema')
    expect(extractChapterTopics(cleaned)).toEqual([
      'Primeiro tema',
      'Segundo tema',
      'Terceiro tema',
    ])
  })

  it('recovers a Part overview even when the database row is incorrectly classified as content', () => {
    const section = {
      kind: 'content',
      part_title: 'Primeira Parte — Doutrina',
      content: 'Capítulo I O porvir e o nada Capítulo II Temor da morte Capítulo III O céu Capítulo IV O inferno',
    }

    expect(classifyReaderKind(section)).toBe('part_intro')
    expect(extractChapterOverview(section.content)).toEqual([
      { label: 'Capítulo I', title: 'O porvir e o nada' },
      { label: 'Capítulo II', title: 'Temor da morte' },
      { label: 'Capítulo III', title: 'O céu' },
      { label: 'Capítulo IV', title: 'O inferno' },
    ])
  })

  it('cleans known structural-title artifacts only in the presentation layer', () => {
    expect(cleanReaderStructuralTitle('• Instruções dos Espíritos: A nova era')).toBe(
      'Instruções dos Espíritos: A nova era',
    )
    expect(cleanReaderStructuralTitle('ideia cristã e do Espiritismo')).toBe(
      'Sócrates e Platão, precursores da ideia cristã e do Espiritismo',
    )
  })

  it('removes the duplicated Nota label without changing the note body', () => {
    expect(
      cleanReaderContent('[Nota: Nota de Allan Kardec: A morte de Jesus, supostamente escrita...]'),
    ).toBe('[Nota: Allan Kardec: A morte de Jesus, supostamente escrita...]')
  })
})

describe('reader structural UI contract', () => {
  it('traverses skippable chapter covers without relying on a fixed one-page navigation window', () => {
    expect(service).toContain('getDisplayableSectionWindow')
    expect(service).toContain('while (collected.length < limit)')
    expect(service).toContain('const SECTION_PAGE_SIZE = 20')
    expect(service).toContain('collected.push(...normalizeDisplayableSections(data))')
    expect(service).toContain('direction: \'backward\'')
    expect(service).toContain("'id, sec_position, title, kind, part_title, chapter_label, chapter_title, section_title, content'")
  })

  it('still supports useful chapter and part overview surfaces', () => {
    expect(reader).toContain('<PartIntro section={currentSection} />')
    expect(reader).toContain('<ChapterIntro section={currentSection} />')
    expect(reader).toContain('Nesta parte')
  })

  it('renders the requested line break in index guidance', () => {
    expect(copy).toContain("Escolha uma parte, capítulo ou trecho.\\nAbrir um item não muda o lugar salvo da sua leitura.")
    expect(indexPanel).toContain('whitespace-pre-line')
  })

  it('uses icon-left text-right cards for optional reading pace choices', () => {
    expect(bookDetail).toContain('flex min-h-24 items-start gap-4 rounded-vesMd')
    expect(bookDetail).toContain('min-w-0 flex-1 pt-0.5')
    expect(bookDetail).not.toContain('min-h-36 rounded-vesMd')
  })

  it('separates the reassurance sentence from the saved-place explanation', () => {
    expect(bookDetail).toContain('<span className="block">Você pode parar quando quiser.</span>')
    expect(bookDetail).toContain('<span className="mt-1 block">O Vereda guarda seu lugar sem criar atraso ou cobrança.</span>')
  })
})
