import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InverseGame from './InverseGame'
import type { Puzzle } from '../data/puzzles'

describe('InverseGame component', () => {
  const mockPuzzles: Puzzle[] = [
    {
      answer: 'Vic',
      emojis: '🏛️🐮',
      explanation: 'Capital d\'Osona',
      comarca: 'Osona',
    },
    {
      answer: 'Ripoll',
      emojis: '🐑🌲',
      explanation: 'Bressol de Catalunya',
      comarca: 'Ripollès',
    },
  ]

  it('mostra avís si el deck és buit', () => {
    const handleExit = vi.fn()
    render(
      <InverseGame
        deck={[]}
        pool={mockPuzzles}
        onSolve={vi.fn()}
        onFinish={vi.fn()}
        onExit={handleExit}
      />
    )

    expect(screen.getByText('No hi ha pobles disponibles.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '← Menú' }))
    expect(handleExit).toHaveBeenCalled()
  })

  it('permet seleccionar emojis, comprovar i avançar en encertar', () => {
    const handleSolve = vi.fn()
    const handleFinish = vi.fn()

    render(
      <InverseGame
        deck={mockPuzzles}
        pool={mockPuzzles}
        onSolve={handleSolve}
        onFinish={handleFinish}
        onExit={vi.fn()}
      />
    )

    expect(screen.getByText('Vic')).toBeInTheDocument()
    expect(screen.getByText('Poble 1 de 2')).toBeInTheDocument()

    // Clic als emojis correctes de Vic: 🏛️ i 🐮
    const templeBtn = screen.getByRole('button', { name: 'Afegir 🏛️' })
    const cowBtn = screen.getByRole('button', { name: 'Afegir 🐮' })

    fireEvent.click(templeBtn)
    fireEvent.click(cowBtn)

    // Botó Comprovar s'habilita
    const checkBtn = screen.getByRole('button', { name: 'Comprovar' })
    expect(checkBtn).not.toBeDisabled()
    fireEvent.click(checkBtn)

    // Es valida com a correcte
    expect(handleSolve).toHaveBeenCalledWith('Vic')
    expect(screen.getByText(/Encert! 3 punts/i)).toBeInTheDocument()

    // Avançar al següent poble
    const nextBtn = screen.getByRole('button', { name: 'Poble següent' })
    fireEvent.click(nextBtn)

    expect(screen.getByText('Ripoll')).toBeInTheDocument()
    expect(screen.getByText('Poble 2 de 2')).toBeInTheDocument()
  })

  it('permet treure un emoji clicant a la casella', () => {
    render(
      <InverseGame
        deck={mockPuzzles}
        pool={mockPuzzles}
        onSolve={vi.fn()}
        onFinish={vi.fn()}
        onExit={vi.fn()}
      />
    )

    const templeBtn = screen.getByRole('button', { name: 'Afegir 🏛️' })
    fireEvent.click(templeBtn)

    const filledSlot = screen.getByRole('button', { name: /Posició 1: 🏛️, toca per treure/i })
    expect(filledSlot).toBeInTheDocument()

    // Clic a la casella per treure'l
    fireEvent.click(filledSlot)
    expect(screen.getByRole('button', { name: /Posició 1: buida/i })).toBeInTheDocument()
  })

  it('no esborra la resposta introduïda i mostra l\'avís d\'error en fallar', () => {
    render(
      <InverseGame
        deck={mockPuzzles}
        pool={mockPuzzles}
        onSolve={vi.fn()}
        onFinish={vi.fn()}
        onExit={vi.fn()}
      />
    )

    // Posició 1 (🏛️), posició 2 incorrecta (posem 🐑 en comptes de 🐮)
    const templeBtn = screen.getByRole('button', { name: 'Afegir 🏛️' })
    const sheepBtn = screen.getByRole('button', { name: 'Afegir 🐑' })

    fireEvent.click(templeBtn)
    fireEvent.click(sheepBtn)

    const checkBtn = screen.getByRole('button', { name: 'Comprovar' })
    fireEvent.click(checkBtn)

    // Mostra el missatge d'error
    expect(screen.getByRole('alert')).toHaveTextContent(/Ups! Prova un altre emoji/i)

    // No esborra la resposta introduïda
    expect(screen.getByRole('button', { name: /Posició 1: 🏛️/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Posició 2: 🐑/i })).toBeInTheDocument()

    // Permet treure l'emoji incorrecte i amaga l'avís d'error
    const sheepSlot = screen.getByRole('button', { name: /Posició 2: 🐑/i })
    fireEvent.click(sheepSlot)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    // Completa amb el correcte i encerta
    const cowBtn = screen.getByRole('button', { name: 'Afegir 🐮' })
    fireEvent.click(cowBtn)
    fireEvent.click(screen.getByRole('button', { name: 'Comprovar' }))

    expect(screen.getByText(/Encert!/i)).toBeInTheDocument()
  })

  it('permet usar pistes per eliminar distractors', () => {
    const poolWithDistractors: Puzzle[] = [
      ...mockPuzzles,
      { answer: 'P1', emojis: '🍎🍐', explanation: '' },
      { answer: 'P2', emojis: '🍊🍋', explanation: '' },
    ]

    render(
      <InverseGame
        deck={mockPuzzles}
        pool={poolWithDistractors}
        onSolve={vi.fn()}
        onFinish={vi.fn()}
        onExit={vi.fn()}
      />
    )

    const hintBtn = screen.getByRole('button', { name: /Pista \(0\/2\)/i })
    fireEvent.click(hintBtn)

    expect(screen.getByRole('button', { name: /Pista \(1\/2\)/i })).toBeInTheDocument()

    // 2a pista
    fireEvent.click(screen.getByRole('button', { name: /Pista \(1\/2\)/i }))
    expect(screen.getByRole('button', { name: 'Ja ho saps tot' })).toBeDisabled()
  })

  it('permet rendir-se mostrant l\'explicació i finalitzant la partida', () => {
    const handleFinish = vi.fn()

    render(
      <InverseGame
        deck={mockPuzzles.slice(0, 1)}
        pool={mockPuzzles}
        onSolve={vi.fn()}
        onFinish={handleFinish}
        onExit={vi.fn()}
      />
    )

    const surrenderBtn = screen.getByRole('button', { name: 'Em rendeixo' })
    fireEvent.click(surrenderBtn)

    expect(screen.getByText('Aquesta era la combinació:')).toBeInTheDocument()
    expect(screen.getByText('Capital d\'Osona')).toBeInTheDocument()

    // En ser l'últim poble, el botó diu "Veure el resultat"
    const finishBtn = screen.getByRole('button', { name: 'Veure el resultat' })
    fireEvent.click(finishBtn)

    expect(handleFinish).toHaveBeenCalledWith(
      expect.objectContaining({ score: 0 })
    )
  })
})
