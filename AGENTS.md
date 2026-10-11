# Guia per als agents

## Context i convencions
- Emotira és un joc de pobles amb React, TypeScript i Vite. Llegeix el README.md per a les comandes, l'estructura i la marca.
- Mantén la interfície i les explicacions en català. Segueix els patrons existents i evita dependències sense necessitat.
- Reutilitza els tokens de src/App.css i Icon.tsx. El verd indica encerts o pobles descoberts. Mantén el contrast, el focus visible, el teclat i el suport mòbil; respecta prefers-reduced-motion.

## Regles i persistència
- Conserva la normalització compartida de respostes i àlies a src/utils/normalize.ts.
- El repte diari és determinista per data local: no canviïs la selecció o la ratxa accidentalment en afegir altres modes.
- Mantén la compatibilitat de localStorage amb registres antics: afegeix valors per defecte i no esborris el progrés existent.
- Desa els pobles encertats a la col·lecció en el moment de resoldre'ls.
- Al contrarellotge, una resposta incorrecta buida les lletres i retorna el focus al camp. El primer error desbloqueja la comarca i el segon la primera lletra; les pistes es reinicien amb cada poble.
- Al contrarellotge: 120 segons inicials i 3 intents per poble. Saltar resta 2 segons i reinicia el bonus; el tercer error revela la resposta i avança sense restar temps, però també reinicia el bonus. Cada 5 encerts seguits +5 segons, fins a 180 segons acumulats. El rellotge segueix durant les transicions i en segon pla; no acceptis respostes fora de temps.

## API i dades
- Treballa amb npm run dev:mock per a comprovacions locals. Mantén el contracte src/api/types.ts en les implementacions mock i Supabase.
- Els components han de passar per src/api; evita noves crides directes que saltin el mode mock.
- No incorporis secrets o claus privilegiades al repositori ni a variables VITE_ (s'exposen al navegador).
- src/data/catalunyaMap.ts és generat: modifica la font o scripts/build-map.mjs i regenera amb npm run build:map.

## Validació i lliurament
- Executa npm run lint i npm run build després de canvis al codi.
- Comprova els fluxos afectats en mode mock, incloent teclat i pantalla mòbil quan canviï la interfície.
- Revisa el diff, preserva els canvis de l'usuari i informa de què has canviat, què has verificat i qualsevol comprovació pendent.
