import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ModeTabs from './ModeTabs'
import { MODES, MODE_TITLES, MODE_IMAGES } from '../modes'

describe('ModeTabs component', () => {
  it('renderitza totes les pestanyes de modes', () => {
    const handleChange = vi.fn()
    render(<ModeTabs mode="ten" onChange={handleChange} />)

    expect(screen.getByRole('tablist')).toBeInTheDocument()

    for (const m of MODES) {
      const tab = screen.getByRole('tab', { name: new RegExp(MODE_TITLES[m], 'i') })
      expect(tab).toBeInTheDocument()
      // L'estat el marca `aria-selected` i el contorn, no cap classe: les
      // pastilles del selector no tenen vora de baix.
      expect(tab).toHaveAttribute('aria-selected', String(m === 'ten'))
      expect(tab).not.toHaveClass('ghost')
      // Porten el dibuix del mode, no una icona de traç.
      const mark = tab.querySelector('img.tabs-mark')
      expect(mark?.getAttribute('src')).toBe(MODE_IMAGES[m])
      expect(tab.querySelector('svg')).toBeNull()
    }
  })

  it('crida a onChange en fer clic a una altra pestanya', () => {
    const handleChange = vi.fn()
    render(<ModeTabs mode="ten" onChange={handleChange} />)

    const hardTab = screen.getByRole('tab', { name: new RegExp(MODE_TITLES.hard, 'i') })
    fireEvent.click(hardTab)

    expect(handleChange).toHaveBeenCalledWith('hard')
  })
})
