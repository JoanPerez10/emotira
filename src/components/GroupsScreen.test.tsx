import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GroupsScreen from './GroupsScreen'
import { api } from '../api'
import type { GroupInfo, GroupRankRow, Session } from '../api/types'

describe('GroupsScreen component', () => {
  const mockSession: Session = {
    id: 'user-1',
    username: 'joan_emotira',
    email: 'joan@emotira.cat',
    isAdmin: false,
  }

  const mockGroups: GroupInfo[] = [
    {
      id: 'group-1',
      name: 'Amics d\'Osona',
      code: 'OSO123',
      members: 4,
    },
  ]

  const mockRanking: GroupRankRow[] = [
    {
      rank: 1,
      username: 'joan_emotira',
      value: 30,
      isMe: true,
      mode: 'ten',
    },
    {
      rank: 2,
      username: 'maria',
      value: 28,
      isMe: false,
      mode: 'ten',
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    api.enabled = true
  })

  it('mostra invitació a iniciar sessió si no hi ha sessió', () => {
    const handleLogin = vi.fn()
    render(<GroupsScreen session={null} onExit={vi.fn()} onLogin={handleLogin} />)

    expect(screen.getByText(/Per crear un grup o unir-t'hi, necessites un compte/i)).toBeInTheDocument()

    const loginBtn = screen.getByRole('button', { name: /Entrar \/ Crear compte/i })
    fireEvent.click(loginBtn)
    expect(handleLogin).toHaveBeenCalled()
  })

  it('carrega i mostra la llista de grups de l\'usuari', async () => {
    vi.spyOn(api.groups, 'list').mockResolvedValue(mockGroups)

    render(<GroupsScreen session={mockSession} onExit={vi.fn()} onLogin={vi.fn()} />)

    expect(await screen.findByText("Amics d'Osona")).toBeInTheDocument()
    expect(screen.getByText(/4 membres/i)).toBeInTheDocument()
  })

  it('mostra missatge quan l\'usuari encara no pertany a cap grup', async () => {
    vi.spyOn(api.groups, 'list').mockResolvedValue([])

    render(<GroupsScreen session={mockSession} onExit={vi.fn()} onLogin={vi.fn()} />)

    expect(await screen.findByText(/Encara no ets a cap grup/i)).toBeInTheDocument()
  })

  it('mostra error si falla la càrrega inicial de grups', async () => {
    vi.spyOn(api.groups, 'list').mockRejectedValueOnce(new Error('Error en carregar grups'))

    render(<GroupsScreen session={mockSession} onExit={vi.fn()} onLogin={vi.fn()} />)

    expect(await screen.findByText('Error en carregar grups')).toBeInTheDocument()
  })

  it('mostra error si falla refresh després de sortir d\'un grup', async () => {
    vi.spyOn(api.groups, 'list')
      .mockResolvedValueOnce(mockGroups)
      .mockRejectedValueOnce(new Error('Error de refresc'))
    vi.spyOn(api.groups, 'ranking').mockResolvedValue(mockRanking)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(api.groups, 'leave').mockResolvedValue(undefined)

    render(<GroupsScreen session={mockSession} onExit={vi.fn()} onLogin={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Veure rànquing' }))
    const leaveBtn = await screen.findByRole('button', { name: 'Sortir del grup' })
    fireEvent.click(leaveBtn)

    expect(await screen.findByText('Error de refresc')).toBeInTheDocument()
  })

  it('permet crear un nou grup', async () => {
    vi.spyOn(api.groups, 'list').mockResolvedValue([])
    const createSpy = vi.spyOn(api.groups, 'create').mockResolvedValue(mockGroups[0])
    vi.spyOn(api.groups, 'ranking').mockResolvedValue(mockRanking)

    render(<GroupsScreen session={mockSession} onExit={vi.fn()} onLogin={vi.fn()} />)

    const nameInput = screen.getByLabelText('Crear un grup nou')
    const createBtn = screen.getByRole('button', { name: 'Crear grup' })

    fireEvent.change(nameInput, { target: { value: "Amics d'Osona" } })
    fireEvent.click(createBtn)

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith("Amics d'Osona")
    })
  })

  it('permet unir-se a un grup mitjançant un codi', async () => {
    vi.spyOn(api.groups, 'list').mockResolvedValue([])
    const joinSpy = vi.spyOn(api.groups, 'join').mockResolvedValue(mockGroups[0])
    vi.spyOn(api.groups, 'ranking').mockResolvedValue(mockRanking)

    render(<GroupsScreen session={mockSession} onExit={vi.fn()} onLogin={vi.fn()} />)

    const codeInput = screen.getByLabelText('Unir-me amb un codi')
    const joinBtn = screen.getByRole('button', { name: 'Unir-me' })

    fireEvent.change(codeInput, { target: { value: 'OSO123' } })
    fireEvent.click(joinBtn)

    await waitFor(() => {
      expect(joinSpy).toHaveBeenCalledWith('OSO123')
    })
  })

  it('obre la vista detallada del grup amb el rànquing i permet copiar el codi', async () => {
    vi.spyOn(api.groups, 'list').mockResolvedValue(mockGroups)
    vi.spyOn(api.groups, 'ranking').mockResolvedValue(mockRanking)

    const writeTextSpy = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    })

    render(<GroupsScreen session={mockSession} onExit={vi.fn()} onLogin={vi.fn()} />)

    const viewRankBtn = await screen.findByRole('button', { name: 'Veure rànquing' })
    fireEvent.click(viewRankBtn)

    expect(await screen.findByText('OSO123')).toBeInTheDocument()
    expect(screen.getByText(/joan_emotira \(tu\)/i)).toBeInTheDocument()
    expect(screen.getByText('maria')).toBeInTheDocument()

    // Copiar el codi
    const copyBtn = screen.getByRole('button', { name: 'Copiar' })
    fireEvent.click(copyBtn)

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith('OSO123')
    })
    expect(screen.getByRole('button', { name: 'Copiat' })).toBeInTheDocument()

    // Tornar enrere a la llista de grups
    const backBtn = screen.getByRole('button', { name: '← Els meus grups' })
    fireEvent.click(backBtn)
    expect(screen.getByText("Amics d'Osona")).toBeInTheDocument()
  })

  it('permet sortir d\'un grup després de confirmar', async () => {
    vi.spyOn(api.groups, 'list').mockResolvedValue(mockGroups)
    vi.spyOn(api.groups, 'ranking').mockResolvedValue(mockRanking)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const leaveSpy = vi.spyOn(api.groups, 'leave').mockResolvedValue(undefined)

    render(<GroupsScreen session={mockSession} onExit={vi.fn()} onLogin={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Veure rànquing' }))
    const leaveBtn = await screen.findByRole('button', { name: 'Sortir del grup' })
    fireEvent.click(leaveBtn)

    await waitFor(() => {
      expect(leaveSpy).toHaveBeenCalledWith('group-1')
    })
  })

  it('no surt del grup si l\'usuari cancel·la el diàleg de confirmació', async () => {
    vi.spyOn(api.groups, 'list').mockResolvedValue(mockGroups)
    vi.spyOn(api.groups, 'ranking').mockResolvedValue(mockRanking)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const leaveSpy = vi.spyOn(api.groups, 'leave')

    render(<GroupsScreen session={mockSession} onExit={vi.fn()} onLogin={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Veure rànquing' }))
    const leaveBtn = await screen.findByRole('button', { name: 'Sortir del grup' })
    fireEvent.click(leaveBtn)

    expect(leaveSpy).not.toHaveBeenCalled()
  })

  it('mostra missatges d\'error quan fallen les operacions de grups', async () => {
    vi.spyOn(api.groups, 'list').mockResolvedValue(mockGroups)
    vi.spyOn(api.groups, 'ranking').mockRejectedValue(new Error('Error de rànquing'))
    vi.spyOn(api.groups, 'create').mockRejectedValue(new Error('Nom invàlid'))
    vi.spyOn(api.groups, 'join').mockRejectedValue(new Error('Codi inexistent'))
    vi.spyOn(api.groups, 'leave').mockRejectedValue(new Error('Error al sortir'))
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<GroupsScreen session={mockSession} onExit={vi.fn()} onLogin={vi.fn()} />)

    // Error a create
    const nameInput = await screen.findByLabelText('Crear un grup nou')
    fireEvent.change(nameInput, { target: { value: 'Grup Nou' } })
    fireEvent.submit(nameInput.closest('form')!)
    expect(await screen.findByText('Nom invàlid')).toBeInTheDocument()

    // Error a join
    const codeInput = screen.getByLabelText('Unir-me amb un codi')
    fireEvent.change(codeInput, { target: { value: 'OSO123' } })
    fireEvent.submit(codeInput.closest('form')!)
    expect(await screen.findByText('Codi inexistent')).toBeInTheDocument()

    // Error a open (ranking)
    fireEvent.click(screen.getByRole('button', { name: 'Veure rànquing' }))
    expect(await screen.findByText('Error de rànquing')).toBeInTheDocument()

    // Error a leave
    const leaveBtn = screen.getByRole('button', { name: 'Sortir del grup' })
    fireEvent.click(leaveBtn)
    expect(await screen.findByText('Error al sortir')).toBeInTheDocument()
  })

  it('gestiona l\'error de porta-retalls en copiar el codi', async () => {
    vi.spyOn(api.groups, 'list').mockResolvedValue(mockGroups)
    vi.spyOn(api.groups, 'ranking').mockResolvedValue(mockRanking)
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard blocked')),
      },
    })

    render(<GroupsScreen session={mockSession} onExit={vi.fn()} onLogin={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Veure rànquing' }))
    const copyBtn = await screen.findByRole('button', { name: 'Copiar' })
    fireEvent.click(copyBtn)

    // No s'ha posat en estat «Copiat»
    expect(screen.queryByRole('button', { name: 'Copiat' })).not.toBeInTheDocument()
  })
})
