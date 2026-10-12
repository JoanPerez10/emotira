import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import App from './App'
import { api } from './api'
import { todayKey } from './utils/daily'
import type { Session } from './api/types'

describe('App component', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
    vi.restoreAllMocks()
    api.enabled = true
    vi.spyOn(api.auth, 'onChange').mockImplementation(() => () => {})
    vi.spyOn(api.auth, 'getSession').mockResolvedValue(null)
    vi.spyOn(api, 'fetchAcceptedPuzzles').mockResolvedValue([])
  })

  it('renderitza el menú principal amb la capçalera, modes i enllaços', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Emotira' })).toBeInTheDocument()
    expect(screen.getByText('Endevina què és amb només emojis')).toBeInTheDocument()
    expect(screen.getByText(/👤 Convidat/)).toBeInTheDocument()
    expect(screen.getByText('Repte diari')).toBeInTheDocument()
    expect(screen.getByText('Contrarellotge')).toBeInTheDocument()
    expect(screen.getByText('Invers')).toBeInTheDocument()
    expect(screen.getByText('Endivina 10')).toBeInTheDocument()
    expect(screen.getByText('Col·lecció')).toBeInTheDocument()
  })

  it('navega a la pantalla de rècords i permet tornar al menú', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Els teus rècords' }))

    expect(screen.getByText('Rècords')).toBeInTheDocument()
    expect(screen.getByText('Repte diari')).toBeInTheDocument()
    expect(screen.getByText('Contrarellotge')).toBeInTheDocument()

    // Tornar al menú
    fireEvent.click(screen.getByRole('button', { name: '← Menú' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Emotira' })).toBeInTheDocument()
  })

  it('permet esborrar els rècords a la pantalla de rècords si l\'usuari confirma', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Els teus rècords' }))
    const resetBtn = screen.getByRole('button', { name: 'Esborrar tots els rècords' })
    fireEvent.click(resetBtn)

    expect(confirmSpy).toHaveBeenCalled()
    expect(screen.getByText('Reptes jugats:')).toBeInTheDocument()
  })

  it('navega a la pantalla del compte des de la xip de la capçalera', () => {
    render(<App />)

    const userChip = screen.getByRole('button', { name: '👤 Convidat' })
    fireEvent.click(userChip)

    expect(screen.getByText('👤 Compte')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('navega a les regles de contrarellotge i permet iniciar el joc', () => {
    render(<App />)

    const trialCard = screen.getByRole('button', { name: /Contrarellotge/i })
    fireEvent.click(trialCard)

    expect(screen.getByText('Contra el rellotge!')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Jugar/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Jugar/i }))
    // Ara ha d'entrar a la partida de contrarellotge
    expect(screen.getByRole('timer')).toBeInTheDocument()
  })

  it('inicia el mode invers directament', () => {
    render(<App />)

    const inverseCard = screen.getByRole('button', { name: /Invers/i })
    fireEvent.click(inverseCard)

    expect(screen.getByRole('button', { name: 'Comprovar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Em rendeixo' })).toBeInTheDocument()
  })

  it('inicia el joc clàssic (Endivina 10)', () => {
    render(<App />)

    const tenCard = screen.getByRole('button', { name: /Endivina 10/i })
    fireEvent.click(tenCard)

    expect(screen.getByText('Endivina 10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comprovar' })).toBeInTheDocument()
  })

  it('navega a Proposa un poble i a Vota propostes', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Proposa un poble' }))
    expect(screen.getByText(/Proposa un poble/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '← Menú' }))
    fireEvent.click(screen.getByRole('button', { name: 'Vota propostes' }))
    expect(screen.getByText('🗳️ Vota propostes')).toBeInTheDocument()
  })

  it('obre el panell d\'administració amb el hash #admin i permet sortir amb el botó Menú', async () => {
    window.location.hash = '#admin'
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/Admin/)).toBeInTheDocument()
    })

    const backBtn = screen.getByRole('button', { name: '← Menú' })
    fireEvent.click(backBtn)

    expect(screen.getByRole('heading', { level: 1, name: 'Emotira' })).toBeInTheDocument()
  })

  it('mostra la targeta de repte diari completat si ja s\'ha jugat avui i permet compartir', async () => {
    const today = todayKey()
    const recordsWithDaily = {
      daily: {
        played: 1,
        streak: 1,
        bestStreak: 1,
        lastDate: today,
        history: {
          [today]: {
            score: 3,
            max: 3,
            results: '🟩🟩🟩',
          },
        },
      },
      unlockedTowns: [],
      ten: { played: 0, best: 0 },
      hard: { played: 0, best: 0 },
      infinite: { played: 0, bestStreak: 0, bestSolved: 0 },
      timeTrial: { played: 0, best: 0 },
      inverse: { played: 0, best: 0 },
      music: { played: 0, best: 0 },
    }
    localStorage.setItem('emotira:records:v1', JSON.stringify(recordsWithDaily))

    const writeTextSpy = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    })

    render(<App />)

    expect(screen.getByText('Avui ja has jugat')).toBeInTheDocument()
    expect(screen.getByText('3/3')).toBeInTheDocument()

    const shareBtn = screen.getByRole('button', { name: /Compartir resultat/i })
    fireEvent.click(shareBtn)

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalled()
      expect(screen.getByText('Copiat')).toBeInTheDocument()
    })
  })

  it('carrega la sessió de l\'usuari si està connectat', async () => {
    const mockSession: Session = {
      id: 'user-123',
      username: 'joan_test',
      email: 'joan@dev.local',
      isAdmin: false,
    }
    vi.spyOn(api.auth, 'getSession').mockResolvedValue(mockSession)
    vi.spyOn(api.records, 'load').mockResolvedValue(null)
    vi.spyOn(api.records, 'save').mockResolvedValue(undefined)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('👤 joan_test')).toBeInTheDocument()
    })
  })

  it('inicia els modes música, difícil i infinit', () => {
    render(<App />)

    // Mode Música
    fireEvent.click(screen.getByRole('button', { name: /Música/i }))
    expect(screen.getByText('Música')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '← Menú' }))

    // Mode Difícil
    fireEvent.click(screen.getByRole('button', { name: /Mode difícil/i }))
    expect(screen.getByText('Mode difícil')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '← Menú' }))

    // Mode Infinit
    fireEvent.click(screen.getByRole('button', { name: /Mode infinit/i }))
    expect(screen.getByText('Mode infinit')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '← Menú' }))
  })

  it('navega a la col·lecció, al rànquing i als grups des dels enllaços del menú', async () => {
    render(<App />)

    // Col·lecció (lazy import amb Suspense)
    fireEvent.click(screen.getByRole('button', { name: /Col·lecció/i }))
    const backBtn = await screen.findByRole('button', { name: '← Menú' })
    fireEvent.click(backBtn)

    // Rànquing
    fireEvent.click(screen.getByRole('button', { name: 'Rànquing' }))
    expect(screen.getByText(/Rànquing/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '← Menú' }))

    // Grups
    fireEvent.click(screen.getByRole('button', { name: 'Grups' }))
    expect(screen.getByText(/Per crear un grup/i)).toBeInTheDocument()
  })

  it('sincronitza rècords del núvol quan l\'usuari té dades guardades', async () => {
    const mockSession: Session = {
      id: 'user-123',
      username: 'joan_test',
      email: 'joan@dev.local',
      isAdmin: false,
    }
    const cloudRecords = {
      daily: { played: 5, streak: 3, bestStreak: 4, lastDate: null, history: {} },
      ten: { played: 2, best: 25 },
      hard: { played: 1, best: 15 },
      timeTrial: { played: 3, best: 12 },
      inverse: { played: 1, best: 20 },
      music: { played: 0, best: 0 },
      infinite: { played: 1, bestSolved: 5, bestStreak: 5 },
      unlockedTowns: ['Vic'],
    }
    vi.spyOn(api.auth, 'getSession').mockResolvedValue(mockSession)
    vi.spyOn(api.records, 'load').mockResolvedValue(cloudRecords)
    const submitScoreSpy = vi.spyOn(api.scores, 'submit').mockResolvedValue(undefined)

    render(<App />)

    await waitFor(() => {
      expect(submitScoreSpy).toHaveBeenCalled()
    })
  })

  it('mostra la pantalla de resultat en acabar una partida de contrarellotge i permet reiniciar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<App />)

    // Iniciar contrarellotge
    fireEvent.click(screen.getByRole('button', { name: /Contrarellotge/i }))
    fireEvent.click(screen.getByRole('button', { name: /Jugar/i }))

    // Avançar el temps fins a esgotar-lo
    act(() => {
      vi.advanceTimersByTime(121000)
    })

    expect(await screen.findByText(/Podem fer-ho millor|Enhorabona!/)).toBeInTheDocument()
    expect(screen.getByText('Temps esgotat!')).toBeInTheDocument()

    // Clic a Menú (línia 347)
    const menuBtn = screen.getByRole('button', { name: 'Menú' })
    fireEvent.click(menuBtn)
    expect(screen.getByRole('heading', { level: 1, name: 'Emotira' })).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('navega a la pantalla de compte en prémer el botó d\'entrar des de rànquing i grups', async () => {
    render(<App />)

    // Des de Rànquing
    fireEvent.click(screen.getByRole('button', { name: 'Rànquing' }))
    const loginRankingBtn = await screen.findByRole('button', { name: /Entrar \/ Crear compte/i })
    fireEvent.click(loginRankingBtn)
    expect(screen.getByText('👤 Compte')).toBeInTheDocument()

    // Tornar al menú i després a Grups
    fireEvent.click(screen.getByRole('button', { name: '← Menú' }))
    fireEvent.click(screen.getByRole('button', { name: 'Grups' }))
    const loginGroupsBtn = await screen.findByRole('button', { name: /Entrar \/ Crear compte/i })
    fireEvent.click(loginGroupsBtn)
    expect(screen.getByText('👤 Compte')).toBeInTheDocument()
  })

  it('inicia el repte diari des de la targeta principal', () => {
    render(<App />)

    const dailyBtn = screen.getByRole('button', { name: /Repte diari/i })
    fireEvent.click(dailyBtn)

    expect(screen.getByText('Poble 1 de 5')).toBeInTheDocument()
  })

  it('navega al compte des del botó "El meu compte" quan hi ha sessió i des d\'allà a rànquing i grups', async () => {
    const mockSession: Session = {
      id: 'user-123',
      username: 'joan_connectat',
      email: 'joan@dev.local',
      isAdmin: false,
    }
    vi.spyOn(api.auth, 'getSession').mockResolvedValue(mockSession)
    vi.spyOn(api.records, 'load').mockResolvedValue(null)

    render(<App />)

    const accountBtn = await screen.findByRole('button', { name: 'El meu compte' })
    fireEvent.click(accountBtn)

    expect(screen.getByText('👤 Compte')).toBeInTheDocument()

    // Navegar a rànquing des de la pantalla de compte (línia 377)
    const rankingBtn = screen.getByRole('button', { name: /Veure el rànquing/i })
    fireEvent.click(rankingBtn)
    expect(screen.getByText('🏅 Rànquing')).toBeInTheDocument()

    // Tornar al compte i després a grups (línia 378)
    fireEvent.click(screen.getByRole('button', { name: '← Menú' }))
    fireEvent.click(screen.getByRole('button', { name: 'El meu compte' }))
    const groupsBtn = screen.getByRole('button', { name: /Els meus grups/i })
    fireEvent.click(groupsBtn)
    expect(screen.getByText('👥 Grups')).toBeInTheDocument()
  })
})
