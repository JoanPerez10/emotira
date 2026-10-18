import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import GuineuIcon, { type GuineuName } from './GuineuIcon'

describe('GuineuIcon component', () => {
  const names: GuineuName[] = [
    'check',
    'lock',
    'lifeUp',
    'lifeDown',
    'profile',
    'group',
    'idea',
    'vote',
    'ranking',
  ]

  it.each(names)('renderitza el dibuix %s com a imatge decorativa', (name) => {
    const { container } = render(<GuineuIcon name={name} size={24} className="test-icon" />)
    const img = container.querySelector('img')

    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', expect.stringContaining('/assets/'))
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('aria-hidden', 'true')
    expect(img).toHaveAttribute('height', '24')
    expect(img).toHaveClass('guineu', 'test-icon')
  })

  it('aplica la mida per defecte quan no s\'especifica', () => {
    const { container } = render(<GuineuIcon name="check" />)

    expect(container.querySelector('img')).toHaveAttribute('height', '20')
  })

  it('llegeix el text alternatiu només quan el dibuix és tot el que explica', () => {
    const { container, rerender } = render(<GuineuIcon name="lock" label="Bloquejat" />)
    const img = container.querySelector('img')

    expect(img).toHaveAttribute('alt', 'Bloquejat')
    expect(img).not.toHaveAttribute('aria-hidden')

    rerender(<GuineuIcon name="check" />)
    expect(container.querySelector('img')).toHaveAttribute('aria-hidden', 'true')
  })
})