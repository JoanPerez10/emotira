import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EmojiPicker from './EmojiPicker'

describe('EmojiPicker component', () => {
  it('renderitza els grups d\'emojis inicials', () => {
    const handlePick = vi.fn()
    render(<EmojiPicker selected="🏠" onPick={handlePick} />)

    expect(screen.getByRole('dialog', { name: "Selector d'emojis" })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Cerca: casa, mar, gos/i)).toBeInTheDocument()

    // Comprovar categories
    expect(screen.getByText('Llocs i natura')).toBeInTheDocument()
    expect(screen.getByText('Animals')).toBeInTheDocument()

    // L'emoji casa ha d'estar seleccionat (aria-pressed)
    const houseEmoji = screen.getByText('🏠')
    expect(houseEmoji).toHaveAttribute('aria-pressed', 'true')
  })

  it('crida a onPick en clicar sobre un emoji', () => {
    const handlePick = vi.fn()
    render(<EmojiPicker selected="" onPick={handlePick} />)

    const houseEmoji = screen.getByText('🏠')
    fireEvent.click(houseEmoji)

    expect(handlePick).toHaveBeenCalledWith('🏠')
  })

  it('filtra emojis mitjançant la cerca i permet netejar el camp', () => {
    const handlePick = vi.fn()
    render(<EmojiPicker selected="" onPick={handlePick} />)

    const searchInput = screen.getByPlaceholderText(/Cerca: casa, mar, gos/i)
    fireEvent.change(searchInput, { target: { value: 'gos' } })

    // Mostra el comptador de resultats
    expect(screen.getByText(/resultat/i)).toBeInTheDocument()

    // Té botó per netejar la cerca
    const clearBtn = screen.getByRole('button', { name: 'Neteja la cerca' })
    expect(clearBtn).toBeInTheDocument()

    fireEvent.click(clearBtn)
    expect(searchInput).toHaveValue('')
    expect(screen.getByText('Llocs i natura')).toBeInTheDocument()
  })

  it('mostra un missatge quan cap emoji coincideix amb la cerca', () => {
    render(<EmojiPicker selected="" onPick={vi.fn()} />)

    const searchInput = screen.getByPlaceholderText(/Cerca: casa, mar, gos/i)
    fireEvent.change(searchInput, { target: { value: 'inexistent999' } })

    expect(screen.getByText(/Cap emoji per «inexistent999»/i)).toBeInTheDocument()
  })
})
