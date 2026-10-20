import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ResultTiles, { DailyTiles } from './ResultTiles'
import type { PuzzleResult } from '../types'

const correct: PuzzleResult = { status: 'correct', hints: 0 }
const withHelp: PuzzleResult = { status: 'correct', hints: 2 }
const failed: PuzzleResult = { status: 'revealed', hints: 0 }

const tiles = () => Array.from(screen.getByRole('list').children)

describe('ResultTiles', () => {
  it('dibuixa un quadrat numerat per poble, en ordre de joc', () => {
    render(<ResultTiles results={[correct, withHelp, failed]} />)

    const items = screen.getByRole('list').children
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('1')
    expect(items[2]).toHaveTextContent('3')
  })

  it('pinta cada quadrat segons com ha acabat el poble', () => {
    render(<ResultTiles results={[correct, withHelp, failed]} />)

    expect(tiles()[0]).toHaveClass('t-ok')
    expect(tiles()[1]).toHaveClass('t-hint')
    expect(tiles()[2]).toHaveClass('t-nope')
  })

  it('explica en veu alta com ha anat cada poble', () => {
    render(<ResultTiles results={[correct, withHelp, failed]} />)

    expect(screen.getByText('poble 1: encertat a la primera')).toBeInTheDocument()
    expect(screen.getByText('poble 2: encertat amb ajuda')).toBeInTheDocument()
    expect(screen.getByText('poble 3: no encertat')).toBeInTheDocument()
  })

  it('parla de grups quan el mode juga amb grups', () => {
    render(<ResultTiles results={[correct]} noun="grup" />)

    expect(screen.getByRole('list', { name: 'Resultat de cada grup' })).toBeInTheDocument()
    expect(screen.getByText('grup 1: encertat a la primera')).toBeInTheDocument()
  })

  it('no dibuixa res quan no hi ha cap resultat', () => {
    const { container } = render(<ResultTiles results={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('acota la mida dels quadrats quan hi ha molts pobles', () => {
    const many = Array.from({ length: 14 }, () => correct)
    const { container } = render(<ResultTiles results={many} />)

    expect(container.querySelector('ol')).toHaveClass('is-many')
  })

  it('DailyTiles tradueix el text que es desa del repte diari', () => {
    render(<DailyTiles glyphs="🟩🟨🟥" />)

    const items = screen.getByRole('list', { name: /de cada poble d'avui/i }).children
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveClass('t-ok')
    expect(items[1]).toHaveClass('t-hint')
    expect(items[2]).toHaveClass('t-nope')
  })

  it('DailyTiles no mostra els números, només els colors', () => {
    const { container } = render(<DailyTiles glyphs="🟩🟩" />)

    expect(container.querySelector('ol')).toHaveClass('is-sm')
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })
})