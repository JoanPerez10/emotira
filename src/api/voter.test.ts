import { describe, it, expect, beforeEach, vi } from 'vitest'
import { voterId, votedStorageKey } from './voter'

describe('voter.ts', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('genera i desa un nou voterId si no n\'hi ha cap', () => {
    const id = voterId()
    expect(id).toBeDefined()
    expect(typeof id).toBe('string')
    expect(localStorage.getItem('emotira:voter-id')).toBe(id)

    // Si es torna a cridar, retorna el mateix
    expect(voterId()).toBe(id)
  })

  it('retorna un nou identificador si localStorage llença una excepció', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new Error('Storage blocked')
    })

    const id = voterId()
    expect(id).toBeDefined()
    expect(typeof id).toBe('string')
  })

  it('retorna un nou identificador si localStorage.setItem llença una excepció', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('Quota exceeded')
    })

    const id = voterId()
    expect(id).toBeDefined()
    expect(typeof id).toBe('string')
  })

  it('genera la clau d\'emmagatzematge separada per mode', () => {
    expect(votedStorageKey('mock')).toBe('emotira:voted:mock')
    expect(votedStorageKey('supabase')).toBe('emotira:voted:supabase')
  })
})
