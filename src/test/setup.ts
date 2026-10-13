import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

// jsdom no implementa scrollIntoView per defecte
window.HTMLElement.prototype.scrollIntoView = vi.fn()

// jsdom no implementa PointerCapture per defecte a SVG / Element
Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
Element.prototype.setPointerCapture = vi.fn()
Element.prototype.releasePointerCapture = vi.fn()

// Suport per a SVGElement.prototype.dataset en jsdom si cal
if (!('dataset' in SVGElement.prototype)) {
  Object.defineProperty(SVGElement.prototype, 'dataset', {
    get() {
      const data: Record<string, string> = {}
      for (let i = 0; i < this.attributes.length; i++) {
        const attr = this.attributes[i]
        if (attr.name.startsWith('data-')) {
          const key = attr.name.slice(5).replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase())
          data[key] = attr.value
        }
      }
      return data
    },
  })
}
