import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RankingScreen from './RankingScreen'
import { api } from '../api'
import type { LeaderRow, Session } from '../api/types'

describe('RankingScreen component', () => {
  const mockSession: Session = {
    id: 'user-1',
    username: 'joan',
    email: 'joan@test.cat',
    isAdmin: false,
  }

  const mockLeaderboard: LeaderRow[] = [
    { rank: 1, username: 'albert', value: 30, isMe: false },
    { rank: 2, username: 'joan', value: 28, isMe: true },
    { rank: 3, username: 'carme', value: 25, isMe: false },
    { rank: 4, username: 'david', value: 22, isMe: false },
    { rank: 5, username: 'elena', value: 20, isMe: false },
    { rank: 6, username: 'francesc', value: 18, isMe: false },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    api.enabled = true
  })

  it('renderitza el títol, la barra de modes i la llista de líders', async () => {
    const handleExit = vi.fn()
    vi.spyOn(api.scores, 'leaderboard').mockResolvedValue(mockLeaderboard)

    render(<RankingScreen session={mockSession} onExit={handleExit} onLogin={vi.fn()} />)

    expect(screen.getByText('🏅 Rànquing')).toBeInTheDocument()

    // Botó per sortir
    const backBtn = screen.getByRole('button', { name: '← Menú' })
    fireEvent.click(backBtn)
    expect(handleExit).toHaveBeenCalled()

    // Comprovar elements del rànquing
    expect(await screen.findByText('albert')).toBeInTheDocument()
    expect(screen.getByText(/joan \(tu\)/i)).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
  })

  it('mostra invitació a iniciar sessió quan l\'usuari és anònim', async () => {
    vi.spyOn(api.scores, 'leaderboard').mockResolvedValue([])
    const handleLogin = vi.fn()

    render(<RankingScreen session={null} onExit={vi.fn()} onLogin={handleLogin} />)

    expect(await screen.findByText(/Entra o crea un compte per sortir al rànquing/i)).toBeInTheDocument()

    const loginBtn = screen.getByRole('button', { name: /Entrar \/ Crear compte/i })
    fireEvent.click(loginBtn)
    expect(handleLogin).toHaveBeenCalled()
  })

  it('permet canviar de mode mitjançant les pestanyes', async () => {
    const leaderboardSpy = vi.spyOn(api.scores, 'leaderboard').mockResolvedValue(mockLeaderboard)

    render(<RankingScreen session={mockSession} onExit={vi.fn()} onLogin={vi.fn()} />)

    await screen.findByText('albert')

    // Canviar a mode difícil
    const hardTab = screen.getByRole('tab', { name: /Difícil/i })
    fireEvent.click(hardTab)

    await waitFor(() => {
      expect(leaderboardSpy).toHaveBeenCalledWith('hard')
    })
  })

  it('mostra missatge quan no hi ha puntuacions disponibles', async () => {
    vi.spyOn(api.scores, 'leaderboard').mockResolvedValue([])

    render(<RankingScreen session={mockSession} onExit={vi.fn()} onLogin={vi.fn()} />)

    expect(
      await screen.findByText(/Encara no hi ha puntuacions en aquest mode/i)
    ).toBeInTheDocument()
  })

  it('mostra missatge d\'error si la crida falla', async () => {
    vi.spyOn(api.scores, 'leaderboard').mockRejectedValue(new Error('Network error'))

    render(<RankingScreen session={mockSession} onExit={vi.fn()} onLogin={vi.fn()} />)

    expect(
      await screen.findByText(/No s'ha pogut carregar el rànquing/i)
    ).toBeInTheDocument()
  })
})
