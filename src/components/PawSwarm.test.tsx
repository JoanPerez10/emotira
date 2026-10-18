import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import PawSwarm from './PawSwarm'

describe('PawSwarm', () => {
  it('és decoració: no es llegeix i no té text', () => {
    const { container } = render(<PawSwarm />)

    // `aria-hidden` perquè un lector de pantalla no llegeixi les petjades,
    // i cada imatge amb `alt` buit perquè no quedi marcada com a imatge.
    const capa = container.querySelector('.paws')
    expect(capa).toHaveAttribute('aria-hidden', 'true')
    for (const img of container.querySelectorAll('img')) {
      expect(img).toHaveAttribute('alt', '')
    }
  })

  it('dibuixa diverses petjades, cadascuna amb el seu propi ritme', () => {
    const { container } = render(<PawSwarm />)
    const potes = container.querySelectorAll<HTMLElement>('.paw')

    expect(potes.length).toBeGreaterThan(10)
    // Si dues petjades comparteixen durada i retard, el vent les mouria al
    //hora i es llegiria com un sol bloc que es mou, no com un bosc. Els
    //valors són variables del CSS: aquí no hi ha full d'estil carregat, així
    //que es llegeixen de l'estil en línia, que és on els posa el component.
    const ritmes = new Set([...potes].map((p) => `${p.style.getPropertyValue('--paw-dur')}/${p.style.getPropertyValue('--paw-retard')}`))
    expect(ritmes.size).toBe(potes.length)
  })

  it('cada petjada té la seva pròpia posició i mida', () => {
    const { container } = render(<PawSwarm />)
    const posicions = [...container.querySelectorAll('.paw')].map((p) => p.getAttribute('style'))

    expect(new Set(posicions).size).toBe(posicions.length)
  })

  it('la disposició és la mateixa en dues renderitzades', () => {
    // El fons no pot saltar en recarregar la pàgina: la llavor és fixa.
    const primera = render(<PawSwarm />).container.innerHTML
    const segona = render(<PawSwarm />).container.innerHTML

    expect(segona).toBe(primera)
  })
})
