import { describe, it, expect } from 'vitest'
import { puzzles } from './puzzles'
import { musicPuzzles } from './musicPuzzles'
import { emojiFontCss } from '../emojiFont'
import { splitGraphemes } from '../utils/graphemes'

/**
 * Rangs d'Unicode que dibuixa la font d'emoji que autoallotgem: els llegim de
 * les declaracions @font-face que injecta main.tsx, de manera que el test
 * comprova exactament el que es publica. Si pugem la versió del paquet, els
 * emojis nous entren sols.
 */
const ranges = [...emojiFontCss.matchAll(/unicode-range:\s*([^;]+);/g)]
  .flatMap((match) => match[1].split(','))
  .map((part) => part.trim().replace(/^U\+/i, ''))
  .filter(Boolean)
  .map((part) => {
    const [first, last] = part.split('-')
    const start = parseInt(first, 16)
    return [start, last ? parseInt(last, 16) : start] as const
  })

const isDrawn = (codePoint: number) => ranges.some(([start, end]) => codePoint >= start && codePoint <= end)

const allPuzzles = [...puzzles, ...musicPuzzles]

/**
 * Emojis que la nostra font no dibuixa perquè Noto els va retirar (la família
 * sola, 👪). No és cap forat: la pila de fonts d'App.css hi cau al darrere i
 * el pinta la font d'emoji del sistema.
 */
const SYSTEM_FALLBACK = new Set(['👪'])

describe('puzzles', () => {
  it('cada poble té emojis, resposta i explicació', () => {
    for (const puzzle of allPuzzles) {
      expect(puzzle.emojis.trim()).not.toBe('')
      expect(puzzle.answer.trim()).not.toBe('')
      expect(puzzle.explanation.trim()).not.toBe('')
    }
  })

  it('no repeteix respostes', () => {
    const answers = puzzles.map((p) => p.answer)
    expect(new Set(answers).size).toBe(answers.length)
  })

  it('les pistes només tenen emojis, sense lletres ni xifres soltes', () => {
    for (const puzzle of allPuzzles) {
      expect(puzzle.emojis, `${puzzle.answer}: ${puzzle.emojis}`).not.toMatch(/\p{L}/u)
    }
  })

  it('la font d’emoji que portem dibuixa tots els emojis de les pistes', () => {
    const missing: string[] = []

    for (const puzzle of allPuzzles) {
      for (const grapheme of splitGraphemes(puzzle.emojis)) {
        for (const char of grapheme) {
          const codePoint = char.codePointAt(0)!
          // El selector de variació i el ZWJ no tenen dibuix propi.
          if (codePoint === 0xfe0f || codePoint === 0xfe0e || codePoint === 0x200d) continue
          if (!isDrawn(codePoint) && !SYSTEM_FALLBACK.has(grapheme)) missing.push(`${grapheme} (${puzzle.answer})`)
        }
      }
    }

    expect(missing, `Emojis que la font no sap dibuixar: ${missing.join(', ')}`).toEqual([])
  })
})
