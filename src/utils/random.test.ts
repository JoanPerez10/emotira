import { describe, it, expect, vi } from 'vitest'
import { shuffle, seededShuffle } from './random'

describe('random utils', () => {
  describe('shuffle', () => {
    it('no muta l\'array original', () => {
      const original = [1, 2, 3, 4, 5]
      const copy = [...original]
      shuffle(original)
      expect(original).toEqual(copy)
    })

    it('funciona amb arrays buits o d\'un sol element', () => {
      expect(shuffle([])).toEqual([])
      expect(shuffle(['a'])).toEqual(['a'])
    })

    it('utilitza la funció rand proporcionada si s\'especifica', () => {
      const mockRand = vi.fn().mockReturnValue(0)
      const shuffled = shuffle([1, 2, 3], mockRand)

      expect(mockRand).toHaveBeenCalled()
      expect(shuffled).toHaveLength(3)
    })
  })

  describe('seededShuffle', () => {
    it('és determinista per a la mateixa llavor', () => {
      const list = ['A', 'B', 'C', 'D', 'E', 'F']
      const run1 = seededShuffle(list, 'emotira-seed-1')
      const run2 = seededShuffle(list, 'emotira-seed-1')

      expect(run1).toEqual(run2)
    })

    it('genera resultats diferents per a llavors diferents', () => {
      const list = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
      const run1 = seededShuffle(list, 'seed-alpha')
      const run2 = seededShuffle(list, 'seed-beta')

      expect(run1).not.toEqual(run2)
    })

    it('funciona amb arrays buits', () => {
      expect(seededShuffle([], 'any-seed')).toEqual([])
    })
  })
})
