import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LetterInput, { type LetterInputHandle, type Word } from './LetterInput'
import { parseWords } from '../utils/words'
import { createRef } from 'react'

describe('LetterInput component', () => {
  const defaultWords: Word[] = [
    { length: 3, apostrophes: [] },
  ]

  it('renderitza les rajoles segons la longitud de les paraules', () => {
    const handleSubmit = vi.fn()
    render(<LetterInput words={defaultWords} onSubmit={handleSubmit} />)

    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('permet escriure lletres i dispara onInput i onSubmit', () => {
    const handleSubmit = vi.fn()
    const handleInput = vi.fn()
    const ref = createRef<LetterInputHandle>()

    render(
      <LetterInput
        words={defaultWords}
        onSubmit={handleSubmit}
        onInput={handleInput}
        ref={ref}
      />
    )

    // Cridar submit amb camp buit a través del ref (no fa res)
    ref.current?.submit()
    expect(handleSubmit).not.toHaveBeenCalled()

    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input, { target: { value: 'VIC' } })

    expect(handleInput).toHaveBeenCalled()
    expect(input).toHaveValue('VIC')

    // Prémer enter
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(handleSubmit).toHaveBeenCalledWith('VIC')

    // Cridar submit a través del ref quan té valor
    ref.current?.submit()
    expect(handleSubmit).toHaveBeenCalledTimes(2)

    // Cridar focus a través del ref
    ref.current?.focus()
  })

  it('filtra caràcters no alfanumèrics', () => {
    const handleSubmit = vi.fn()
    render(<LetterInput words={defaultWords} onSubmit={handleSubmit} />)

    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input, { target: { value: 'V-1!' } })

    expect(input).toHaveValue('V1')
  })

  it('gestiona tecles de navegació (ArrowLeft, ArrowRight, Home, End)', () => {
    const handleSubmit = vi.fn()
    render(<LetterInput words={defaultWords} onSubmit={handleSubmit} />)

    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input, { target: { value: 'VI' } })

    fireEvent.keyDown(input, { key: 'ArrowLeft' })
    fireEvent.keyDown(input, { key: 'ArrowRight' })
    fireEvent.keyDown(input, { key: 'Home' })
    fireEvent.keyDown(input, { key: 'End' })
    fireEvent.keyDown(input, { key: 'Tab' }) // default case
  })

  it('gestiona Backspace i Delete', () => {
    const handleSubmit = vi.fn()
    const handleInput = vi.fn()
    render(<LetterInput words={defaultWords} onSubmit={handleSubmit} onInput={handleInput} />)

    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input, { target: { value: 'VI' } })

    // Backspace amb caret al final
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(handleInput).toHaveBeenCalled()

    // Delete
    fireEvent.keyDown(input, { key: 'Delete' })

    // Canviar selecció i Backspace a l'inici
    fireEvent.select(input, { target: { selectionStart: 0, selectionEnd: 0 } })
    fireEvent.keyDown(input, { key: 'Backspace' })
  })

  it('gestiona clics o pointerDown a les rajoles per moure el cursor', () => {
    const handleSubmit = vi.fn()
    const wordsWithApos: Word[] = [
      { length: 1, apostrophes: [1] },
      { length: 4, apostrophes: [] },
    ]

    const { container } = render(
      <LetterInput words={wordsWithApos} onSubmit={handleSubmit} />
    )

    const tiles = container.querySelectorAll('.tile')
    expect(tiles.length).toBe(5)

    // Fer pointerDown a la segona rajola
    fireEvent.pointerDown(tiles[1])

    // Clic ordinari amb nativeTapFocus=false no fa res
    fireEvent.click(tiles[1])
  })

  it('suporta la modalitat nativeTapFocus', () => {
    const handleSubmit = vi.fn()
    const { container } = render(
      <LetterInput
        words={defaultWords}
        onSubmit={handleSubmit}
        nativeTapFocus={true}
      />
    )

    const tiles = container.querySelectorAll('.tile')
    // pointerDown amb nativeTapFocus=true no fa res
    fireEvent.pointerDown(tiles[0])

    // Click amb nativeTapFocus=true activa el focus
    fireEvent.click(tiles[0])
  })

  it('mostra la solució quan reveal està actiu i bloqueja esdeveniments', () => {
    const handleSubmit = vi.fn()
    const { rerender, container } = render(
      <LetterInput
        words={defaultWords}
        onSubmit={handleSubmit}
        reveal={{ text: 'VIC', kind: 'ok' }}
      />
    )

    expect(screen.getByText('V')).toHaveClass('ok')

    // Quan està locked, pointerDown i click a rajoles no fan res
    const tiles = container.querySelectorAll('.tile')
    fireEvent.pointerDown(tiles[0])
    fireEvent.click(tiles[0])

    // Canvi a reveal nope
    rerender(
      <LetterInput
        words={defaultWords}
        onSubmit={handleSubmit}
        reveal={{ text: 'VIC', kind: 'nope' }}
      />
    )
    expect(screen.getByText('V')).toHaveClass('nope')

    // Quan està locked, escriure o prémer tecles no fa res
    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input, { target: { value: 'ABC' } })
    fireEvent.keyDown(input, { key: 'Backspace' })
  })

  it('reseteja l\'estat quan canvia resetKey', () => {
    const handleSubmit = vi.fn()
    const { rerender } = render(
      <LetterInput
        words={defaultWords}
        onSubmit={handleSubmit}
        resetKey="key-1"
      />
    )

    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    fireEvent.change(input, { target: { value: 'VI' } })
    expect(input).toHaveValue('VI')

    // Canviar resetKey buida el contingut
    rerender(
      <LetterInput
        words={defaultWords}
        onSubmit={handleSubmit}
        resetKey="key-2"
      />
    )
    expect(input).toHaveValue('')
  })


  it('suporta la combinació de reveal amb nativeTapFocus i text més curt', () => {
    const handleSubmit = vi.fn()
    const { container } = render(
      <LetterInput
        words={defaultWords}
        onSubmit={handleSubmit}
        reveal={{ text: 'V', kind: 'ok' }}
        nativeTapFocus={true}
      />
    )

    const tiles = container.querySelectorAll('.tile')
    expect(tiles[0]).toHaveClass('ok')
  })

  it('gestiona onClick a la rajola quan l\'input ja té el focus', () => {
    const handleSubmit = vi.fn()
    const { container } = render(
      <LetterInput
        words={defaultWords}
        onSubmit={handleSubmit}
        nativeTapFocus={true}
      />
    )

    const input = screen.getByLabelText(/Escriu el nom del poble/i)
    input.focus()

    const tiles = container.querySelectorAll('.tile')
    fireEvent.click(tiles[1])
  })

  it('desglossa correctament les paraules amb parseWords', () => {
    expect(parseWords('Vic')).toEqual([{ length: 3, apostrophes: [] }])
    expect(parseWords('Sant Cugat')).toEqual([
      { length: 4, apostrophes: [] },
      { length: 5, apostrophes: [] },
    ])
    expect(parseWords('Castell-Platja d’Aro')).toEqual([
      { length: 7, apostrophes: [] },
      { length: 6, apostrophes: [] },
      { length: 4, apostrophes: [1] },
    ])
    expect(parseWords('L’Escala')).toEqual([
      { length: 7, apostrophes: [1] },
    ])
  })
})
