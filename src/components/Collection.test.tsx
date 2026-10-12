import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Collection from './Collection'
import type { Puzzle } from '../data/puzzles'

describe('Collection component', () => {
  const mockPool: Puzzle[] = [
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
      explanation: 'Bressol',
      comarca: 'Ripollès',
    },
    {
      answer: 'Olot',
      emojis: '🌋🌳',
      explanation: 'Volcans',
      comarca: 'Garrotxa',
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    // Mock getBoundingClientRect per a CatalunyaMap contingut a Collection
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
    })
  })

  it('renderitza el resum de progrés i la llista de pobles', () => {
    const handleExit = vi.fn()
    render(<Collection pool={mockPool} unlocked={['Vic']} onExit={handleExit} />)

    expect(screen.getByText('🗺️ Col·lecció')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Municipis descoberts' })).toBeInTheDocument()

    // Botó per tornar al menú
    const backBtn = screen.getByRole('button', { name: '← Menú' })
    fireEvent.click(backBtn)
    expect(handleExit).toHaveBeenCalled()

    // El poble descobert (Vic) mostra el seu nom i emojis
    expect(screen.getByText('Vic')).toBeInTheDocument()
    expect(screen.getByText('🏛️🐮')).toBeInTheDocument()
    expect(screen.getByText('Capital d\'Osona')).toBeInTheDocument()

    // Els altres pobles pendents es mostren com a bloquejats
    const hiddenLabels = screen.getAllByText('Poble per descobrir')
    expect(hiddenLabels.length).toBe(2)
  })

  it('permet amagar i mostrar la llista de pobles', () => {
    render(<Collection pool={mockPool} unlocked={['Vic']} onExit={vi.fn()} />)

    const toggleBtn = screen.getByRole('button', { name: /Amagar llista/i })
    expect(toggleBtn).toBeInTheDocument()

    // Clic per amagar
    fireEvent.click(toggleBtn)
    expect(screen.getByRole('button', { name: /Mostrar llista/i })).toBeInTheDocument()
    expect(screen.queryByLabelText('Cerca')).not.toBeInTheDocument()

    // Clic per tornar a mostrar
    fireEvent.click(screen.getByRole('button', { name: /Mostrar llista/i }))
    expect(screen.getByLabelText('Cerca')).toBeInTheDocument()
  })

  it('filtra per estat (Descoberts, Pendents, Tots)', () => {
    render(<Collection pool={mockPool} unlocked={['Vic']} onExit={vi.fn()} />)

    // Filtre Descoberts
    const discoveredBtn = screen.getByRole('button', { name: /^Descoberts/i })
    fireEvent.click(discoveredBtn)

    expect(screen.getByText('Vic')).toBeInTheDocument()
    expect(screen.queryByText('Poble per descobrir')).not.toBeInTheDocument()

    // Filtre Pendents
    const pendingBtn = screen.getByRole('button', { name: /^Pendents/i })
    fireEvent.click(pendingBtn)

    expect(screen.queryByText('Vic')).not.toBeInTheDocument()
    expect(screen.getAllByText('Poble per descobrir')).toHaveLength(2)

    // Netejar filtres
    const clearBtn = screen.getByRole('button', { name: 'Neteja els filtres' })
    fireEvent.click(clearBtn)
    expect(screen.getByText('Vic')).toBeInTheDocument()
  })

  it('permet cercar per text i filtrar per comarca', () => {
    render(<Collection pool={mockPool} unlocked={['Vic']} onExit={vi.fn()} />)

    // Cerca de poble descobert pel nom
    const searchInput = screen.getByLabelText('Cerca')
    fireEvent.change(searchInput, { target: { value: 'Vic' } })
    expect(screen.getByText('Vic')).toBeInTheDocument()

    // Cerca de poble pendent per comarca
    fireEvent.change(searchInput, { target: { value: 'Garrotxa' } })
    expect(screen.getByText('Garrotxa')).toBeInTheDocument()

    // Filtre de comarca des del select
    fireEvent.change(searchInput, { target: { value: '' } })
    const comarcaSelect = screen.getByLabelText('Comarca')
    fireEvent.change(comarcaSelect, { target: { value: 'Ripollès' } })
    expect(screen.getByText('Ripollès')).toBeInTheDocument()

    // Cerca sense coincidències
    fireEvent.change(searchInput, { target: { value: 'inexistent999' } })
    expect(screen.getByText('Cap poble coincideix amb els filtres.')).toBeInTheDocument()
  })

  it('permet canviar el criteri d\'ordenació', () => {
    render(<Collection pool={mockPool} unlocked={['Vic']} onExit={vi.fn()} />)

    const sortSelect = screen.getByLabelText('Ordena per')
    fireEvent.change(sortSelect, { target: { value: 'status' } })
    expect(sortSelect).toHaveValue('status')

    fireEvent.change(sortSelect, { target: { value: 'name' } })
    expect(sortSelect).toHaveValue('name')
  })
})
