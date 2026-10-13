import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminPanel from './AdminPanel'
import { api } from '../api'
import type { Proposal, Session, Tally } from '../api/types'

describe('AdminPanel component', () => {
  const adminSession: Session = {
    id: 'admin-1',
    username: 'cap_admin',
    email: 'admin@emotira.cat',
    isAdmin: true,
  }

  const userSession: Session = {
    id: 'user-2',
    username: 'usuari_normal',
    email: 'user@emotira.cat',
    isAdmin: false,
  }

  const mockProposals: Proposal[] = [
    {
      id: 10,
      answer: 'Tarragona',
      emojis: '🏛️🌊',
      explanation: 'Amfiteatre romà',
      comarca: 'Tarragonès',
      aliases: ['Tàrraco'],
      status: 'pending',
    },
    {
      id: 11,
      answer: 'Besalú',
      emojis: '🌉🏰',
      explanation: 'Pont medieval',
      comarca: '',
      aliases: [],
      status: 'voting',
    },
  ]

  const mockTallies: Record<number, Tally> = {
    11: { up: 5, down: 1 },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    api.enabled = true
    vi.spyOn(api.auth, 'onChange').mockImplementation(() => () => {})
  })

  it('mostra error quan l\'API està deshabilitada', () => {
    api.enabled = false
    render(<AdminPanel onExit={vi.fn()} />)

    expect(screen.getByText(/Falten les variables VITE_SUPABASE_\*/i)).toBeInTheDocument()
  })

  it('mostra formulari d\'entrada quan no hi ha sessió', async () => {
    vi.spyOn(api.auth, 'getSession').mockResolvedValue(null)
    const signInSpy = vi.spyOn(api.auth, 'signIn').mockResolvedValue(true)

    render(<AdminPanel onExit={vi.fn()} />)

    expect(await screen.findByLabelText('Correu')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Correu'), { target: { value: 'admin@emotira.cat' } })
    fireEvent.change(screen.getByLabelText('Contrasenya'), { target: { value: 'superpass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(signInSpy).toHaveBeenCalledWith('admin@emotira.cat', 'superpass')
    })
  })

  it('mostra avís si l\'usuari connectat no és administrador', async () => {
    vi.spyOn(api.auth, 'getSession').mockResolvedValue(userSession)

    render(<AdminPanel onExit={vi.fn()} />)

    expect(
      await screen.findByText(/Aquest usuari \(usuari_normal\) no és administrador/i)
    ).toBeInTheDocument()
  })

  it('carrega i mostra les propostes quan l\'usuari és administrador', async () => {
    vi.spyOn(api.auth, 'getSession').mockResolvedValue(adminSession)
    vi.spyOn(api.admin, 'listOpenProposals').mockResolvedValue({
      rows: mockProposals,
      tallies: mockTallies,
    })
    const decideSpy = vi.spyOn(api.admin, 'decide').mockResolvedValue(undefined)

    render(<AdminPanel onExit={vi.fn()} />)

    expect(await screen.findByText('Tarragona')).toBeInTheDocument()
    expect(screen.getByText('Besalú')).toBeInTheDocument()
    expect(screen.getByText(/En votació · 👍 5 · 👎 1/i)).toBeInTheDocument()

    // Acceptar la proposta de Tarragona (té comarca Tarragonès)
    const acceptBtns = screen.getAllByRole('button', { name: /Acceptar/i })
    fireEvent.click(acceptBtns[0])

    await waitFor(() => {
      expect(decideSpy).toHaveBeenCalledWith(10, 'accepted', 'Tarragonès', ['Tàrraco'])
    })
  })

  it('permet posar a votació o rebutjar una proposta', async () => {
    vi.spyOn(api.auth, 'getSession').mockResolvedValue(adminSession)
    vi.spyOn(api.admin, 'listOpenProposals').mockResolvedValue({
      rows: mockProposals,
      tallies: mockTallies,
    })
    const decideSpy = vi.spyOn(api.admin, 'decide').mockResolvedValue(undefined)

    render(<AdminPanel onExit={vi.fn()} />)

    expect(await screen.findByText('Tarragona')).toBeInTheDocument()

    // Posar a votació la proposta pending
    const votingBtn = screen.getByRole('button', { name: /A votació/i })
    fireEvent.click(votingBtn)

    await waitFor(() => {
      expect(decideSpy).toHaveBeenCalledWith(10, 'voting', 'Tarragonès', ['Tàrraco'])
    })

    // Rebutjar la proposta
    const rejectBtns = screen.getAllByRole('button', { name: /Rebutjar/i })
    fireEvent.click(rejectBtns[0])

    await waitFor(() => {
      expect(decideSpy).toHaveBeenCalledWith(10, 'rejected', 'Tarragonès', ['Tàrraco'])
    })
  })

  it('mostra missatge quan no hi ha cap proposta oberta', async () => {
    vi.spyOn(api.auth, 'getSession').mockResolvedValue(adminSession)
    vi.spyOn(api.admin, 'listOpenProposals').mockResolvedValue({
      rows: [],
      tallies: {},
    })

    render(<AdminPanel onExit={vi.fn()} />)

    expect(await screen.findByText(/No hi ha propostes pendents. 🎉/i)).toBeInTheDocument()
  })

  it('permet tancar sessió des del panell', async () => {
    vi.spyOn(api.auth, 'getSession').mockResolvedValue(adminSession)
    vi.spyOn(api.admin, 'listOpenProposals').mockResolvedValue({ rows: [], tallies: {} })
    const signOutSpy = vi.spyOn(api.auth, 'signOut').mockResolvedValue()

    render(<AdminPanel onExit={vi.fn()} />)

    const logoutBtn = await screen.findByRole('button', { name: 'Sortir' })
    fireEvent.click(logoutBtn)

    expect(signOutSpy).toHaveBeenCalled()
  })
})
