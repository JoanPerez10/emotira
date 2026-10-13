import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Game from './Game'
import type { Puzzle } from '../data/puzzles'

const mockPuzzles: Puzzle[] = [
  {
    answer: 'Vic',
    aliases: ['Vich'],
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

describe('Game component', () => {
  it('renderitza correctament la interfície bàsica del joc', () => {
    const handleExit = vi.fn()
    const handleFinish = vi.fn()

    render(
      <Game
        title="Clàssic"
        icon="target"
        deck={mockPuzzles}
        pool={mockPuzzles}
        onExit={handleExit}
        onFinish={handleFinish}
      />
    )

    expect(screen.getByText('Clàssic')).toBeInTheDocument()
    expect(screen.getByText('🏛️🐮')).toBeInTheDocument()
    expect(screen.getByText('Poble 1 de 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '← Menú' })).toBeInTheDocument()
  })

  it('crida a onExit en prémer el botó de tornar al menú', () => {
    const handleExit = vi.fn()
    const handleFinish = vi.fn()

    render(
      <Game
        title="Clàssic"
        icon="target"
        deck={mockPuzzles}
        pool={mockPuzzles}
        onExit={handleExit}
        onFinish={handleFinish}
      />
    )

    const backButton = screen.getByRole('button', { name: '← Menú' })
    fireEvent.click(backButton)

    expect(handleExit).toHaveBeenCalledTimes(1)
  })

  it('mostra pistes quan es clica el botó de pista fins a esgotar-les', () => {
    const handleExit = vi.fn()
    const handleFinish = vi.fn()

    render(
      <Game
        title="Clàssic"
        icon="target"
        deck={mockPuzzles}
        pool={mockPuzzles}
        onExit={handleExit}
        onFinish={handleFinish}
      />
    )

    const hintButton = screen.getByRole('button', { name: /Pista/i })
    expect(hintButton).toBeInTheDocument()

    // 1a pista (comarca)
    fireEvent.click(hintButton)
    expect(screen.getByText(/És a la comarca del Osona/i)).toBeInTheDocument()

    // 2a pista (primera lletra)
    fireEvent.click(hintButton)
    expect(screen.getByText(/Comença per «V»/i)).toBeInTheDocument()

    // 3a pista (explicació)
    fireEvent.click(hintButton)
    expect(screen.getByText(/Es forma així: Capital d'Osona/i)).toBeInTheDocument()

    // Botó deshabilitat "Ja ho saps tot"
    expect(screen.getByRole('button', { name: 'Ja ho saps tot' })).toBeDisabled()
  })

  it('permet encertar un poble i avançar al següent', () => {
    const handleExit = vi.fn()
    const handleFinish = vi.fn()
    const handleSolve = vi.fn()

    render(
      <Game
        title="Clàssic"
        icon="target"
        deck={mockPuzzles}
        pool={mockPuzzles}
        onExit={handleExit}
        onFinish={handleFinish}
        onSolve={handleSolve}
      />
    )

    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input, { target: { value: 'VIC' } })

    const checkButton = screen.getByRole('button', { name: 'Comprovar' })
    expect(checkButton).not.toBeDisabled()
    fireEvent.click(checkButton)

    expect(handleSolve).toHaveBeenCalledWith('Vic')
    expect(screen.getByText(/Ho has encertat!/i)).toBeInTheDocument()

    // Clic a Poble següent
    const nextButton = screen.getByRole('button', { name: 'Poble següent' })
    fireEvent.click(nextButton)

    // Ara hauria d'estar al segon poble (Ripoll)
    expect(screen.getByText('Poble 2 de 2')).toBeInTheDocument()
    expect(screen.getByText('🐑🌲')).toBeInTheDocument()

    // Resolem també Ripoll (per validar pobles sense aliases)
    const inputRipoll = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(inputRipoll, { target: { value: 'RIPOLL' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comprovar' }))
    expect(handleSolve).toHaveBeenCalledWith('Ripoll')
  })

  it('accepta àlies en comprovar la resposta', () => {
    const handleFinish = vi.fn()
    const handleSolve = vi.fn()

    render(
      <Game
        title="Clàssic"
        icon="target"
        deck={mockPuzzles}
        pool={mockPuzzles}
        onExit={vi.fn()}
        onFinish={handleFinish}
        onSolve={handleSolve}
      />
    )

    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input, { target: { value: 'VICH' } })

    const checkButton = screen.getByRole('button', { name: 'Comprovar' })
    fireEvent.click(checkButton)

    expect(handleSolve).toHaveBeenCalledWith('Vic')
    expect(screen.getByText(/Ho has encertat!/i)).toBeInTheDocument()
  })

  it('mostra error en fallar i permet rendir-se', () => {
    const handleFinish = vi.fn()

    render(
      <Game
        title="Clàssic"
        icon="target"
        deck={mockPuzzles.slice(0, 1)}
        pool={mockPuzzles}
        onExit={vi.fn()}
        onFinish={handleFinish}
      />
    )

    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input, { target: { value: 'OLL' } })

    const checkButton = screen.getByRole('button', { name: 'Comprovar' })
    fireEvent.click(checkButton)

    expect(screen.getByRole('alert')).toHaveTextContent(/Ups! Prova una altra lletra/i)

    // Rendir-se
    const giveUpButton = screen.getByRole('button', { name: 'Em rendeixo' })
    fireEvent.click(giveUpButton)

    expect(screen.getByText(/Aquest era el nom:/i)).toBeInTheDocument()

    // En ser l'últim poble, el botó diu "Veure el resultat"
    const finishButton = screen.getByRole('button', { name: 'Veure el resultat' })
    fireEvent.click(finishButton)

    expect(handleFinish).toHaveBeenCalledWith(
      expect.objectContaining({ score: 0 })
    )
  })

  it('funciona en mode difícil amb cors i límit d\'intents', () => {
    render(
      <Game
        title="Clàssic"
        icon="target"
        deck={mockPuzzles.slice(0, 1)}
        pool={mockPuzzles}
        hard={true}
        onExit={vi.fn()}
        onFinish={vi.fn()}
      />
    )

    expect(screen.getByLabelText(/Intents restants: 3/i)).toBeInTheDocument()

    // 1r error
    const input1 = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input1, { target: { value: 'AAA' } })
    fireEvent.keyDown(input1, { key: 'Enter' })
    expect(screen.getByLabelText(/Intents restants: 2/i)).toBeInTheDocument()

    // 2n error (LetterInput es remunta en canviar fails)
    const input2 = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input2, { target: { value: 'BBB' } })
    fireEvent.keyDown(input2, { key: 'Enter' })
    expect(screen.getByLabelText(/Intents restants: 1/i)).toBeInTheDocument()

    // 3r error (esgota intents i revela)
    const input3 = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input3, { target: { value: 'CCC' } })
    fireEvent.keyDown(input3, { key: 'Enter' })
    expect(screen.getByText(/Aquest era el nom:/i)).toBeInTheDocument()
  })

  it('en mode difícil les vides són globals durant la partida i no es reinicien entre preguntes', () => {
    const mockThreePuzzles: Puzzle[] = [
      { answer: 'Vic', emojis: '🏛️🐮', explanation: 'Capital d\'Osona', comarca: 'Osona' },
      { answer: 'Ripoll', emojis: '🐑🌲', explanation: 'Bressol de Catalunya', comarca: 'Ripollès' },
      { answer: 'Olot', emojis: '🌋🌳', explanation: 'Volcans', comarca: 'Garrotxa' },
    ]
    const handleFinish = vi.fn()

    render(
      <Game
        title="Mode difícil"
        icon="flame"
        deck={mockThreePuzzles}
        pool={mockThreePuzzles}
        hard={true}
        onExit={vi.fn()}
        onFinish={handleFinish}
      />
    )

    // Comença amb 3 vides
    expect(screen.getByLabelText(/Intents restants: 3/i)).toBeInTheDocument()

    // Poble 1 (Vic): 1 error -> queden 2 vides
    const input1 = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input1, { target: { value: 'AAA' } })
    fireEvent.keyDown(input1, { key: 'Enter' })
    expect(screen.getByLabelText(/Intents restants: 2/i)).toBeInTheDocument()

    // Encerta Vic
    const inputVic = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(inputVic, { target: { value: 'VIC' } })
    fireEvent.keyDown(inputVic, { key: 'Enter' })
    expect(screen.getByText(/Ho has encertat!/i)).toBeInTheDocument()

    // Avança al poble 2
    fireEvent.click(screen.getByRole('button', { name: 'Poble següent' }))

    // Al poble 2 (Ripoll), les vides NO s'han de reiniciar: han de continuar sent 2!
    expect(screen.getByLabelText(/Intents restants: 2/i)).toBeInTheDocument()

    // Poble 2: 1 error -> queden 1 vida
    const input2 = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input2, { target: { value: 'BBB' } })
    fireEvent.keyDown(input2, { key: 'Enter' })
    expect(screen.getByLabelText(/Intents restants: 1/i)).toBeInTheDocument()

    // Encerta Ripoll a la segona (1 error en aquest poble -> 2 punts)
    const inputRipoll = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(inputRipoll, { target: { value: 'RIPOLL' } })
    fireEvent.keyDown(inputRipoll, { key: 'Enter' })
    expect(screen.getByText(/Ho has encertat!/i)).toBeInTheDocument()

    // Avança al poble 3
    fireEvent.click(screen.getByRole('button', { name: 'Poble següent' }))

    // Al poble 3 (Olot), continua tenint 1 vida!
    expect(screen.getByLabelText(/Intents restants: 1/i)).toBeInTheDocument()

    // Poble 3: 1 error -> s'esgota l'última vida (0 restants)
    const input3 = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input3, { target: { value: 'CCC' } })
    fireEvent.keyDown(input3, { key: 'Enter' })

    // Es revela la resposta i, en esgotar les vides globals, s'ofereix veure el resultat
    expect(screen.getByText(/Aquest era el nom:/i)).toBeInTheDocument()
    const finishBtn = screen.getByRole('button', { name: 'Veure el resultat' })
    expect(finishBtn).toBeInTheDocument()

    fireEvent.click(finishBtn)
    expect(handleFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 4, // 2 punts (Vic) + 2 punts (Ripoll) + 0 punts (Olot)
        results: [
          { status: 'correct', hints: 1 },
          { status: 'correct', hints: 1 },
          { status: 'revealed', hints: 1 },
        ],
      })
    )
  })

  it('en mode difícil rendir-se resta una vida i esgotar les vides acaba la partida', () => {
    const mockTwoPuzzles: Puzzle[] = [
      { answer: 'Vic', emojis: '🏛️🐮', explanation: 'Capital d\'Osona', comarca: 'Osona' },
      { answer: 'Ripoll', emojis: '🐑🌲', explanation: 'Bressol de Catalunya', comarca: 'Ripollès' },
    ]
    const handleFinish = vi.fn()

    render(
      <Game
        title="Mode difícil"
        icon="flame"
        deck={mockTwoPuzzles}
        pool={mockTwoPuzzles}
        hard={true}
        onExit={vi.fn()}
        onFinish={handleFinish}
      />
    )

    expect(screen.getByLabelText(/Intents restants: 3/i)).toBeInTheDocument()

    // Clica "Em rendeixo" al 1r poble
    fireEvent.click(screen.getByRole('button', { name: 'Em rendeixo' }))

    // Resta una vida (queden 2) i revela la resposta
    expect(screen.getByLabelText(/Intents restants: 2/i)).toBeInTheDocument()
    expect(screen.getByText(/Aquest era el nom:/i)).toBeInTheDocument()

    // Passa al 2n poble
    fireEvent.click(screen.getByRole('button', { name: 'Poble següent' }))
    expect(screen.getByLabelText(/Intents restants: 2/i)).toBeInTheDocument()

    // 1r error al 2n poble -> queda 1 vida
    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input, { target: { value: 'AAA' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByLabelText(/Intents restants: 1/i)).toBeInTheDocument()

    // Ara es rendeix tenint només 1 vida restant -> perd l'última vida (0 restants)
    fireEvent.click(screen.getByRole('button', { name: 'Em rendeixo' }))
    expect(screen.getByText(/Aquest era el nom:/i)).toBeInTheDocument()

    // El botó ofereix veure el resultat perquè ha perdut totes les vides
    const finishBtn = screen.getByRole('button', { name: 'Veure el resultat' })
    expect(finishBtn).toBeInTheDocument()
    fireEvent.click(finishBtn)

    expect(handleFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 0,
        results: [
          { status: 'revealed', hints: 1 },
          { status: 'revealed', hints: 2 },
        ],
      })
    )
  })

  it('gestiona la modalitat de Música amb textos específics', () => {
    render(
      <Game
        title="Música"
        icon="music"
        deck={mockPuzzles}
        pool={mockPuzzles}
        onExit={vi.fn()}
        onFinish={vi.fn()}
      />
    )

    expect(screen.getByText('Grup 1 de 2')).toBeInTheDocument()

    const hintButton = screen.getByRole('button', { name: /Pista/i })
    fireEvent.click(hintButton)
    expect(screen.getByText(/Origen: Osona/i)).toBeInTheDocument()

    // Resoldre per veure "Grup següent"
    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input, { target: { value: 'VIC' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByRole('button', { name: 'Grup següent' })).toBeInTheDocument()
  })

  it('suporta el mode infinit (endless)', () => {
    const handleExit = vi.fn()
    const handleFinish = vi.fn()

    const { unmount } = render(
      <Game
        title="Infinit"
        icon="infinity"
        deck={mockPuzzles.slice(0, 1)}
        pool={mockPuzzles}
        endless={true}
        onExit={handleExit}
        onFinish={handleFinish}
      />
    )

    expect(screen.getByText(/Ratxa: 0 · 0 punts/i)).toBeInTheDocument()

    // Resoldre el poble
    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input, { target: { value: 'VIC' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // Botó Acabar dins de feedback
    const endButton = screen.getByRole('button', { name: 'Acabar' })
    fireEvent.click(endButton)

    expect(handleFinish).toHaveBeenCalled()
    unmount()

    // Test sortir sense jugar
    render(
      <Game
        title="Infinit"
        icon="infinity"
        deck={mockPuzzles.slice(0, 1)}
        pool={mockPuzzles}
        endless={true}
        onExit={handleExit}
        onFinish={handleFinish}
      />
    )
    const backBtn = screen.getByRole('button', { name: '← Menú' })
    fireEvent.click(backBtn)
    expect(handleExit).toHaveBeenCalled()
  })

  it('permet continuar en mode infinit i barrejar la piscina', () => {
    const handleFinish = vi.fn()
    render(
      <Game
        title="Infinit"
        icon="infinity"
        deck={mockPuzzles.slice(0, 1)}
        pool={mockPuzzles}
        endless={true}
        onExit={vi.fn()}
        onFinish={handleFinish}
      />
    )

    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input, { target: { value: 'VIC' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // Clicar següent en mode infinit quan s'acaba la baralla inicial
    const nextBtn = screen.getByRole('button', { name: 'Poble següent' })
    fireEvent.click(nextBtn)

    // Ara hauria de mostrar el botó d'acabar la partida
    const stopGameBtn = screen.getByRole('button', { name: 'Acabar la partida' })
    fireEvent.click(stopGameBtn)
    expect(handleFinish).toHaveBeenCalled()
  })

  it('gestiona noms amb apòstrofs, puzzles sense comarca i intents buits', () => {
    const puzzleWithApos: Puzzle[] = [
      {
        answer: "L'Escala",
        emojis: '🐟⛵',
        explanation: 'Anxoves',
      },
    ]

    render(
      <Game
        title="Clàssic"
        icon="target"
        deck={puzzleWithApos}
        pool={puzzleWithApos}
        onExit={vi.fn()}
        onFinish={vi.fn()}
      />
    )

    expect(screen.getByText('🐟⛵')).toBeInTheDocument()

    // Com que no té comarca, la primera pista ha de ser la primera lletra
    const hintButton = screen.getByRole('button', { name: /Pista/i })
    fireEvent.click(hintButton)
    expect(screen.getByText(/Comença per «L»/i)).toBeInTheDocument()

    // Test submit buit
    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.keyDown(input, { key: 'Enter' })
  })
})

