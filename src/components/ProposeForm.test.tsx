import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProposeForm from './ProposeForm'
import { api } from '../api'

describe('ProposeForm component', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    api.enabled = true
    localStorage.clear()
  })

  it('renderitza el formulari de proposta inicial', () => {
    const handleExit = vi.fn()
    render(<ProposeForm onExit={handleExit} />)

    expect(screen.getByText(/Proposa un poble/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Poble o ciutat/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Com es forma\?/i)).toBeInTheDocument()

    // Botó Menú
    const backBtn = screen.getByRole('button', { name: '← Menú' })
    fireEvent.click(backBtn)
    expect(handleExit).toHaveBeenCalled()
  })

  it('permet obrir el selector d\'emojis, afegir-ne i esborrar-ne amb ⌫', () => {
    render(<ProposeForm onExit={vi.fn()} />)

    // Obrir selector d'emojis
    const pickerBtn = screen.getByRole('button', { name: "Selector d'emojis" })
    fireEvent.click(pickerBtn)

    expect(screen.getByRole('dialog', { name: "Selector d'emojis" })).toBeInTheDocument()

    // Triar un emoji
    const emojiHouse = screen.getByText('🏠')
    fireEvent.click(emojiHouse)

    // El camp d'emojis ara conté 🏠
    const emojiInput = screen.getByPlaceholderText('Tria els emojis...')
    expect(emojiInput).toHaveValue('🏠')

    // Esborrar amb el botó ⌫
    const backspaceBtn = screen.getByRole('button', { name: "Esborra l'últim emoji" })
    fireEvent.click(backspaceBtn)
    expect(emojiInput).toHaveValue('')
  })

  it('mostra errors de validació per camps buits o invàlids', async () => {
    render(<ProposeForm onExit={vi.fn()} />)

    const submitBtn = screen.getByRole('button', { name: 'Enviar proposta' })

    // 1. Sense emojis
    fireEvent.click(submitBtn)
    expect(await screen.findByRole('alert')).toHaveTextContent(/Afegeix els emojis/i)

    // 2. Afegim emoji però sense nom de poble
    fireEvent.click(screen.getByRole('button', { name: "Selector d'emojis" }))
    fireEvent.click(screen.getByText('🏠'))
    fireEvent.click(submitBtn)
    expect(await screen.findByRole('alert')).toHaveTextContent(/Escriu el nom del poble/i)

    // 3. Posem nom de poble però sense explicació
    fireEvent.change(screen.getByLabelText(/Poble o ciutat/i), { target: { value: 'Nou Poble' } })
    fireEvent.click(submitBtn)
    expect(await screen.findByRole('alert')).toHaveTextContent(/Explica com es forma/i)
  })

  it('valida que no s\'utilitzin emojis que ja existeixen en un poble', async () => {
    render(<ProposeForm onExit={vi.fn()} />)

    // Emojis existents de Roses ('🌹🌹')
    fireEvent.click(screen.getByRole('button', { name: "Selector d'emojis" }))
    const roseBtn = screen.getByText('🌹')
    fireEvent.click(roseBtn)
    fireEvent.click(roseBtn)

    fireEvent.change(screen.getByLabelText(/Poble o ciutat/i), { target: { value: 'Altre Poble' } })
    fireEvent.change(screen.getByLabelText(/Com es forma\?/i), { target: { value: 'Explicació' } })

    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Aquests emojis ja són en un trencaclosques existent/i
    )
  })

  it('envia correctament la proposta i mostra la pantalla de gràcies', async () => {
    const submitSpy = vi.spyOn(api, 'submitProposal').mockResolvedValue(undefined)
    const handleExit = vi.fn()

    render(<ProposeForm onExit={handleExit} />)

    // Afegir emojis únics (ex: 🦊🏖️)
    fireEvent.click(screen.getByRole('button', { name: "Selector d'emojis" }))
    fireEvent.click(screen.getByText('🦊'))
    fireEvent.click(screen.getByText('🏖️'))

    fireEvent.change(screen.getByLabelText(/Poble o ciutat/i), { target: { value: 'Poble Nou' } })
    fireEvent.change(screen.getByLabelText(/Com es forma\?/i), { target: { value: 'Guineu + Platja' } })
    fireEvent.change(screen.getByLabelText(/Comarca/i), { target: { value: 'Maresme' } })

    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }))

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith({
        emojis: '🦊🏖️',
        answer: 'Poble Nou',
        explanation: 'Guineu + Platja',
        comarca: 'Maresme',
      })
    })

    // Pantalla de confirmació
    expect(await screen.findByText('🎉 Gràcies!')).toBeInTheDocument()

    // Botó Menú des de la pantalla de gràcies
    fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
    expect(handleExit).toHaveBeenCalled()
  })

  it('permet proposar-ne una altra després d\'un enviament', async () => {
    vi.spyOn(api, 'submitProposal').mockResolvedValue(undefined)

    render(<ProposeForm onExit={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: "Selector d'emojis" }))
    fireEvent.click(screen.getByText('🦊'))
    fireEvent.click(screen.getByText('🏖️'))
    fireEvent.change(screen.getByLabelText(/Poble o ciutat/i), { target: { value: 'Poble Nou' } })
    fireEvent.change(screen.getByLabelText(/Com es forma\?/i), { target: { value: 'Explicació' } })

    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }))

    const anotherBtn = await screen.findByRole('button', { name: 'Proposar-ne una altra' })
    fireEvent.click(anotherBtn)

    // Formulari restablert
    expect(screen.getByLabelText(/Poble o ciutat/i)).toHaveValue('')
  })

  it('fingeix èxit immediat si s\'activa el honeypot', async () => {
    const submitSpy = vi.spyOn(api, 'submitProposal')

    const { container } = render(<ProposeForm onExit={vi.fn()} />)

    // Trobar input honeypot
    const hpInput = container.querySelector('.hp input')
    expect(hpInput).toBeInTheDocument()
    fireEvent.change(hpInput!, { target: { value: 'bot-spam-url.com' } })

    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }))

    expect(await screen.findByText('🎉 Gràcies!')).toBeInTheDocument()
    expect(submitSpy).not.toHaveBeenCalled()
  })
})
