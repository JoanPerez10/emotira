// Genera src/emojiFont.ts a partir del paquet @fontsource/noto-color-emoji.
//
//   npm run build:emoji-font
//
// Per què generem nosaltres les declaracions en lloc d'importar el CSS del
// paquet: els seus fitxers .woff2 es carreguen però Chrome no en pinta cap
// glif (ni al text ni al canvas), de manera que l'emoji desapareix sense cap
// error; amb els .woff es pinta bé. Aquest script fa servir els mateixos
// subconjunts i els mateixos `unicode-range` que el paquet —així el navegador
// només baixa el tros que li cal— canviant-ne només el fitxer font.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(here, "..", "node_modules", "@fontsource", "noto-color-emoji");
const OUT = path.join(here, "..", "src", "emojiFont.ts");

const ranges = JSON.parse(fs.readFileSync(path.join(PKG, "unicode.json"), "utf8"));

const subsets = Object.entries(ranges).map(([subset, range]) => {
  const name = `noto-color-emoji-${subset.replace(/[[\]]/g, "")}-400-normal`;
  if (!fs.existsSync(path.join(PKG, "files", `${name}.woff`)))
    throw new Error(`Falta ${name}.woff. Torna a instal·lar les dependències.`);
  return { id: name.replace(/^noto-color-emoji-(\d+)-400-normal$/, "woff$1"), range };
});

const imports = subsets
  .map(({ id }) => {
    const subset = id.replace(/^woff/, "");
    return `import ${id} from "@fontsource/noto-color-emoji/files/noto-color-emoji-${subset}-400-normal.woff?url";`;
  })
  .join("\n");

const faces = subsets.map(({ id, range }) => `  [${id}, "${range}"],`).join("\n");

const file = `/* GENERAT — no editis aquest fitxer a mà.

   Noto Color Emoji autoallotjada (OFL-1.1), un subconjunt per @font-face i el
   seu unicode-range: així el navegador només baixa el tros d'emoji que la
   pàgina fa servir. L'escriu scripts/build-emoji-font.mjs a partir del paquet
   @fontsource/noto-color-emoji. Per actualitzar-la:

     npm run build:emoji-font
*/
${imports}

/** Fitxer i unicode-range de cada subconjunt, tal com els dona el paquet. */
const faces: ReadonlyArray<readonly [string, string]> = [
${faces}
];

/**
 * Declaracions @font-face d'emoji, amb .woff: els .woff2 d'aquest paquet es
 * carreguen però no es pinten a Chrome (ni al text ni al canvas).
 */
export const emojiFontCss = faces
  .map(
    ([url, range]) => \`@font-face {
  font-family: "Noto Color Emoji";
  font-style: normal;
  font-display: swap;
  font-weight: 400;
  src: url("\${url}") format("woff");
  unicode-range: \${range};
}\`,
  )
  .join("\\n\\n");
`;

fs.writeFileSync(OUT, file);
console.log(`src/emojiFont.ts: ${subsets.length} subconjunts d'emoji`);
