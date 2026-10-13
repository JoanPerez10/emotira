import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  emptyRecords,
  normalizeRecords,
  loadRecords,
  saveRecords,
  unlockTown,
  currentStreak,
  recordResult,
} from './storage'
import { todayKey, yesterdayKey } from './daily'
import type { GameResult, Records } from '../types'

describe('storage utils', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('emptyRecords i normalizeRecords', () => {
    it('retorna l\'estructura buida per defecte amb emptyRecords', () => {
      const records = emptyRecords()
      expect(records.daily.played).toBe(0)
      expect(records.unlockedTowns).toEqual([])
      expect(records.infinite.bestSolved).toBe(0)
    })

    it('normalitza dades parcials o buides amb normalizeRecords', () => {
      expect(normalizeRecords(null)).toEqual(emptyRecords())
      expect(normalizeRecords(undefined)).toEqual(emptyRecords())

      // Conserva dades parcials i neteja valors no string a unlockedTowns
      const partial: Partial<Records> = {
        ten: { played: 5, best: 28 },
        // @ts-expect-error simulem dades heretades o corruptes
        unlockedTowns: ['Vic', 123, 'Ripoll', 'Vic', null],
      }
      const normalized = normalizeRecords(partial)
      expect(normalized.ten.played).toBe(5)
      expect(normalized.ten.best).toBe(28)
      expect(normalized.unlockedTowns).toEqual(['Vic', 'Ripoll'])
    })
  })

  describe('loadRecords i saveRecords', () => {
    it('carrega registres des de localStorage', () => {
      const initial = emptyRecords()
      initial.hard.best = 15
      saveRecords(initial)

      const loaded = loadRecords()
      expect(loaded.hard.best).toBe(15)
    })

    it('retorna emptyRecords quan localStorage està buit o conté JSON invàlid', () => {
      expect(loadRecords()).toEqual(emptyRecords())

      localStorage.setItem('emotira:records:v1', 'json-corrupte{')
      expect(loadRecords()).toEqual(emptyRecords())
    })

    it('gestiona errors en desar sense llançar excepcions (bloc catch)', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded')
      })

      expect(() => saveRecords(emptyRecords())).not.toThrow()
    })
  })

  describe('unlockTown', () => {
    it('afegeix un nou poble si no hi era', () => {
      const prev = emptyRecords()
      const next = unlockTown(prev, 'Vic')

      expect(next.unlockedTowns).toEqual(['Vic'])
      expect(next).not.toBe(prev)
    })

    it('retorna exactament el mateix objecte si el poble ja hi era', () => {
      const prev = emptyRecords()
      prev.unlockedTowns = ['Vic']
      const next = unlockTown(prev, 'Vic')

      expect(next).toBe(prev)
    })
  })

  describe('currentStreak', () => {
    it('retorna la ratxa si s\'ha jugat avui o ahir', () => {
      const records = emptyRecords()
      records.daily.streak = 4

      records.daily.lastDate = todayKey()
      expect(currentStreak(records)).toBe(4)

      records.daily.lastDate = yesterdayKey()
      expect(currentStreak(records)).toBe(4)
    })

    it('retorna 0 si la darrera partida és anterior o nul·la', () => {
      const records = emptyRecords()
      records.daily.streak = 4

      records.daily.lastDate = null
      expect(currentStreak(records)).toBe(0)

      records.daily.lastDate = '2020-01-01'
      expect(currentStreak(records)).toBe(0)
    })
  })

  describe('recordResult', () => {
    const mockGameResult: GameResult = {
      score: 15,
      max: 15,
      results: [
        { status: 'correct', hints: 0 },
        { status: 'correct', hints: 1 },
        { status: 'revealed', hints: 3 },
      ],
    }

    describe('mode daily', () => {
      it('guarda el resultat del diari i calcula les ratxes correctament', () => {
        const prev = emptyRecords()
        prev.daily.lastDate = yesterdayKey()
        prev.daily.streak = 2

        const { records, isBest } = recordResult(prev, 'daily', mockGameResult)
        expect(records.daily.played).toBe(1)
        expect(records.daily.streak).toBe(3)
        expect(records.daily.bestStreak).toBe(3)
        expect(records.daily.lastDate).toBe(todayKey())
        expect(records.daily.history[todayKey()]).toEqual({
          score: 15,
          max: 15,
          results: '🟩🟨🟥',
        })
        expect(isBest).toBe(false)
      })

      it('inicia ratxa a 1 si no es va jugar ahir', () => {
        const prev = emptyRecords()
        prev.daily.lastDate = '2025-01-01'
        prev.daily.streak = 10

        const { records } = recordResult(prev, 'daily', mockGameResult)
        expect(records.daily.streak).toBe(1)
      })

      it('ignora la partida si ja s\'havia jugat el diari d\'avui', () => {
        const prev = emptyRecords()
        prev.daily.history[todayKey()] = { score: 10, max: 15, results: '🟩' }

        const { records, isBest } = recordResult(prev, 'daily', mockGameResult)
        expect(records).toBe(prev)
        expect(isBest).toBe(false)
      })
    })

    describe('modes regulars (ten, hard, inverse, music)', () => {
      it('actualitza millor puntuació quan se supera el rècord', () => {
        const prev = emptyRecords()
        const res = recordResult(prev, 'ten', mockGameResult)

        expect(res.records.ten.played).toBe(1)
        expect(res.records.ten.best).toBe(15)
        expect(res.isBest).toBe(true)

        // Partida amb puntuació inferior no marca isBest
        const lowerRes = recordResult(res.records, 'ten', { ...mockGameResult, score: 10 })
        expect(lowerRes.records.ten.played).toBe(2)
        expect(lowerRes.records.ten.best).toBe(15)
        expect(lowerRes.isBest).toBe(false)
      })

      it('registra partides de música i inverse', () => {
        const prev = emptyRecords()
        const musicRes = recordResult(prev, 'music', mockGameResult)
        expect(musicRes.records.music.best).toBe(15)
        expect(musicRes.isBest).toBe(true)

        const inverseRes = recordResult(prev, 'inverse', mockGameResult)
        expect(inverseRes.records.inverse.best).toBe(15)
        expect(inverseRes.isBest).toBe(true)
      })
    })

    describe('mode timeTrial', () => {
      it('actualitza les estadístiques del contrarellotge', () => {
        const prev = emptyRecords()
        const res = recordResult(prev, 'timeTrial', mockGameResult)

        expect(res.records.timeTrial.played).toBe(1)
        expect(res.records.timeTrial.best).toBe(15)
        expect(res.isBest).toBe(true)

        const lower = recordResult(res.records, 'timeTrial', { ...mockGameResult, score: 12 })
        expect(lower.records.timeTrial.played).toBe(2)
        expect(lower.isBest).toBe(false)
      })
    })

    describe('mode infinite', () => {
      it('calcula la ratxa més llarga i el màxim de pobles resolts', () => {
        const prev = emptyRecords()
        const infiniteResult: GameResult = {
          score: 10,
          max: 10,
          results: [
            { status: 'correct', hints: 0 },
            { status: 'correct', hints: 0 },
            { status: 'revealed', hints: 0 },
            { status: 'correct', hints: 0 },
            { status: 'correct', hints: 0 },
            { status: 'correct', hints: 0 },
          ],
        }

        const res = recordResult(prev, 'infinite', infiniteResult)
        expect(res.records.infinite.played).toBe(1)
        expect(res.records.infinite.bestStreak).toBe(3)
        expect(res.records.infinite.bestSolved).toBe(5)
        expect(res.isBest).toBe(true)

        // Segona partida amb ratxa inferior
        const secondRes = recordResult(res.records, 'infinite', {
          score: 2,
          max: 2,
          results: [{ status: 'correct', hints: 0 }],
        })
        expect(secondRes.records.infinite.played).toBe(2)
        expect(secondRes.records.infinite.bestStreak).toBe(3)
        expect(secondRes.records.infinite.bestSolved).toBe(5)
        expect(secondRes.isBest).toBe(false)
      })
    })
  })
})
