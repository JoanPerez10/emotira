import { describe, it, expect } from 'vitest'
import { splitEmojis, inverseOptions, eliminateDistractors } from './inverse'
import type { Puzzle } from '../data/puzzles'

describe('inverse utils', () => {
  describe('splitEmojis', () => {
    it('segmenta emojis senzills per grafemes', () => {
      expect(splitEmojis('🏛️🐮')).toEqual(['🏛️', '🐮'])
    })

    it('segmenta correctament emojis compostos i amb modificadors ZWJ', () => {
      // Emoji amb gènere/professió o color de pell
      const result = splitEmojis('🏊‍♀️🏃‍♂️')
      expect(result).toHaveLength(2)
      expect(result[0]).toBe('🏊‍♀️')
      expect(result[1]).toBe('🏃‍♂️')
    })

    it('ignora espais en blanc', () => {
      expect(splitEmojis(' 🏛️   🐮 ')).toEqual(['🏛️', '🐮'])
      expect(splitEmojis('')).toEqual([])
      expect(splitEmojis('   ')).toEqual([])
    })
  })

  describe('inverseOptions', () => {
    const mockPool: Puzzle[] = [
      { answer: 'P1', emojis: '🍎🍐🍊', explanation: '' },
      { answer: 'P2', emojis: '🍋🍌🍉', explanation: '' },
      { answer: 'P3', emojis: '🍇🍓🍒', explanation: '' },
      { answer: 'P4', emojis: '🍑🍍🥥', explanation: '' },
    ]

    it('retorna 10 opcions que contenen la resposta correcta i distractors únics', () => {
      const answer = ['🍎', '🍐']
      const options = inverseOptions(answer, mockPool)

      expect(options).toHaveLength(10)
      // Conté tots els emojis de la resposta
      expect(options).toContain('🍎')
      expect(options).toContain('🍐')

      // Sense duplicats a les opcions retornades
      const uniqueOptions = new Set(options)
      expect(uniqueOptions.size).toBe(10)
    })

    it('gestiona respostes llargues o amb duplicats', () => {
      const answer = ['🍎', '🍎', '🍐']
      const options = inverseOptions(answer, mockPool)
      expect(options).toContain('🍎')
      expect(options).toContain('🍐')
      expect(options.length).toBeLessThanOrEqual(10)
    })
  })

  describe('eliminateDistractors', () => {
    it('elimina fins a dos distractors que no formen part de la resposta', () => {
      const options = ['🍎', '🍐', '🍊', '🍋', '🍌']
      const answer = ['🍎', '🍐']
      const removedInitially: string[] = []

      // Primera pista: elimina fins a 2 distractors
      const removed1 = eliminateDistractors(options, answer, removedInitially)
      expect(removed1).toHaveLength(2)
      expect(removed1.every((e) => ['🍊', '🍋', '🍌'].includes(e))).toBe(true)
      expect(removed1.includes('🍎')).toBe(false)
      expect(removed1.includes('🍐')).toBe(false)

      // Segona pista: elimina 2 distractors més
      const removed2 = eliminateDistractors(options, answer, removed1)
      expect(removed2.length).toBeGreaterThanOrEqual(3)
    })

    it('no elimina res si no hi ha més candidats distractors', () => {
      const options = ['🍎', '🍐']
      const answer = ['🍎', '🍐']
      const removed = eliminateDistractors(options, answer, [])
      expect(removed).toEqual([])
    })
  })
})
