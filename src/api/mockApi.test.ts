import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mockApi, resetMockDb } from './mockApi'
import { emptyRecords } from '../utils/storage'

describe('mockApi', () => {
  beforeEach(() => {
    localStorage.clear()
    resetMockDb()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Propostes i votacions', () => {
    it('permet enviar noves propostes', async () => {
      await mockApi.submitProposal({
        emojis: '🌸🏔️',
        answer: 'Camprodon',
        explanation: 'Vall de Camprodon',
        comarca: 'Ripollès',
      })

      const { proposals } = await mockApi.fetchVotingProposals()
      expect(Array.isArray(proposals)).toBe(true)
    })

    it('retorna propostes acceptades com a Puzzle[] amb i sense àlies', async () => {
      await mockApi.auth.signIn('admin@dev.local', 'admin')
      const { rows } = await mockApi.admin.listOpenProposals()
      if (rows.length >= 2) {
        await mockApi.admin.decide(rows[0].id, 'accepted', 'Osona', ['Vich'])
        await mockApi.admin.decide(rows[1].id, 'accepted', 'Garrotxa', [])
      }

      const accepted = await mockApi.fetchAcceptedPuzzles()
      expect(Array.isArray(accepted)).toBe(true)
      expect(accepted.length).toBeGreaterThan(0)
    })

    it('permet votar propostes i evita vots duplicats', async () => {
      const { proposals } = await mockApi.fetchVotingProposals()
      if (proposals.length > 0) {
        const id = proposals[0].id
        const res1 = await mockApi.castVote(id, 1)
        expect(res1).toBe('ok')

        const res2 = await mockApi.castVote(id, 1)
        expect(res2).toBe('already')
      }
    })

    it('llança error si es vota una proposta que no existeix o no està en estat voting', async () => {
      await expect(mockApi.castVote(999999, 1)).rejects.toThrow(
        'Aquesta proposta ja no admet vots.'
      )
    })
  })

  describe('Autenticació', () => {
    it('fa login amb èxit amb les credencials del seed i tanca sessió', async () => {
      const ok = await mockApi.auth.signIn('admin@dev.local', 'admin')
      expect(ok).toBe(true)

      const session = await mockApi.auth.getSession()
      expect(session).not.toBeNull()
      expect(session?.isAdmin).toBe(true)

      await mockApi.auth.signOut()
      expect(await mockApi.auth.getSession()).toBeNull()
    })

    it('retorna false si el login falla per contrasenya o correu erroni', async () => {
      const fail = await mockApi.auth.signIn('admin@dev.local', 'wrongpass')
      expect(fail).toBe(false)
    })

    it('permet registrar nous usuaris i valida nom, email i contrasenya', async () => {
      // Nom invàlid
      const invUser = await mockApi.auth.signUp('a', 'nou@dev.local', '12345678')
      expect(invUser.ok).toBe(false)

      // Nom agafat (admin)
      const dupUser = await mockApi.auth.signUp('admin', 'altre@dev.local', '12345678')
      expect(dupUser.ok).toBe(false)

      // Correu agafat
      const dupEmail = await mockApi.auth.signUp('nou_user', 'admin@dev.local', '12345678')
      expect(dupEmail.ok).toBe(false)

      // Contrasenya curta
      const shortPass = await mockApi.auth.signUp('nou_user', 'nou@dev.local', 'curt')
      expect(shortPass.ok).toBe(false)

      // Registre correcte
      const ok = await mockApi.auth.signUp('nou_user', 'nou@dev.local', 'password123')
      expect(ok.ok).toBe(true)

      const s = await mockApi.auth.getSession()
      expect(s?.username).toBe('nou_user')

      // usernameAvailable
      expect(await mockApi.auth.usernameAvailable('nou_user')).toBe(false)
      expect(await mockApi.auth.usernameAvailable('usuari_lliure')).toBe(true)
    })

    it('notifica els canvis de sessió amb onChange', async () => {
      const listener = vi.fn()
      const unsub = mockApi.auth.onChange(listener)

      await mockApi.auth.signIn('admin@dev.local', 'admin')
      expect(listener).toHaveBeenCalled()

      unsub()
      await mockApi.auth.signOut()
    })

    it('permet esborrar el compte de l\'usuari actual', async () => {
      await mockApi.auth.signUp('usuari_temporal', 'temp@dev.local', '12345678')
      expect(await mockApi.auth.getSession()).not.toBeNull()

      await mockApi.auth.deleteAccount()
      expect(await mockApi.auth.getSession()).toBeNull()
    })
  })

  describe('Rècords i puntuacions', () => {
    it('desa i carrega rècords quan hi ha un usuari autenticat', async () => {
      await mockApi.auth.signIn('admin@dev.local', 'admin')

      const initial = await mockApi.records.load()
      expect(initial).toBeNull()

      const rec = emptyRecords()
      rec.ten.best = 27
      await mockApi.records.save(rec)

      const loaded = await mockApi.records.load()
      expect(loaded?.ten.best).toBe(27)
    })

    it('permet enviar puntuacions i actualitzar-les si se supera la marca', async () => {
      await mockApi.auth.signIn('admin@dev.local', 'admin')

      // Primera puntuació
      await mockApi.scores.submit('ten', 20)
      // Millora de la puntuació (actualització de cur.value)
      await mockApi.scores.submit('ten', 25)

      const lb = await mockApi.scores.leaderboard('ten')
      expect(Array.isArray(lb)).toBe(true)
      const myRow = lb.find((r) => r.isMe)
      expect(myRow?.value).toBe(25)
    })

    it('llança error si la puntuació no és vàlida', async () => {
      await mockApi.auth.signIn('admin@dev.local', 'admin')
      await expect(mockApi.scores.submit('ten', 999)).rejects.toThrow('Puntuació no vàlida.')
    })
  })

  describe('Grups', () => {
    it('crea, uneix, llista i consulta rànquing de grups', async () => {
      await mockApi.auth.signIn('admin@dev.local', 'admin')

      // Crear grup nou
      const group = await mockApi.groups.create('Grup Temporal')
      expect(group.name).toBe('Grup Temporal')

      // Llistar grups
      const list = await mockApi.groups.list()
      expect(list.some((g) => g.id === group.id)).toBe(true)

      // Rànquing del grup
      const ranking = await mockApi.groups.ranking(group.id)
      expect(Array.isArray(ranking)).toBe(true)

      // Un usuari nou que no és membre s'uneix al grup
      await mockApi.auth.signUp('membre_nou', 'nou_membre@dev.local', '12345678')
      const joinedNew = await mockApi.groups.join(group.code)
      expect(joinedNew.id).toBe(group.id)

      // Re-unir-se quan ja és membre
      const joinedSame = await mockApi.groups.join(group.code)
      expect(joinedSame.id).toBe(group.id)

      // Un altre usuari intenta veure el rànquing sense ser membre
      await mockApi.auth.signUp('usuari_estrany', 'estrany@dev.local', '12345678')
      await expect(mockApi.groups.ranking(group.id)).rejects.toThrow(
        "No ets membre d'aquest grup"
      )
    }, 10000)

    it('elimina el grup quan l\'últim membre en surt', async () => {
      await mockApi.auth.signIn('admin@dev.local', 'admin')
      const group = await mockApi.groups.create('Grup Per Esborrar')

      await mockApi.groups.leave(group.id)
      const afterLeave = await mockApi.groups.list()
      expect(afterLeave.some((g) => g.id === group.id)).toBe(false)
    }, 10000)

    it('gestiona excepció de localStorage a currentUser retornant null', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
        throw new Error('Blocked')
      })
      const s = await mockApi.auth.getSession()
      expect(s).toBeNull()
    })

    it('valida el nom del grup i codi inexistent', async () => {
      await mockApi.auth.signIn('admin@dev.local', 'admin')
      await expect(mockApi.groups.create('A')).rejects.toThrow(
        'El nom del grup ha de tenir entre 2 i 40 caràcters'
      )
      await expect(mockApi.groups.join('CODI_INVALID')).rejects.toThrow(
        'Codi de grup no vàlid'
      )
    })
  })

  describe('Panell d\'administració', () => {
    it('llista propostes obertes i permet decidir-ne la resolució', async () => {
      await mockApi.auth.signIn('admin@dev.local', 'admin')

      const { rows } = await mockApi.admin.listOpenProposals()
      expect(Array.isArray(rows)).toBe(true)

      if (rows.length > 0) {
        const id = rows[0].id
        await mockApi.admin.decide(id, 'accepted', 'Osona', ['Vic'])
      }
    })

    it('llança error si s\'intenta decidir una proposta inexistent', async () => {
      await mockApi.auth.signIn('admin@dev.local', 'admin')
      await expect(
        mockApi.admin.decide(999999, 'rejected', '', [])
      ).rejects.toThrow('Proposta inexistent.')
    })

    it('bloqueja l\'accés d\'admin si l\'usuari no és administrador', async () => {
      await mockApi.auth.signUp('usuari_normalet', 'normal@dev.local', '12345678')

      await expect(mockApi.admin.listOpenProposals()).rejects.toThrow(
        'No tens permís: cal ser administrador.'
      )
    })
  })
})
