// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PageBackButton from '../../src/components/ui/PageBackButton'

afterEach(() => { cleanup(); window.history.replaceState(null, '') })
function renderPage(entries) {
  render(<MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}><Routes>
    <Route path="/home" element={<h1>Início</h1>} />
    <Route path="/biblioteca" element={<h1>Estudos</h1>} />
    <Route path="/mais" element={<PageBackButton />} />
  </Routes></MemoryRouter>)
}
it('returns to the previous in-app screen', async () => {
  window.history.replaceState({ idx: 1 }, '')
  renderPage(['/biblioteca', '/mais'])
  await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(screen.getByRole('heading', { name: 'Estudos' })).toBeTruthy()
})
it('opens Home when there is no in-app history', async () => {
  window.history.replaceState({ idx: 0 }, '')
  renderPage(['/mais'])
  await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(screen.getByRole('heading', { name: 'Início' })).toBeTruthy()
})
