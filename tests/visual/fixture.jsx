// Isolated development-only visual harness. Not imported by the production entry.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore, useReadingStore } from '../../src/store'
import { supabase } from '../../src/lib/supabase'
import Home from '../../src/pages/HomePage'
import Studies from '../../src/pages/LibraryPage'
import Reader from '../../src/pages/ReaderPage'
import Reflections from '../../src/pages/ReflectionPage'
import More from '../../src/pages/MorePage'
import Settings from '../../src/pages/SettingsPage'
import BottomNav from '../../src/components/ui/BottomNav'
import '../../src/index.css'
import '../../src/focus.css'
const params = new URLSearchParams(location.search)
document.documentElement.classList.toggle('dark', params.get('dark') === 'true')
document.documentElement.style.fontSize = `${params.get('scale') || 16}px`
const books = ['O Livro dos Espíritos', 'O Livro dos Médiuns', 'O Evangelho segundo o Espiritismo', 'O Céu e o Inferno', 'A Gênese'].map((title, i) => ({ id: i + 1, title, author: 'Allan Kardec', total_sections: 12, display_order: i + 1 }))
const progress = params.get('empty') === 'true' ? {} : { 1: { book_id: 1, current_section: 4, last_read_at: '2026-09-18' }, 3: { book_id: 3, current_section: 12, completed_at: '2026-09-18' } }
const sections = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, section_id: i + 1, sec_position: i + 1, kind: 'content', part_title: 'Parte I — Das causas primárias', chapter_label: 'Capítulo 3', chapter_title: 'Da criação', section_title: 'Da criação', word_count: 80, content: 'Conteúdo demonstrativo para verificar a experiência de leitura. Este texto de teste não faz parte das obras de Allan Kardec.\n\nA composição preserva o espaço entre parágrafos, o tamanho escolhido para as letras e o contexto da leitura.' }))
let journal = []
supabase.from = table => {
  let result = table === 'sections' ? [...sections] : table === 'study_journal_entries' ? journal : []
  const q = { select: () => q, eq: (key, value) => { if (table === 'sections' && key !== 'book_id') result = result.filter(row => row[key] === value); return q },
    gte: (key, value) => { result = result.filter(row => row[key] >= value); return q }, gt: (key, value) => { result = result.filter(row => row[key] > value); return q },
    lt: (key, value) => { result = result.filter(row => row[key] < value); return q }, in: () => q,
    order: (key, opts) => { if (opts?.ascending === false) result.reverse(); return q }, limit: n => { result = result.slice(0, n); return q },
    single: () => { result = result[0]; return q }, maybeSingle: () => { result = result[0]; return q },
    upsert: row => { journal = [row, ...journal.filter(item => item.entry_key !== row.entry_key)]; return q },
    then: (resolve, reject) => Promise.resolve({ data: result, error: null }).then(resolve, reject) }
  return q
}
supabase.rpc = async name => ({ data: name === 'get_reader_state' ? [{ current_section: 4, book_completed: false, daily_goal_reached: false, pace_mode: 'free' }] : name === 'complete_reading_section' ? [{ current_section: 5, book_completed: false }] : [], error: null })
supabase.auth.updateUser = async ({ data }) => {
  const user = { ...useAuthStore.getState().user, user_metadata: { ...useAuthStore.getState().user.user_metadata, ...data } }
  return { data: { user }, error: null }
}
useAuthStore.setState({ user: { id: 'visual-fixture', user_metadata: {} }, profile: { name: 'Tainá' }, loading: false })
useReadingStore.setState({ books, booksStatus: 'ready', progress, fetchProgress: async () => {}, fetchStreak: async () => {} })
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={[params.get('route') || '/home']}><Routes>
  <Route path="/home" element={<Home />} /><Route path="/biblioteca" element={<Studies />} /><Route path="/ler/:id" element={<Reader />} /><Route path="/reflexoes" element={<Reflections />} /><Route path="/mais" element={<More />} /><Route path="/configuracoes" element={<Settings />} />
  <Route path="*" element={<p>Destino secundário — coberto pela suíte de regressão.</p>} />
</Routes><BottomNav /></MemoryRouter>)
