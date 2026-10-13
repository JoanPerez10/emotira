import { describe, it, expect } from 'vitest'
import { DAILY_COUNT, dateKey, dailyPuzzles, todayKey, yesterdayKey } from './daily'

describe('daily utils', () => {
  it('formata dates correctament amb dateKey (YYYY-MM-DD)', () => {
    const d1 = new Date(2026, 9, 12) // Octubre 12, 2026
    expect(dateKey(d1)).toBe('2026-10-12')

    const d2 = new Date(2026, 0, 5) // Gener 5, 2026
    expect(dateKey(d2)).toBe('2026-01-05')
  })

  it('calcula la clau d\'ahir correctament amb yesterdayKey', () => {
    const yKey = yesterdayKey()
    const tKey = todayKey()
    expect(yKey).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(yKey).not.toBe(tKey)
  })

  it('retorna exactament DAILY_COUNT (5) enigmes per dia', () => {
    const puzzles = dailyPuzzles('2026-10-12')
    expect(puzzles).toHaveLength(DAILY_COUNT)
    expect(puzzles.length).toBe(5)
  })

  it('és determinista per a la mateixa clau de data', () => {
    const run1 = dailyPuzzles('2026-10-12')
    const run2 = dailyPuzzles('2026-10-12')
    expect(run1).toEqual(run2)
  })

  it('genera seleccions diferents per a dates diferents', () => {
    const day1 = dailyPuzzles('2026-10-12')
    const day2 = dailyPuzzles('2026-10-13')
    expect(day1).not.toEqual(day2)
  })
})
