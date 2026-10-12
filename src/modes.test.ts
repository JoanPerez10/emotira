import { describe, it, expect } from 'vitest'
import { MODES, MODE_TITLES, MODE_METRIC, MODE_ICONS, MODE_IMAGES, scoreOf, formatScoreValue } from './modes'
import { emptyRecords } from './utils/storage'

describe('modes.ts', () => {
  it('conté tots els modes esperats amb títols, mètriques, icones i imatges', () => {
    expect(MODES).toEqual(['daily', 'ten', 'hard', 'infinite', 'timeTrial', 'inverse', 'music'])
    for (const m of MODES) {
      expect(MODE_TITLES[m]).toBeDefined()
      expect(MODE_METRIC[m]).toBeDefined()
      expect(MODE_ICONS[m]).toBeDefined()
      expect(MODE_IMAGES[m]).toBeDefined()
    }
  })

  it('calcula la puntuació segons el mode amb scoreOf', () => {
    const records = emptyRecords()
    records.daily.bestStreak = 10
    records.ten.best = 25
    records.hard.best = 20
    records.timeTrial.best = 15
    records.inverse.best = 18
    records.music.best = 22
    records.infinite.bestStreak = 7

    expect(scoreOf(records, 'daily')).toBe(10)
    expect(scoreOf(records, 'ten')).toBe(25)
    expect(scoreOf(records, 'hard')).toBe(20)
    expect(scoreOf(records, 'timeTrial')).toBe(15)
    expect(scoreOf(records, 'inverse')).toBe(18)
    expect(scoreOf(records, 'music')).toBe(22)
    expect(scoreOf(records, 'infinite')).toBe(7)
  })

  it('formata els valors de puntuació amb formatScoreValue en singular i plural', () => {
    expect(formatScoreValue('timeTrial', 1)).toBe('1 poble')
    expect(formatScoreValue('timeTrial', 5)).toBe('5 pobles')

    expect(formatScoreValue('ten', 12)).toBe('12 / 30')
    expect(formatScoreValue('hard', 8)).toBe('8 / 30')
    expect(formatScoreValue('inverse', 21)).toBe('21 / 30')
    expect(formatScoreValue('music', 30)).toBe('30 / 30')

    expect(formatScoreValue('daily', 1)).toBe('1 dia')
    expect(formatScoreValue('daily', 3)).toBe('3 dies')

    expect(formatScoreValue('infinite', 1)).toBe('1 encert')
    expect(formatScoreValue('infinite', 4)).toBe('4 encerts')
  })
})
