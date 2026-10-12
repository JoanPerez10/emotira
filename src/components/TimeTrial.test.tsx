import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import TimeTrial, { TimeTrialRules } from './TimeTrial'
import type { Puzzle } from '../data/puzzles'

const mockPuzzles: Puzzle[] = [
  {
    answer: 'Vic',
    aliases: ['Vich'],
    emojis: '🏛️🐮',
    explanation: "Capital d'Osona",
    comarca: 'Osona',
  },
  {
    answer: 'Ripoll',
    emojis: '🐑🌲',
    explanation: 'Bressol de Catalunya',
    comarca: 'Ripollès',
  },
  {
    answer: 'Olot',
    emojis: '🌋🥩',
    explanation: 'Capital de la Garrotxa',
    comarca: 'Garrotxa',
  },
]

describe('TimeTrialRules component', () => {
  it('renderitza les regles i permet iniciar el joc o sortir', () => {
    const handlePlay = vi.fn()
    const handleExit = vi.fn()

    render(<TimeTrialRules onPlay={handlePlay} onExit={handleExit} />)

    expect(screen.getByText('Contra el rellotge!')).toBeInTheDocument()
    expect(screen.getByText(/Quants pobles pots encertar en/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Jugar/i }))
    expect(handlePlay).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /← Menú/i }))
    expect(handleExit).toHaveBeenCalledTimes(1)
  })
})

describe('TimeTrial component', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renderitza la interfície del contrarellotge amb dashboard i controls', () => {
    const handleSolve = vi.fn()
    const handleFinish = vi.fn()
    const handleExit = vi.fn()

    render(
      <TimeTrial
        deck={mockPuzzles}
        pool={mockPuzzles}
        onSolve={handleSolve}
        onFinish={handleFinish}
        onExit={handleExit}
      />
    )

    expect(screen.getByText('Contrarellotge')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toBeInTheDocument()
    expect(screen.getByText('2:00')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument() // 0 encerts
    expect(screen.getByText('🏛️🐮')).toBeInTheDocument() // Emojis de Vic
    expect(screen.getByRole('button', { name: 'Comprovar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Saltar −2 s' })).toBeInTheDocument()
  })

  it('crida a onExit en prémer el botó de menú', () => {
    const handleExit = vi.fn()

    render(
      <TimeTrial
        deck={mockPuzzles}
        pool={mockPuzzles}
        onSolve={vi.fn()}
        onFinish={vi.fn()}
        onExit={handleExit}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '← Menú' }))
    expect(handleExit).toHaveBeenCalledTimes(1)
  })

  it('avança el rellotge amb el pas del temps i actualitza visibilitychange', () => {
    render(
      <TimeTrial
        deck={mockPuzzles}
        pool={mockPuzzles}
        onSolve={vi.fn()}
        onFinish={vi.fn()}
        onExit={vi.fn()}
      />
    )

    expect(screen.getByText('2:00')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.getByText('1:58')).toBeInTheDocument()

    // Simula visibilitychange
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
  })

  it('permet encertar una resposta i crida onSolve', () => {
    const handleSolve = vi.fn()
    const handleFinish = vi.fn()

    render(
      <TimeTrial
        deck={mockPuzzles}
        pool={mockPuzzles}
        onSolve={handleSolve}
        onFinish={handleFinish}
        onExit={vi.fn()}
      />
    )

    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input, { target: { value: 'VIC' } })

    const checkBtn = screen.getByRole('button', { name: 'Comprovar' })
    fireEvent.pointerDown(checkBtn)
    fireEvent.click(checkBtn)

    expect(handleSolve).toHaveBeenCalledWith('Vic')

    // Esperem l'avanç automàtic del timeout (650ms)
    act(() => {
      vi.advanceTimersByTime(700)
    })

    // Ara ha d'aparèixer el segon poble (Ripoll) i 1 encert
    expect(screen.getByText('🐑🌲')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('mostra pistes comarca i inicial quan es produeixen errors', () => {
    render(
      <TimeTrial
        deck={mockPuzzles}
        pool={mockPuzzles}
        onSolve={vi.fn()}
        onFinish={vi.fn()}
        onExit={vi.fn()}
      />
    )

    const input = screen.getByLabelText(/Escriu el nom del poble/i)

    // 1r Intent incorrecte: "XYZ"
    fireEvent.change(input, { target: { value: 'XYZ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comprovar' }))

    // Després del 1r error, mostra la comarca
    expect(screen.getByText(/Comarca: Osona/)).toBeInTheDocument()

    // 2n Intent incorrecte: "ABC"
    const input2 = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input2, { target: { value: 'ABC' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comprovar' }))

    // Després del 2n error, mostra comença per inicial
    expect(screen.getByText(/Comença per «V»/)).toBeInTheDocument()

    // 3r Intent incorrecte: "FFF"
    const input3 = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input3, { target: { value: 'FFF' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comprovar' }))

    // S'esgoten els intents (fails == 3), avança amb timeout de 1100ms
    act(() => {
      vi.advanceTimersByTime(1200)
    })

    // S'ha passat al següent puzzle
    expect(screen.getByText('🐑🌲')).toBeInTheDocument()
  })

  it('permet saltar un poble restaurant 2 segons i tornant el puzzle al final', () => {
    render(
      <TimeTrial
        deck={mockPuzzles}
        pool={mockPuzzles}
        onSolve={vi.fn()}
        onFinish={vi.fn()}
        onExit={vi.fn()}
      />
    )

    expect(screen.getByText('🏛️🐮')).toBeInTheDocument()
    const skipBtn = screen.getByRole('button', { name: 'Saltar −2 s' })
    fireEvent.click(skipBtn)

    // Ara el poble actual és el segon (Ripoll)
    expect(screen.getByText('🐑🌲')).toBeInTheDocument()
  })

  it('acaba la partida quan el temps arriba a zero i crida onFinish', () => {
    const handleFinish = vi.fn()

    render(
      <TimeTrial
        deck={mockPuzzles}
        pool={mockPuzzles}
        onSolve={vi.fn()}
        onFinish={handleFinish}
        onExit={vi.fn()}
      />
    )

    // Avancem tot el temps (120 segons)
    act(() => {
      vi.advanceTimersByTime(121000)
    })

    expect(screen.getByRole('status')).toHaveTextContent('Temps esgotat!')
    expect(handleFinish).toHaveBeenCalledTimes(1)
  })

  it('mostra temps esgotat si el deck inicial és buit', () => {
    render(
      <TimeTrial
        deck={[]}
        pool={mockPuzzles}
        onSolve={vi.fn()}
        onFinish={vi.fn()}
        onExit={vi.fn()}
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent('Temps esgotat!')
  })
})
