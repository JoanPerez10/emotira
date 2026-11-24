import { describe, it, expect } from 'vitest'
import { emojiFontCss } from './emojiFont'

describe('emojiFont', () => {
  it('declara una cara per subconjunt, totes amb unicode-range', () => {
    const faces = emojiFontCss.match(/@font-face\s*\{[^}]*\}/g) ?? []
    expect(faces.length).toBeGreaterThan(1)
    for (const face of faces) {
      expect(face).toContain('unicode-range:')
      expect(face).toContain('font-family: "Noto Color Emoji"')
    }
  })

  it('usa només WOFF: els WOFF2 del paquet es carreguen però no es pinten a Chrome', () => {
    expect(emojiFontCss).not.toMatch(/\.woff2/)
    const srcs = emojiFontCss.match(/src:[^;]+;/g) ?? []
    expect(srcs.length).toBeGreaterThan(0)
    for (const src of srcs) expect(src).toContain('.woff')
  })
})
