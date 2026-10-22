import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(process.cwd(), 'src/emoji-font.css'), 'utf8')

describe('emoji-font', () => {
  it('declara Noto Color Emoji sota un nom propi', () => {
    expect(css).toContain('font-family: "Emotira Emoji"')
  })

  it('usa només WOFF: els WOFF2 de fontsource no pinten a Chrome', () => {
    expect(css).not.toMatch(/url\([^)]*\.woff2/)
    const srcs = css.match(/src:[^;]+;/g) ?? []
    expect(srcs.length).toBeGreaterThan(0)
    for (const src of srcs) expect(src).toContain('.woff')
  })
})
