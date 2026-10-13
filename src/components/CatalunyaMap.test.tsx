import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CatalunyaMap from './CatalunyaMap'
import type { Collection } from '../utils/collection'
import { MUNICIPIS } from '../data/catalunyaMap'

describe('CatalunyaMap component', () => {
  const firstMuni = MUNICIPIS[0] // Bausen (id: 250450, c: 39 -> Val d'Aran)

  const mockCollection: Collection = {
    entries: [
      {
        puzzle: { answer: 'Bausen', emojis: '🌲🏔️', explanation: 'Bosc de Carlac', comarca: 'Val d\'Aran' },
        municipiId: firstMuni.id,
        comarca: 'Val d\'Aran',
        unlocked: true,
      },
    ],
    byMunicipi: new Map([
      [
        firstMuni.id,
        [
          {
            puzzle: { answer: 'Bausen', emojis: '🌲🏔️', explanation: 'Bosc de Carlac', comarca: 'Val d\'Aran' },
            municipiId: firstMuni.id,
            comarca: 'Val d\'Aran',
            unlocked: true,
          },
        ],
      ],
    ]),
    unlockedMunicipis: new Set([firstMuni.id]),
  }

  beforeEach(() => {
    // Mock getBoundingClientRect per a jsdom
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

  it('renderitza l\'element SVG del mapa i els controls de navegació', () => {
    render(<CatalunyaMap collection={mockCollection} />)

    const mapSvg = screen.getByRole('img', { name: /Mapa de Catalunya per municipis/i })
    expect(mapSvg).toBeInTheDocument()

    // Controls de zoom
    expect(screen.getByRole('button', { name: /Apropar el mapa/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Allunyar el mapa/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Mostrar tot el mapa/i })).toBeDisabled()

    // Pista inicial de peu
    expect(screen.getByText(/Passa el ratolí o toca un municipi/i)).toBeInTheDocument()
  })

  it('permet apropar, allunyar i restablir la vista amb els controls', () => {
    render(<CatalunyaMap collection={mockCollection} />)

    const zoomInBtn = screen.getByRole('button', { name: /Apropar el mapa/i })
    const zoomOutBtn = screen.getByRole('button', { name: /Allunyar el mapa/i })
    const resetBtn = screen.getByRole('button', { name: /Mostrar tot el mapa/i })

    // Apropar
    fireEvent.click(zoomInBtn)
    expect(zoomOutBtn).not.toBeDisabled()
    expect(resetBtn).not.toBeDisabled()

    // Allunyar
    fireEvent.click(zoomOutBtn)

    // Apropar i després restablir
    fireEvent.click(zoomInBtn)
    fireEvent.click(resetBtn)
    expect(resetBtn).toBeDisabled()
  })

  it('mostra la fitxa d\'un municipi descobert en seleccionar-lo', () => {
    const { container } = render(<CatalunyaMap collection={mockCollection} />)

    const targetPath = container.querySelector(`[data-id="${firstMuni.id}"]`)
    expect(targetPath).toBeInTheDocument()

    // Simular un tap (pointerDown + pointerUp sense moure)
    fireEvent.pointerDown(targetPath!, { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerUp(targetPath!, { pointerId: 1, clientX: 100, clientY: 100 })

    // Comprovar que es mostra la informació del municipi
    expect(screen.getByText(firstMuni.n)).toBeInTheDocument()
    expect(screen.getByText('🌲🏔️')).toBeInTheDocument()
    expect(screen.getByText('Bosc de Carlac')).toBeInTheDocument()
    expect(screen.getByText('✅ Descobert')).toBeInTheDocument()
  })

  it('mostra l\'estat bloquejat quan se selecciona un municipi no descobert', () => {
    const secondMuni = MUNICIPIS[1]
    const { container } = render(<CatalunyaMap collection={mockCollection} />)

    const targetPath = container.querySelector(`[data-id="${secondMuni.id}"]`)
    expect(targetPath).toBeInTheDocument()

    fireEvent.pointerDown(targetPath!, { pointerId: 1, clientX: 50, clientY: 50 })
    fireEvent.pointerUp(targetPath!, { pointerId: 1, clientX: 50, clientY: 50 })

    expect(screen.getByText(secondMuni.n)).toBeInTheDocument()
    expect(screen.getByText('🔒 Per descobrir')).toBeInTheDocument()
  })

  it('suporta hover de ratolí i neteja en sortir', () => {
    const { container } = render(<CatalunyaMap collection={mockCollection} />)

    const svg = screen.getByRole('img', { name: /Mapa de Catalunya per municipis/i })
    const targetPath = container.querySelector(`[data-id="${firstMuni.id}"]`)

    // Hover amb ratolí
    fireEvent.pointerMove(targetPath!, { pointerType: 'mouse', pointerId: 2, clientX: 200, clientY: 200 })
    expect(screen.getByText(firstMuni.n)).toBeInTheDocument()

    // pointerLeave
    fireEvent.pointerLeave(svg, { pointerType: 'mouse' })
    expect(screen.getByText(/Passa el ratolí o toca un municipi/i)).toBeInTheDocument()
  })

  it('gestiona zoom mitjançant la roda del ratolí amb Ctrl/Meta', () => {
    render(<CatalunyaMap collection={mockCollection} />)

    const svg = screen.getByRole('img', { name: /Mapa de Catalunya per municipis/i })

    // Roda sense Ctrl no fa zoom
    fireEvent.wheel(svg, { ctrlKey: false, deltaY: -100 })
    expect(screen.getByRole('button', { name: /Allunyar el mapa/i })).toBeDisabled()

    // Roda amb Ctrl sí que fa zoom
    fireEvent.wheel(svg, { ctrlKey: true, deltaY: -100, clientX: 100, clientY: 100 })
    expect(screen.getByRole('button', { name: /Allunyar el mapa/i })).not.toBeDisabled()
  })

  it('suporta arrossegament (pan) del mapa quan s\'ha fet zoom', () => {
    render(<CatalunyaMap collection={mockCollection} />)

    const svg = screen.getByRole('img', { name: /Mapa de Catalunya per municipis/i })
    const zoomInBtn = screen.getByRole('button', { name: /Apropar el mapa/i })
    fireEvent.click(zoomInBtn)

    // Simula arrossegament (pointerDown -> pointerMove -> pointerUp)
    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 100, clientY: 100, pointerType: 'touch' })
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 150, clientY: 160, pointerType: 'touch' })
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 150, clientY: 160, pointerType: 'touch' })

    // Cancel·lació de gest amb pointerCancel
    fireEvent.pointerDown(svg, { pointerId: 2, clientX: 50, clientY: 50, pointerType: 'touch' })
    fireEvent.pointerCancel(svg, { pointerId: 2 })
  })

  it('suporta gest de pessic amb dos punters (pinch-to-zoom)', () => {
    render(<CatalunyaMap collection={mockCollection} />)

    const svg = screen.getByRole('img', { name: /Mapa de Catalunya per municipis/i })

    // Punter 1 i Punter 2
    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerDown(svg, { pointerId: 2, clientX: 200, clientY: 200 })

    // Moviment que separa els dits
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 80, clientY: 80 })
    fireEvent.pointerMove(svg, { pointerId: 2, clientX: 250, clientY: 250 })

    fireEvent.pointerUp(svg, { pointerId: 1 })
    fireEvent.pointerUp(svg, { pointerId: 2 })
  })
})
