import { describe, it, expect } from 'vitest'
import { normalize } from './normalize'

describe('normalize', () => {
  it('converteix majúscules a minúscules', () => {
    expect(normalize('BARCELONA')).toBe('barcelona')
    expect(normalize('GiRoNa')).toBe('girona')
  })

  it('elimina accents i dièresis', () => {
    expect(normalize('Vallès')).toBe('valles')
    expect(normalize('Móra d\'Ebre')).toBe('moradebre')
    expect(normalize('Súria')).toBe('suria')
    expect(normalize('Llívia')).toBe('llivia')
    expect(normalize('Viladaïtes')).toBe('viladaites')
    expect(normalize('Cambrils')).toBe('cambrils')
    expect(normalize('Àger')).toBe('ager')
  })

  it('elimina espais en blanc', () => {
    expect(normalize('Sant Cugat')).toBe('santcugat')
    expect(normalize('  Prat de Llobregat  ')).toBe('pratdellobregat')
  })

  it('elimina caràcters especials, signes de puntuació i símbols', () => {
    expect(normalize('Calldetenes!')).toBe('calldetenes')
    expect(normalize('Castell-Platja d\'Aro')).toBe('castellplatjadaro')
    expect(normalize('Col·legiata')).toBe('collegiata')
    expect(normalize('Poble (Nou)')).toBe('poblenou')
    expect(normalize('Pla d\'Urgell #1')).toBe('pladurgell1')
  })

  it('manté els números i caràcters alfanumèrics', () => {
    expect(normalize('Sector 12')).toBe('sector12')
    expect(normalize('2025')).toBe('2025')
  })

  it('gestiona cadenes buides', () => {
    expect(normalize('')).toBe('')
    expect(normalize('   --- ')).toBe('')
  })
})
