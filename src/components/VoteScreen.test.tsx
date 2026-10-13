import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import VoteScreen from './VoteScreen'
import { api } from '../api'
import type { Proposal, Tally } from '../api/types'
import { votedStorageKey } from '../api/voter'

describe('VoteScreen component', () => {
  const mockProposals: Proposal[] = [
    {
      id: 1,
      emojis: '🏰🌊',
      answer: 'Tossa de Mar',
      explanation: 'Vila medieval vora el mar',
      comarca: 'Selva',
      aliases: [],
      status: 'voting',
    },
    {
      id: 2,
      emojis: '🌲⛰️',
      answer: 'Camprodon',
      explanation: 'Poble dels Pirineus',
      comarca: 'Ripollès',
      aliases: [],
      status: 'voting',
    },
  ]

  const mockTallies: Record<number, Tally> = {
    1: { up: 10, down: 2 },
    2: { up: 5, down: 1 },
  }

  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    api.enabled = true
  })

  it('renderitza l\'estat de càrrega i permet sortir al menú', async () => {
    const handleExit = vi.fn()
    vi.spyOn(api, 'fetchVotingProposals').mockImplementation(
      () => new Promise(() => {}) // never resolves to keep loading state
    )

    render(<VoteScreen onExit={handleExit} />)

    expect(screen.getByText('Carregant…')).toBeInTheDocument()
    expect(screen.getByText('🗳️ Vota propostes')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '← Menú' }))
    expect(handleExit).toHaveBeenCalledTimes(1)
  })

  it('mostra missatge quan no hi ha cap proposta per votar', async () => {
    vi.spyOn(api, 'fetchVotingProposals').mockResolvedValueOnce({
      proposals: [],
      tallies: {},
    })

    render(<VoteScreen onExit={vi.fn()} />)

    await waitFor(() => {
      expect(
        screen.getByText('Ara mateix no hi ha propostes per votar. Torna més tard!')
      ).toBeInTheDocument()
    })
  })

  it('mostra un missatge d\'error si falla la càrrega de propostes', async () => {
    vi.spyOn(api, 'fetchVotingProposals').mockRejectedValueOnce(new Error('Network error'))

    render(<VoteScreen onExit={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        "No s'han pogut carregar les propostes."
      )
    })
  })

  it('renderitza les propostes amb els botons de votació', async () => {
    vi.spyOn(api, 'fetchVotingProposals').mockResolvedValueOnce({
      proposals: mockProposals,
      tallies: mockTallies,
    })

    render(<VoteScreen onExit={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Tossa de Mar')).toBeInTheDocument()
      expect(screen.getByText('Camprodon')).toBeInTheDocument()
    })

    expect(screen.getAllByRole('button', { name: "👍 M'agrada" })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: "👎 No m'agrada" })).toHaveLength(2)
  })

  it('permet votar a favor i actualitza el recompte i localStorage', async () => {
    vi.spyOn(api, 'fetchVotingProposals').mockResolvedValueOnce({
      proposals: mockProposals,
      tallies: mockTallies,
    })
    const castVoteSpy = vi.spyOn(api, 'castVote').mockResolvedValueOnce('ok')

    render(<VoteScreen onExit={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Tossa de Mar')).toBeInTheDocument()
    })

    const upButtons = screen.getAllByRole('button', { name: "👍 M'agrada" })
    fireEvent.click(upButtons[0])

    await waitFor(() => {
      expect(castVoteSpy).toHaveBeenCalledWith(1, 1)
      expect(screen.getByText(/Has votat 👍 · Resultat: 👍 11 · 👎 2/)).toBeInTheDocument()
    })

    const key = votedStorageKey(api.mode)
    const stored = JSON.parse(localStorage.getItem(key) ?? '{}')
    expect(stored[1]).toBe(1)
  })

  it('permet votar en contra i actualitza el recompte', async () => {
    vi.spyOn(api, 'fetchVotingProposals').mockResolvedValueOnce({
      proposals: mockProposals,
      tallies: mockTallies,
    })
    const castVoteSpy = vi.spyOn(api, 'castVote').mockResolvedValueOnce('ok')

    render(<VoteScreen onExit={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Camprodon')).toBeInTheDocument()
    })

    const downButtons = screen.getAllByRole('button', { name: "👎 No m'agrada" })
    fireEvent.click(downButtons[1]) // vota en contra la segona proposta (id: 2)

    await waitFor(() => {
      expect(castVoteSpy).toHaveBeenCalledWith(2, -1)
      expect(screen.getByText(/Has votat 👎 · Resultat: 👍 5 · 👎 2/)).toBeInTheDocument()
    })
  })

  it('mostra un missatge d\'error si el registre del vot falla', async () => {
    vi.spyOn(api, 'fetchVotingProposals').mockResolvedValueOnce({
      proposals: mockProposals,
      tallies: mockTallies,
    })
    vi.spyOn(api, 'castVote').mockRejectedValueOnce(new Error('Fail'))

    render(<VoteScreen onExit={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Tossa de Mar')).toBeInTheDocument()
    })

    const upButtons = screen.getAllByRole('button', { name: "👍 M'agrada" })
    fireEvent.click(upButtons[0])

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        "No s'ha pogut registrar el vot. Prova-ho més tard."
      )
    })
  })

  it('recupera i mostra vots previs guardats a localStorage', async () => {
    const key = votedStorageKey(api.mode)
    localStorage.setItem(key, JSON.stringify({ 1: 1 }))

    vi.spyOn(api, 'fetchVotingProposals').mockResolvedValueOnce({
      proposals: mockProposals,
      tallies: mockTallies,
    })

    render(<VoteScreen onExit={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Tossa de Mar')).toBeInTheDocument()
      expect(screen.getByText(/Has votat 👍 · Resultat: 👍 10 · 👎 2/)).toBeInTheDocument()
    })
  })

  it('gestiona JSON corrupte a localStorage en carregar vots previs', () => {
    const key = votedStorageKey(api.mode)
    localStorage.setItem(key, '{corrupted-json')

    render(<VoteScreen onExit={vi.fn()} />)
    expect(screen.getByText('🗳️ Vota propostes')).toBeInTheDocument()
  })
})
