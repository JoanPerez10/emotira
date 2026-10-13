import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DevBanner from './DevBanner'
import { api } from '../api'
import * as mockApiModule from '../api/mockApi'

describe('DevBanner component', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('no es renderitza si el mode no és mock', () => {
    api.mode = 'supabase'
    const { container } = render(<DevBanner />)

    expect(container).toBeEmptyDOMElement()
  })

  it('es renderitza quan el mode és mock', () => {
    api.mode = 'mock'
    render(<DevBanner />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/Mode developer/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reiniciar dades' })).toBeInTheDocument()
  })

  it('permet reiniciar les dades quan l\'usuari accepta la confirmació', () => {
    api.mode = 'mock'
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const resetSpy = vi.spyOn(mockApiModule, 'resetMockDb').mockImplementation(() => {})

    // Mock window.location.reload
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: reloadMock },
    })

    render(<DevBanner />)

    const resetBtn = screen.getByRole('button', { name: 'Reiniciar dades' })
    fireEvent.click(resetBtn)

    expect(resetSpy).toHaveBeenCalled()
    expect(reloadMock).toHaveBeenCalled()
  })

  it('no reinicia les dades si l\'usuari cancel·la la confirmació', () => {
    api.mode = 'mock'
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const resetSpy = vi.spyOn(mockApiModule, 'resetMockDb')

    render(<DevBanner />)

    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar dades' }))

    expect(resetSpy).not.toHaveBeenCalled()
  })
})
