# Emotira

Joc de pobles amb emojis, fet amb React, TypeScript i Vite.

## Desenvolupament

```bash
npm install
npm run dev:mock   # dades simulades, sense Supabase
npm run dev        # configuració habitual
npm run build      # compilació de producció
npm run lint       # revisió del codi
npm run preview    # previsualització del build
npm run build:map  # regeneració del mapa
```

## Codi

- `src/App.tsx`: navegació i modes de joc.
- `src/components/`: interfície del joc.
- `src/data/puzzles.ts`: pobles, emojis i explicacions.
- `src/utils/`: respostes, puntuació i persistència local.
- `src/api/`: implementacions mock i Supabase.
- `src/App.css`: estils i colors de marca.

Consulta [AGENTS.md](AGENTS.md) per a les convencions del projecte.
