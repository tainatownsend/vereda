// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PublicOnlyRoute from '@/components/PublicOnlyRoute'

vi.mock('@/components/ui', () => ({
  PageLoader: () => <p role="status">Verificando sua sessão</p>,
}))

afterEach(cleanup)

function RenderEntry({ loading = false, user = null }) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={
          <PublicOnlyRoute loading={loading} user={user}>
            <main>Apresentação pública</main>
          </PublicOnlyRoute>
        } />
        <Route path="/home" element={<main>Home autenticada</main>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('OAuth return / landing access', () => {
  it('shows the marketing page to visitors who are not signed in', () => {
    render(<RenderEntry />)
    expect(screen.getByText('Apresentação pública')).toBeTruthy()
  })

  it('sends an authenticated visitor from / to /home automatically', () => {
    render(<RenderEntry user={{ id: 'local-fixture' }} />)
    expect(screen.getByText('Home autenticada')).toBeTruthy()
    expect(screen.queryByText('Apresentação pública')).toBeNull()
  })

  it('does not prematurely open the landing page while OAuth session restores', () => {
    const { rerender } = render(<RenderEntry loading />)
    expect(screen.getByRole('status').textContent).toBe('Verificando sua sessão')
    expect(screen.queryByText('Apresentação pública')).toBeNull()
    rerender(<RenderEntry user={{ id: 'local-fixture' }} />)
    expect(screen.getByText('Home autenticada')).toBeTruthy()
  })
})
