import { describe, it, expect } from 'vitest'
import { puzzles } from './puzzles'
import { musicPuzzles } from './musicPuzzles'

const emojisFor = (answer: string) => puzzles.find((p) => p.answer === answer)?.emojis

describe('puzzles', () => {
  it('cada poble té emojis, resposta i explicació', () => {
    for (const puzzle of [...puzzles, ...musicPuzzles]) {
      expect(puzzle.emojis.trim()).not.toBe('')
      expect(puzzle.answer.trim()).not.toBe('')
      expect(puzzle.explanation.trim()).not.toBe('')
    }
  })

  it('no repeteix respostes', () => {
    const answers = puzzles.map((p) => p.answer)
    expect(new Set(answers).size).toBe(answers.length)
  })

  it('conserva els emojis literals que Noto Color Emoji sap dibuixar', () => {
    expect(emojisFor('Pals')).toBe('🪵🪵')
    expect(emojisFor('L’Escala')).toBe('🪜')
    expect(emojisFor('Igualada')).toBe('🟰🧚‍♀️')
    expect(emojisFor('Cabanes')).toBe('🛖🛖')
    expect(emojisFor('La Roca del Vallès')).toBe('🪨')
    expect(emojisFor('Olivella')).toBe('🫒👩')
    expect(emojisFor('Roquetes')).toBe('🪨🤏')
    expect(emojisFor('Castellfollit de la Roca')).toBe('🏰🍃🪨')
  })

  it('manté els emojis propis de la música', () => {
    expect(musicPuzzles.find((p) => p.answer === 'Oques Grasses')?.emojis).toBe('🪿🍔')
    expect(musicPuzzles.find((p) => p.answer === 'Els Amics de les Arts')?.emojis).toBe('🫂🎨')
  })
})
