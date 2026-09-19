import { afterEach, describe, expect, it, vi } from 'vitest'
import { readInitialSession } from '../../src/features/auth/sessionBootstrap'

afterEach(() => vi.useRealTimers())

describe('session startup recovery', () => {
  it('preserves an existing session', async () => {
    const session = { user: { id: 'reader' } }
    await expect(readInitialSession({ getSession: async () => ({ data: { session } }) })).resolves.toBe(session)
  })
  it('distinguishes a signed-out reader from a failed session request', async () => {
    await expect(readInitialSession({ getSession: async () => ({ data: { session: null } }) })).resolves.toBeNull()
    await expect(readInitialSession({ getSession: async () => ({ error: new Error('offline') }) })).rejects.toThrow('offline')
  })
  it('releases a stalled session and ignores its late result', async () => {
    vi.useFakeTimers()
    let resolve
    const result = readInitialSession({ getSession: () => new Promise(r => { resolve = r }) })
    const rejected = expect(result).rejects.toThrow('session_timeout')
    await vi.advanceTimersByTimeAsync(12000)
    await rejected
    resolve({ data: { session: { user: { id: 'late' } } } })
    expect(vi.getTimerCount()).toBe(0)
  })
  it('clears its watchdog when the request rejects', async () => {
    vi.useFakeTimers()
    await expect(readInitialSession({ getSession: async () => { throw new Error('network') } })).rejects.toThrow('network')
    expect(vi.getTimerCount()).toBe(0)
  })
})
