import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Icon, { type IconName } from './Icon'

describe('Icon component', () => {
  const iconNames: IconName[] = [
    'timer',
    'calendar',
    'target',
    'reverse',
    'flame',
    'infinity',
    'map',
    'trophy',
    'lightbulb',
    'share',
    'check',
    'plus',
    'music',
  ]

  it.each(iconNames)('renderitza correctament la icona %s', (name) => {
    const { container } = render(<Icon name={name} size={24} className="test-icon" />)
    const svg = container.querySelector('svg')

    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('width', '24')
    expect(svg).toHaveAttribute('height', '24')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveClass('test-icon')
  })

  it('aplica la mida per defecte quan no s\'especifica', () => {
    const { container } = render(<Icon name="target" />)
    const svg = container.querySelector('svg')

    expect(svg).toHaveAttribute('width', '22')
    expect(svg).toHaveAttribute('height', '22')
  })
})
