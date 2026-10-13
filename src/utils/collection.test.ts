import { describe, it, expect } from 'vitest'
import { buildCollection } from './collection'
import type { MapMunicipi } from '../data/catalunyaMap'
import type { Puzzle } from '../data/puzzles'

describe('collection utils', () => {
  const comarcaNames = ['Alt Camp', 'Osona', 'Ripollès']

  const municipis: MapMunicipi[] = [
    { id: '08298', n: 'Vic', c: 2, d: 'M0 0' },
    { id: '08298b', n: 'Vic', c: 2, d: 'M0 0' }, // repetit per cobrir la branca !byName.has(key)
    { id: '17147', n: 'Ripoll', c: 3, d: 'M0 0' },
    { id: '43001', n: 'Aiguamúrcia', c: 1, d: 'M0 0' },
  ]

  const puzzles: Puzzle[] = [
    {
      answer: 'Vic',
      aliases: ['Vich'],
      emojis: '🏛️🐮',
      explanation: 'Osona',
      comarca: 'Osona',
    },
    {
      answer: 'Bressol',
      aliases: ['Ripoll'],
      emojis: '🐑🌲',
      explanation: 'Coincidència per àlies',
      comarca: '', // buida per agafar la del mapa (Ripollès)
    },
    {
      answer: 'Poble Desconegut',
      emojis: '❓',
      explanation: 'Sense municipi al mapa',
      comarca: '',
    },
  ]

  it('construeix correctament la col·lecció associant municipis i comarques', () => {
    const unlockedAnswers = ['Vic']
    const collection = buildCollection(puzzles, unlockedAnswers, municipis, comarcaNames)

    expect(collection.entries).toHaveLength(3)

    // 1. Vic: trobat pel nom principal
    const vicEntry = collection.entries[0]
    expect(vicEntry.municipiId).toBe('08298')
    expect(vicEntry.comarca).toBe('Osona')
    expect(vicEntry.unlocked).toBe(true)

    // 2. Bressol: trobat per l'àlies Ripoll i agafa la comarca del mapa (Ripollès)
    const ripollEntry = collection.entries[1]
    expect(ripollEntry.municipiId).toBe('17147')
    expect(ripollEntry.comarca).toBe('Ripollès')
    expect(ripollEntry.unlocked).toBe(false)

    // 3. Desconegut: no coincideix amb cap municipi
    const unknownEntry = collection.entries[2]
    expect(unknownEntry.municipiId).toBeNull()
    expect(unknownEntry.comarca).toBe('')
    expect(unknownEntry.unlocked).toBe(false)

    // Comprovació del mapa byMunicipi
    expect(collection.byMunicipi.get('08298')).toEqual([vicEntry])
    expect(collection.byMunicipi.get('17147')).toEqual([ripollEntry])
    expect(collection.byMunicipi.has('unknown')).toBe(false)

    // Comprovació de municipis desbloquejats
    expect(collection.unlockedMunicipis.has('08298')).toBe(true)
    expect(collection.unlockedMunicipis.has('17147')).toBe(false)
  })

  it('agrupa múltiples trencaclosques en el mateix municipi', () => {
    const doublePool: Puzzle[] = [
      { answer: 'Vic', emojis: '🏛️🐮', explanation: '', comarca: 'Osona' },
      { answer: 'Vic', emojis: '🐮', explanation: 'Segona proposta', comarca: 'Osona' },
    ]

    const collection = buildCollection(doublePool, ['Vic'], municipis, comarcaNames)
    const vicEntries = collection.byMunicipi.get('08298')

    expect(vicEntries).toHaveLength(2)
    expect(collection.unlockedMunicipis.has('08298')).toBe(true)
  })
})
