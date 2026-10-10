// Genera src/data/catalunyaMap.ts a partir del TopoJSON de municipis de Catalunya.
//
//   npm run build:map
//
// Font de les geometries: https://github.com/sirisacademic/catalonia-cartography
// (cat-municipis.json, generat amb https://github.com/gmarull/cat-topojson a partir de
// dades de l'Institut Cartogràfic i Geològic de Catalunya).
//
// Convertim cada municipi en un únic <path> SVG amb coordenades enteres relatives per
// mantenir el fitxer petit. La projecció és equirectangular corregida per la latitud
// mitjana (Catalunya és prou petita perquè la distorsió sigui imperceptible).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, "data", "cat-municipis.topo.json");
const OUT = path.join(here, "..", "src", "data", "catalunyaMap.ts");

const UNITS_PER_DEG = 1000; // 1 unitat del viewBox ≈ 111 m
const EXPECTED_MUNICIPIS = 947;

// Municipis amb la geometria degenerada al dataset original (dos arcs de 2 punts, 0,63 km²).
// Es conserven a la llista (existeixen) però sense path: el mapa no els dibuixa.
const KNOWN_UNDRAWABLE = new Set(["Puigdàlber"]);

// Codis de comarca (Idescat): ordre alfabètic i Moianès (2015) afegit al final.
// Índex del vector = codi - 1. Verificat més avall amb municipis coneguts.
const COMARQUES = [
  "Alt Camp", "Alt Empordà", "Alt Penedès", "Alt Urgell", "Alta Ribagorça",
  "Anoia", "Bages", "Baix Camp", "Baix Ebre", "Baix Empordà", "Baix Llobregat",
  "Baix Penedès", "Barcelonès", "Berguedà", "Cerdanya", "Conca de Barberà",
  "Garraf", "Garrigues", "Garrotxa", "Gironès", "Maresme", "Montsià",
  "Noguera", "Osona", "Pallars Jussà", "Pallars Sobirà", "Pla d’Urgell",
  "Pla de l’Estany", "Priorat", "Ribera d’Ebre", "Ripollès", "Segarra",
  "Segrià", "Selva", "Solsonès", "Tarragonès", "Terra Alta", "Urgell",
  "Val d’Aran", "Vallès Occidental", "Vallès Oriental", "Moianès",
];

// [nom del municipi al dataset, comarca esperada]
const SANITY = [
  ["la Seu d'Urgell", "Alt Urgell"], ["el Pont de Suert", "Alta Ribagorça"],
  ["Reus", "Baix Camp"], ["el Vendrell", "Baix Penedès"], ["Berga", "Berguedà"],
  ["les Borges Blanques", "Garrigues"], ["Amposta", "Montsià"], ["Vic", "Osona"],
  ["Tremp", "Pallars Jussà"], ["Mollerussa", "Pla d’Urgell"],
  ["Móra d'Ebre", "Ribera d’Ebre"], ["Cervera", "Segarra"], ["Lleida", "Segrià"],
  ["Gandesa", "Terra Alta"], ["Moià", "Moianès"], ["Vielha e Mijaran", "Val d’Aran"],
  ["Puigcerdà", "Cerdanya"], ["Vilafranca del Penedès", "Alt Penedès"],
  ["Vilanova i la Geltrú", "Garraf"], ["Montblanc", "Conca de Barberà"],
  ["Falset", "Priorat"], ["Valls", "Alt Camp"], ["Figueres", "Alt Empordà"],
  ["Tarragona", "Tarragonès"], ["Mataró", "Maresme"], ["Girona", "Gironès"],
];

const normalize = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

const topo = JSON.parse(fs.readFileSync(SRC, "utf8"));
const geoms = topo.objects.municipis.geometries;
const [minLon, minLat, maxLon, maxLat] = topo.objects.municipis.bbox;

// --- Descodificació TopoJSON (arcs quantitzats i codificats en delta) ---
const [sx, sy] = topo.transform.scale;
const [tx, ty] = topo.transform.translate;
const arcs = topo.arcs.map((arc) => {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * sx + tx, y * sy + ty];
  });
});

const ringPoints = (indices) => {
  const pts = [];
  for (const i of indices) {
    const a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse();
    pts.push(...(pts.length ? a.slice(1) : a));
  }
  return pts;
};

// --- Projecció ---
const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
const project = ([lon, lat]) => [
  Math.round((lon - minLon) * kx * UNITS_PER_DEG),
  Math.round((maxLat - lat) * UNITS_PER_DEG),
];
const MAP_W = Math.round((maxLon - minLon) * kx * UNITS_PER_DEG);
const MAP_H = Math.round((maxLat - minLat) * UNITS_PER_DEG);

// --- Serialització a path SVG (relatiu, sense separadors innecessaris) ---
const joinNums = (nums) => {
  let out = "";
  for (const n of nums) out += (out && n >= 0 ? " " : "") + n;
  return out;
};

const ringToPath = (indices) => {
  const pts = [];
  for (const p of ringPoints(indices).map(project)) {
    const last = pts[pts.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) pts.push(p);
  }
  if (pts.length > 1) {
    const f = pts[0];
    const l = pts[pts.length - 1];
    if (f[0] === l[0] && f[1] === l[1]) pts.pop();
  }
  if (pts.length < 3) return "";
  const deltas = [];
  for (let i = 1; i < pts.length; i++) {
    deltas.push(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return `M${pts[0][0]} ${pts[0][1]}l${joinNums(deltas)}z`;
};

const geomToPath = (g) => {
  const polys = g.type === "Polygon" ? [g.arcs] : g.arcs;
  return polys.map((rings) => rings.map(ringToPath).join("")).join("");
};

const municipis = geoms.map((g) => ({
  // El dataset guarda l'id com a número: els de la província de Barcelona (08xxxx) perden el 0
  id: String(g.id).padStart(6, "0"),
  n: g.properties.nom,
  c: g.properties.comarca,
  d: geomToPath(g),
}));

// --- Validacions ---
if (municipis.length !== EXPECTED_MUNICIPIS)
  throw new Error(`S'esperaven ${EXPECTED_MUNICIPIS} municipis i n'hi ha ${municipis.length}`);
if (new Set(municipis.map((m) => m.id)).size !== municipis.length)
  throw new Error("Hi ha identificadors de municipi duplicats");
const empty = municipis.filter((m) => !m.d && !KNOWN_UNDRAWABLE.has(m.n));
if (empty.length) throw new Error(`Municipis sense geometria: ${empty.map((m) => m.n).join(", ")}`);
for (const name of KNOWN_UNDRAWABLE) {
  const m = municipis.find((x) => x.n === name);
  if (!m) throw new Error(`KNOWN_UNDRAWABLE: «${name}» ja no és al dataset`);
  if (m.d) console.warn(`Avís: «${name}» ara sí té geometria; treu-lo de KNOWN_UNDRAWABLE`);
}
const badComarca = municipis.filter((m) => !COMARQUES[m.c - 1]);
if (badComarca.length) throw new Error(`Codis de comarca desconeguts: ${badComarca.map((m) => m.c)}`);

const byName = new Map(municipis.map((m) => [normalize(m.n), m]));
for (const [name, comarca] of SANITY) {
  const m = byName.get(normalize(name));
  if (!m) throw new Error(`Sanity check: no trobo «${name}» al dataset`);
  if (COMARQUES[m.c - 1] !== comarca)
    throw new Error(`Sanity check: «${name}» és a ${COMARQUES[m.c - 1]}, s'esperava ${comarca}`);
}

// --- Sortida ---
const header = `// GENERAT AUTOMÀTICAMENT per scripts/build-map.mjs (npm run build:map). No editar a mà.
// Geometries: sirisacademic/catalonia-cartography · gmarull/cat-topojson (dades de l'ICGC).
`;
const body = `
export interface MapMunicipi {
  /** Codi Idescat de 6 dígits */
  id: string;
  /** Nom oficial del municipi */
  n: string;
  /** Codi de comarca (1..42); índex a MAP_COMARQUES = codi - 1 */
  c: number;
  /** Path SVG (coordenades enteres relatives dins del viewBox 0 0 MAP_W MAP_H) */
  d: string;
}

export const MAP_W = ${MAP_W};
export const MAP_H = ${MAP_H};

export const MAP_COMARQUES: string[] = ${JSON.stringify(COMARQUES)};

export const MUNICIPIS: MapMunicipi[] = [
${municipis.map((m) => "  " + JSON.stringify(m)).join(",\n")},
];
`;
fs.writeFileSync(OUT, header + body);

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`OK: ${municipis.length} municipis · viewBox ${MAP_W}x${MAP_H} · ${kb} KB -> ${path.relative(process.cwd(), OUT)}`);
