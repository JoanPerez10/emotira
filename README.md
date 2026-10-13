# Emotira

Endevina què és amb només emojis. Joc de preguntes tipus Wordle fet amb React,
TypeScript i Vite. La mascota és la Guineu.

## Marca

- **Nom:** Emotira
- **Mascota:** Guineu (`public/assets/main_menu_guini.png`, amb fons transparent)
- **Logo:** `public/assets/logo.png` (app mòbil) · `public/favicon.png` (web, 256 px)

### Paleta

Totes les variables estan definides a `:root` (`src/App.css`). El color viu
decora; els tons `-deep`/`-ink` porten el text per mantenir contrast AA.

| Token | Color | Ús |
| --- | --- | --- |
| `--blue-deep` | `#1857c7` | acció principal, botons (6.51:1 amb blanc) |
| `--blue` | `#276cdc` | decoració, icones |
| `--blue-mid` | `#1a5ece` | hover |
| `--blue-ink` | `#14346e` | text blau sobre fons clar |
| `--blue-wash` | `#e9f0fb` | superfícies toves |
| `--orange` | `#f96b25` | accent de marca, gradient diari |
| `--orange-deep` | `#b84f1b` | botó taronja (5.03:1 amb blanc) |
| `--orange-ink` | `#8f3d14` | text sobre fons clar |
| `--orange-wash` | `#fdeadd` | superfícies toves |
| `--gold` | `--gold-ink` | `#fed54a` / `#4a3300` — recompenses, ratxa, guinyó |
| `--peach` | `#f7c678` | to càlid de support |
| `--green` (família) | — | **semàntic**: encertat i pobles descoberts |

El verd es reserva per als estats que signifiquen "encertat" (tecles verdes,
passos del progrés, municipis desbloquejats al mapa). La resta de la interfície
usa la paleta de marca blau/taronja.

## Comandes

```bash
npm install
npm run dev        # servidor de desenvolupament
npm run dev:mock   # amb dades simulades, sense Supabase
npm test           # executa els tests (s'han de fer tests sempre)
npm run build      # compila TypeScript + bundle de producció
npm run preview    # serveix el build
npm run lint       # ESLint
npm run build:map  # regenera les dades del mapa
```

## Proves

S'han de fer tests sempre davant de qualsevol canvi o nova funcionalitat (`npm test`).

## Estructura

- `src/App.tsx` — navegació entre pantalles (menú, partida, resultat, col·lecció…)
- `src/components/Game.tsx` — la partida: lletres, pistes, punts
- `src/components/LetterInput.tsx` — input de lletres estil Wordle (tecles + input invisible)
- `src/components/Icon.tsx` — icones SVG de traç
- `src/components/CatalunyaMap.tsx` — mapa de la col·lecció
- `src/data/puzzles.ts` — les pistes (emojis → nom del poble)
- `src/utils/storage.ts` — rècords, ratxa i col·lecció (localStorage)
- `src/api/` — Supabase (amb un `mockApi` per al mode mock)

## Pistes

A `src/data/puzzles.ts` cada poble té `emojis`, `answer`, `aliases` (formes
alternatives acceptades), `comarca` i `explanation` (com es forma el nom).
El joc treu accents, espais i apòstrofs: `normalize()` és el que accepta el
teclat i el que es comprova en resoldre.