import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AccountScreen from './AccountScreen'
import { emptyRecords } from '../utils/storage'
import { api } from '../api'
import type { Session } from '../api/types'

describe('AccountScreen component', () => {
  const mockRecords = emptyRecords()
  mockRecords.unlockedTowns = ['Vic', 'Ripoll']
  mockRecords.timeTrial.best = 8
  mockRecords.inverse.best = 24
  mockRecords.music.best = 18

  const mockSession: Session = {
    id: 'user-123',
    username: 'joan_emotira',
    email: 'joan@example.cat',
    isAdmin: false,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    api.enabled = true
  })

  describe('com a convidat (sense sessió)', () => {
    it('renderitza la vista de convidat amb informació del progrés local', () => {
      render(
        <AccountScreen
          session={null}
          records={mockRecords}
          onExit={vi.fn()}
        />
      )

      expect(screen.getByText('👤 Compte')).toBeInTheDocument()
      expect(screen.getByText(/Progrés en aquest dispositiu:/i)).toBeInTheDocument()
      expect(screen.getByText(/2 pobles descoberts/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Crear compte' })).toBeInTheDocument()
    })

    it('permet iniciar sessió satisfactòriament', async () => {
      const signInSpy = vi.spyOn(api.auth, 'signIn').mockResolvedValue(true)

      render(
        <AccountScreen
          session={null}
          records={mockRecords}
          onExit={vi.fn()}
        />
      )

      const emailInput = screen.getByLabelText('Correu')
      const passInput = screen.getByLabelText('Contrasenya')
      const submitBtn = screen.getByRole('button', { name: 'Entrar' })

      fireEvent.change(emailInput, { target: { value: 'joan@example.cat' } })
      fireEvent.change(passInput, { target: { value: 'password123' } })
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(signInSpy).toHaveBeenCalledWith('joan@example.cat', 'password123')
      })
    })

    it('mostra error si les credencials són incorrectes en iniciar sessió', async () => {
      vi.spyOn(api.auth, 'signIn').mockResolvedValue(false)

      render(
        <AccountScreen
          session={null}
          records={mockRecords}
          onExit={vi.fn()}
        />
      )

      fireEvent.change(screen.getByLabelText('Correu'), { target: { value: 'malament@test.cat' } })
      fireEvent.change(screen.getByLabelText('Contrasenya'), { target: { value: 'wrongpass' } })
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /Correu o contrasenya incorrectes/i
      )
    })

    it('permet crear compte amb validacions correctes', async () => {
      vi.spyOn(api.auth, 'usernameAvailable').mockResolvedValue(true)
      const signUpSpy = vi.spyOn(api.auth, 'signUp').mockResolvedValue({ ok: true, needsConfirmation: true })

      render(
        <AccountScreen
          session={null}
          records={mockRecords}
          onExit={vi.fn()}
        />
      )

      // Canviar a pestanya de Crear compte
      fireEvent.click(screen.getByRole('tab', { name: 'Crear compte' }))

      const userInput = screen.getByLabelText(/Nom d'usuari/i)
      const emailInput = screen.getByLabelText('Correu')
      const passInput = screen.getByLabelText('Contrasenya')
      const submitBtn = screen.getByRole('button', { name: 'Crear compte' })

      fireEvent.change(userInput, { target: { value: 'nou_usuari' } })
      fireEvent.change(emailInput, { target: { value: 'nou@example.cat' } })
      fireEvent.change(passInput, { target: { value: 'supersecret123' } })
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(signUpSpy).toHaveBeenCalledWith('nou_usuari', 'nou@example.cat', 'supersecret123')
      })
      expect(await screen.findByRole('status')).toHaveTextContent(/Compte creat!/i)
    })

    it('mostra error si el nom d\'usuari o contrasenya no compleixen els requisits', async () => {
      render(
        <AccountScreen
          session={null}
          records={mockRecords}
          onExit={vi.fn()}
        />
      )

      fireEvent.click(screen.getByRole('tab', { name: 'Crear compte' }))

      // Nom d'usuari massa curt
      fireEvent.change(screen.getByLabelText(/Nom d'usuari/i), { target: { value: 'ab' } })
      fireEvent.change(screen.getByLabelText('Correu'), { target: { value: 'a@b.cat' } })
      fireEvent.change(screen.getByLabelText('Contrasenya'), { target: { value: '12345678' } })
      fireEvent.click(screen.getByRole('button', { name: 'Crear compte' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(/El nom d'usuari ha de tenir 3-20 caràcters/i)

      // Contrasenya massa curta
      fireEvent.change(screen.getByLabelText(/Nom d'usuari/i), { target: { value: 'usuari_bo' } })
      fireEvent.change(screen.getByLabelText('Contrasenya'), { target: { value: 'curta' } })
      fireEvent.click(screen.getByRole('button', { name: 'Crear compte' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(/La contrasenya ha de tenir almenys 8 caràcters/i)
    })

    it('mostra error si l\'API està deshabilitada', async () => {
      api.enabled = false

      render(
        <AccountScreen
          session={null}
          records={mockRecords}
          onExit={vi.fn()}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(/El sistema de comptes no està configurat/i)
    })
  })

  describe('amb sessió iniciada', () => {
    it('mostra el perfil de l\'usuari i les seves estadístiques', () => {
      const handleRanking = vi.fn()
      const handleGroups = vi.fn()

      render(
        <AccountScreen
          session={mockSession}
          records={mockRecords}
          onExit={vi.fn()}
          onGoToRanking={handleRanking}
          onGoToGroups={handleGroups}
        />
      )

      expect(screen.getByText(/👤 joan_emotira/i)).toBeInTheDocument()
      expect(screen.getByText('joan@example.cat')).toBeInTheDocument()
      expect(screen.getByText('🏆 Rècords del jugador')).toBeInTheDocument()

      // Botons de navegació
      const rankBtn = screen.getByRole('button', { name: /Veure el rànquing/i })
      fireEvent.click(rankBtn)
      expect(handleRanking).toHaveBeenCalled()

      const groupsBtn = screen.getByRole('button', { name: /Els meus grups/i })
      fireEvent.click(groupsBtn)
      expect(handleGroups).toHaveBeenCalled()
    })

    it('mostra la xapa d\'administrador si és admin', () => {
      render(
        <AccountScreen
          session={{ ...mockSession, isAdmin: true }}
          records={mockRecords}
          onExit={vi.fn()}
        />
      )

      expect(screen.getByText('Administrador')).toBeInTheDocument()
    })

    it('permet tancar sessió', () => {
      const signOutSpy = vi.spyOn(api.auth, 'signOut')

      render(
        <AccountScreen
          session={mockSession}
          records={mockRecords}
          onExit={vi.fn()}
        />
      )

      const logoutBtn = screen.getByRole('button', { name: 'Sortir' })
      fireEvent.click(logoutBtn)
      expect(signOutSpy).toHaveBeenCalled()
    })

    it('permet esborrar el compte després de confirmació', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      const deleteSpy = vi.spyOn(api.auth, 'deleteAccount').mockResolvedValue(undefined)
      const signOutSpy = vi.spyOn(api.auth, 'signOut')

      render(
        <AccountScreen
          session={mockSession}
          records={mockRecords}
          onExit={vi.fn()}
        />
      )

      const deleteBtn = screen.getByRole('button', { name: 'Esborrar el compte' })
      fireEvent.click(deleteBtn)

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalled()
        expect(signOutSpy).toHaveBeenCalled()
      })
    })

    it('no esborra el compte si l\'usuari cancel·la la confirmació', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      const deleteSpy = vi.spyOn(api.auth, 'deleteAccount')

      render(
        <AccountScreen
          session={mockSession}
          records={mockRecords}
          onExit={vi.fn()}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Esborrar el compte' }))
      expect(deleteSpy).not.toHaveBeenCalled()
    })
  })
})
