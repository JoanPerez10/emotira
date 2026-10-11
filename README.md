# Emotira

Endevina què és amb només emojis. Joc de preguntes tipus Wordle fet amb React,
TypeScript i Vite. La mascota és la Guineu.

## Marca

- **Nom:** Emotira
- **Mascota:** Guineu (`public/assets/main_menu_guini.png`, amb fons transparent)
- **Logo:** `public/assets/logo.png` (app mòbil) · `public/favicon.png` (web, 256 px)
- **Contrarellotge:** `public/assets/contrarellotge-guineu.png` (menú, normes i resultat)

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
npm run build      # compila TypeScript + bundle de producció
npm run preview    # serveix el build
npm run lint       # ESLint
npm run build:map  # regenera les dades del mapa
```

## Estructura

- `src/App.tsx` — navegació entre pantalles (menú, partida, resultat, col·lecció…)
- `src/components/Game.tsx` — la partida: lletres, pistes, punts
- `src/components/LetterInput.tsx` — input de lletres estil Wordle (tecles + input invisible)
- `src/components/Icon.tsx` — icones SVG de traç
- `src/components/CatalunyaMap.tsx` — mapa de la col·lecció
- `src/data/puzzles.ts` — les pistes (emojis → nom del poble)
- `src/utils/storage.ts` — rècords, ratxa i col·lecció (localStorage)
- `src/api/` — Supabase (amb un `mockApi` per al mode mock)

## Contrarellotge

Des del menú, entra al mode, llegeix les normes i prem **Jugar** per iniciar el
rellotge. Tens 120 segons i 3 intents per poble. Cada encert suma
1 punt i compta per a la col·lecció. Saltar resta 2 segons i envia el poble al
final de la cua; el tercer error revela el nom i avança sense restar temps.
Les respostes incompletes no consumeixen intents, i s'accepten els àlies.
Una resposta incorrecta buida les lletres. Després del primer error apareix
la comarca com a pista; després del segon també es mostra la primera lletra.

Cada 5 encerts seguits guanyes 5 segons, fins a 60 segons extra (3 minuts
acumulats). Saltar o esgotar els intents reinicia el bonus; els dos primers
errors no el trenquen. El rellotge continua durant les transicions i en segon
pla. Al final es mostra només el resultat i els botons «Tornar a jugar» i
«Menú», amb un rècord propi compatible amb el progrés desat abans d'afegir
aquest mode.

La lògica és a `src/utils/timeTrial.ts`; la interfície i les normes són a
`src/components/TimeTrial.tsx`. Consulta `AGENTS.md` per a la guia dels agents.

## Pistes

### Mode Invers

S'entra directament a una partida de 10 pobles, sense cronòmetre. Es mostra el
nom del poble i una casella per emoji de la resposta. El jugador construeix la
combinació tocant un selector de 10 emojis; pot repetir un emoji i retirar
qualsevol còpia que encara no estigui fixada.

Els intents són il·limitats. En fallar, es conserven en verd els emojis a la
posició correcta i es buiden els altres espais, sense revelar la solució.
El botó **Pista** elimina dos distractors (màxim dues pistes per
poble: 10 → 8 → 6), sense moure les opcions restants ni eliminar cap emoji
correcte. Si elimina un emoji que has posat, se'n buida la casella.
**Em rendeixo** revela la combinació amb 0 punts. Després d'encertar o rendir-se,
cal prémer **Poble següent** o **Veure el resultat** al desè poble; no hi ha
temporitzadors ni avanç automàtic. Els encerts donen
3 punts inicials menys 1 per cada error o pista utilitzada, amb un mínim d'1
punt per encert i un màxim de 30 per partida. Un error i una pista també deixen
1 punt. Els encerts desbloquegen el poble a la col·lecció. No es mostren cors.

La partida és a `src/components/InverseGame.tsx` i la segmentació d'emojis i
generació d'opcions a `src/utils/inverse.ts`. La icona del menú és
`public/assets/invers-guineu.png`.

### Dades dels pobles

A `src/data/puzzles.ts` cada poble té `emojis`, `answer`, `aliases` (formes
alternatives acceptades), `comarca` i `explanation` (com es forma el nom).
El joc treu accents, espais i apòstrofs: `normalize()` és el que accepta el
teclat i el que es comprova en resoldre.
