// @vitest-environment jsdom
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import AppRecovery from '../../src/components/AppRecovery'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
it('keeps working content visible', () => {
  render(<AppRecovery><h1>Estudos</h1></AppRecovery>)
  expect(screen.getByRole('heading', { name: 'Estudos' })).toBeTruthy()
})
it('offers recovery instead of a blank screen after rendering fails', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  function BrokenScreen() { throw new Error('Test render failure') }
  render(<AppRecovery><BrokenScreen /></AppRecovery>)
  expect(screen.getByRole('heading', { name: 'Não conseguimos abrir o Vereda agora.' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy()
  expect(screen.getByRole('alert').textContent).toContain('Não é necessário apagar seus dados')
})
