import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ModeTabs from './ModeTabs'
import { MODES, MODE_TITLES } from '../modes'

describe('ModeTabs component', () => {
  it('renderitza totes les pestanyes de modes', () => {
    const handleChange = vi.fn()
    render(<ModeTabs mode="ten" onChange={handleChange} />)

    expect(screen.getByRole('tablist')).toBeInTheDocument()

    for (const m of MODES) {
      const tab = screen.getByRole('tab', { name: new RegExp(MODE_TITLES[m], 'i') })
      expect(tab).toBeInTheDocument()
      if (m === 'ten') {
        expect(tab).toHaveAttribute('aria-selected', 'true')
        expect(tab).not.toHaveClass('ghost')
      } else {
        expect(tab).toHaveAttribute('aria-selected', 'false')
        expect(tab).toHaveClass('ghost')
      }
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
