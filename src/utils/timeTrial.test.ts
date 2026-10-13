import { describe, it, expect } from 'vitest'
import {
  TRIAL_SECONDS,
  TRIAL_MAX_SECONDS,
  TRIAL_PENALTY,
  TRIAL_ATTEMPTS,
  TRIAL_BONUS_SECONDS,
  createTrial,
  trialReducer,
  type TrialState,
} from './timeTrial'
import type { Puzzle } from '../data/puzzles'

const mockPuzzles: Puzzle[] = [
  { answer: 'Vic', aliases: ['Vich'], emojis: '🏛️🐮', explanation: 'Capital' },
  { answer: 'Ripoll', emojis: '🐑🌲', explanation: 'Bressol' },
  { answer: 'Olot', emojis: '🌋🌳', explanation: 'Volcans' },
]

describe('timeTrial utils', () => {
  const baseNow = 1000000

  describe('createTrial', () => {
    it('inicialitza l\'estat correctament amb temps i cua', () => {
      const trial = createTrial(mockPuzzles, baseNow)

      expect(trial.queue).toEqual(mockPuzzles)
      expect(trial.remaining).toBe(TRIAL_SECONDS)
      expect(trial.deadline).toBe(baseNow + TRIAL_SECONDS * 1000)
      expect(trial.status).toBe('playing')
      expect(trial.progress).toBe(0)
      expect(trial.fails).toBe(0)
      expect(trial.turn).toBe(0)
      expect(trial.results).toEqual([])
    })

    it('finalitza immediatament si la cua inicial és buida', () => {
      const trial = createTrial([], baseNow)
      expect(trial.status).toBe('finished')
    })
  })

  describe('trialReducer', () => {
    it('finalitza la partida quan el temps s\'esgota', () => {
      const state = createTrial(mockPuzzles, baseNow)
      const afterDeadline = baseNow + TRIAL_SECONDS * 1000 + 1000

      const next = trialReducer(state, { type: 'tick', now: afterDeadline })
      expect(next.status).toBe('finished')
      expect(next.remaining).toBe(0)

      // Un cop finalitzat, ignora qualsevol acció posterior
      const afterFinished = trialReducer(next, { type: 'tick', now: afterDeadline + 1000 })
      expect(afterFinished).toBe(next)
    })

    it('actualitza el temps restant amb tick', () => {
      const state = createTrial(mockPuzzles, baseNow)
      const next = trialReducer(state, { type: 'tick', now: baseNow + 5000 })

      expect(next.remaining).toBe(TRIAL_SECONDS - 5)

      // Si el segon no ha canviat, manté el mateix estat
      const same = trialReducer(next, { type: 'tick', now: baseNow + 5100 })
      expect(same).toBe(next)
    })

    it('ignora accions dirigides a un torn desfasat', () => {
      const state = createTrial(mockPuzzles, baseNow)
      const next = trialReducer(state, { type: 'submit', now: baseNow + 1000, turn: 99, text: 'Vic' })
      expect(next.results).toHaveLength(0)
    })

    describe('acció submit', () => {
      it('ignora enviaments buits o parcials que no coincideixen amb la longitud', () => {
        const state = createTrial(mockPuzzles, baseNow)

        // Text buit
        const empty = trialReducer(state, { type: 'submit', now: baseNow + 1000, turn: 0, text: '   ' })
        expect(empty.fails).toBe(0)
        expect(empty.turn).toBe(0)
        expect(empty.results).toHaveLength(0)

        // Text parcial (ex. 'V' quan 'Vic' té 3 lletres i no coincideix amb cap àlies)
        const partial = trialReducer(state, { type: 'submit', now: baseNow + 1000, turn: 0, text: 'V' })
        expect(partial.fails).toBe(0)
        expect(partial.turn).toBe(0)
        expect(partial.results).toHaveLength(0)
      })

      it('incrementa fails en cas de resposta incorrecta de la mateixa longitud', () => {
        const state = createTrial(mockPuzzles, baseNow)

        // 1r error
        const fail1 = trialReducer(state, { type: 'submit', now: baseNow + 1000, turn: 0, text: 'OLL' })
        expect(fail1.fails).toBe(1)
        expect(fail1.status).toBe('playing')
        expect(fail1.message).toContain('Et queden 2 intents')

        // 2n error
        const fail2 = trialReducer(fail1, { type: 'submit', now: baseNow + 2000, turn: 0, text: 'XYZ' })
        expect(fail2.fails).toBe(2)
        expect(fail2.message).toContain('Et queden 1 intents')

        // 3r error (esgota els intents, falla el poble i reinicia bonus)
        const fail3 = trialReducer(fail2, { type: 'submit', now: baseNow + 3000, turn: 0, text: 'ABC' })
        expect(fail3.status).toBe('failed')
        expect(fail3.fails).toBe(TRIAL_ATTEMPTS)
        expect(fail3.progress).toBe(0)
        expect(fail3.results).toHaveLength(1)
        expect(fail3.results[0].status).toBe('revealed')
        expect(fail3.results[0].reason).toBe('failed')
      })

      it('accepta resposta correcta i calcula el bonus cada 5 encerts', () => {
        let state = createTrial(mockPuzzles, baseNow)

        // Encertar 'Vic'
        state = trialReducer(state, { type: 'submit', now: baseNow + 1000, turn: 0, text: 'Vic' })
        expect(state.status).toBe('correct')
        expect(state.progress).toBe(1)
        expect(state.results[0].status).toBe('correct')

        // Simular 4 encerts més per assolir el bonus de 5 (TRIAL_BONUS_STEPS)
        state.progress = 4
        state.status = 'playing'

        const withBonus = trialReducer(state, { type: 'submit', now: baseNow + 2000, turn: 0, text: 'Vich' })
        expect(withBonus.status).toBe('correct')
        expect(withBonus.bonusSeconds).toBe(TRIAL_BONUS_SECONDS)
        expect(withBonus.message).toContain('+5 segons! Bonus completat!')
      })

      it('respecta el límit màxim de segons acumulats (TRIAL_MAX_SECONDS)', () => {
        const state = createTrial(mockPuzzles, baseNow)
        state.progress = 4
        state.bonusSeconds = TRIAL_MAX_SECONDS - TRIAL_SECONDS // ja al màxim

        const bonusState = trialReducer(state, { type: 'submit', now: baseNow + 1000, turn: 0, text: 'Vic' })
        // No suma més segons si ja és al límit màxim
        expect(bonusState.bonusSeconds).toBe(TRIAL_MAX_SECONDS - TRIAL_SECONDS)
      })

      it('accepta resposta per a un puzzle sense àlies', () => {
        // mockPuzzles[1] és Ripoll i no té aliases
        const stateWithoutAlias = createTrial([mockPuzzles[1]], baseNow)
        const solved = trialReducer(stateWithoutAlias, { type: 'submit', now: baseNow + 1000, turn: 0, text: 'Ripoll' })
        expect(solved.status).toBe('correct')
      })

      it('ignora submits quan l\'estat no és playing', () => {
        const state = createTrial(mockPuzzles, baseNow)
        state.status = 'correct'
        const ignored = trialReducer(state, { type: 'submit', now: baseNow + 1000, turn: 0, text: 'Vic' })
        expect(ignored.status).toBe('correct')
      })
    })

    describe('acció skip', () => {
      it('resta 2 segons, reinicia el bonus i mou el poble al final de la cua', () => {
        const state = createTrial(mockPuzzles, baseNow)
        state.progress = 3

        const skipped = trialReducer(state, { type: 'skip', now: baseNow + 1000, turn: 0 })
        expect(skipped.progress).toBe(0)
        expect(skipped.fails).toBe(0)
        expect(skipped.remaining).toBe(TRIAL_SECONDS - TRIAL_PENALTY - 1)
        expect(skipped.queue[skipped.queue.length - 1]).toEqual(mockPuzzles[0])
        expect(skipped.turn).toBe(1)
        expect(skipped.results[0].reason).toBe('skipped')
      })

      it('finalitza la partida si la penalització de skip esgota el temps restant', () => {
        const state: TrialState = {
          ...createTrial(mockPuzzles, baseNow),
          deadline: baseNow + 1000, // 1 segon restant
          remaining: 1,
        }

        const skipped = trialReducer(state, { type: 'skip', now: baseNow, turn: 0 })
        expect(skipped.status).toBe('finished')
        expect(skipped.remaining).toBe(0)
      })
    })

    describe('acció advance', () => {
      it('només avança si l\'estat és correct o failed', () => {
        const playingState = createTrial(mockPuzzles, baseNow)
        const noAdvance = trialReducer(playingState, {
          type: 'advance',
          now: baseNow + 1000,
          turn: 0,
          refill: [],
        })
        expect(noAdvance.status).toBe('playing')
        expect(noAdvance.turn).toBe(0)
        expect(noAdvance.queue).toEqual(playingState.queue)
      })

      it('passa al següent poble i reinicia fails i status a playing', () => {
        const state = createTrial(mockPuzzles, baseNow)
        const correctState = trialReducer(state, { type: 'submit', now: baseNow + 1000, turn: 0, text: 'Vic' })

        const advanced = trialReducer(correctState, {
          type: 'advance',
          now: baseNow + 2000,
          turn: 0,
          refill: [],
        })

        expect(advanced.status).toBe('playing')
        expect(advanced.queue).toHaveLength(mockPuzzles.length - 1)
        expect(advanced.queue[0]).toEqual(mockPuzzles[1])
        expect(advanced.turn).toBe(1)
        expect(advanced.fails).toBe(0)
      })

      it('recàrrega la cua amb refill quan s\'esgota la cua actual', () => {
        const singlePuzzle = [mockPuzzles[0]]
        const state = createTrial(singlePuzzle, baseNow)
        const correctState = trialReducer(state, { type: 'submit', now: baseNow + 1000, turn: 0, text: 'Vic' })

        const advancedWithRefill = trialReducer(correctState, {
          type: 'advance',
          now: baseNow + 2000,
          turn: 0,
          refill: [mockPuzzles[1]],
        })

        expect(advancedWithRefill.status).toBe('playing')
        expect(advancedWithRefill.queue).toEqual([mockPuzzles[1]])

        // Si tant la cua com el refill són buits, finalitza
        const finished = trialReducer(correctState, {
          type: 'advance',
          now: baseNow + 2000,
          turn: 0,
          refill: [],
        })
        expect(finished.status).toBe('finished')
      })
    })
  })
})
