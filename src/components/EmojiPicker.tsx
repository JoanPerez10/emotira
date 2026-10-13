import { useMemo, useState } from "react";
import { puzzles } from "../data/puzzles";
import { splitGraphemes } from "../utils/graphemes";

/**
 * Selector d'emojis propi, en lloc de `emoji-picker-react` (41 MB i desenes
 * de milers d'emojis per un camp que admet 10). Aquí només hi ha el que
 * serveix per endevinar un poble de Catalunya, agrupat i amb cerca.
 */

type Entry = readonly [emoji: string, ...keywords: string[]];

interface Group {
  id: string;
  label: string;
  items: Entry[];
}

const BASE_GROUPS: Group[] = [
  {
    id: "llocs",
    label: "Llocs i natura",
    items: [
      ["🏠", "casa", "cal", "home", "habitatge"],
      ["🏡", "casa", "mas", "jardi", "hort"],
      ["🏘️", "poble", "vila", "barri", "cases"],
      ["🛖", "cabana", "barraca"],
      ["🏰", "castell", "fortalesa", "palau"],
      ["⛪", "esglesia", "campanar", "iglesia"],
      ["🏛️", "museu", "edifici", "monument"],
      ["🏨", "hostal", "hotel"],
      ["🏥", "hospital"],
      ["🏗️", "construccio", "obra", "grua"],
      ["🧱", "paret", "mur", "totxo", "maó"],
      ["🪨", "roca", "pedra"],
      ["⛰️", "muntanya", "mont", "puig", "cima"],
      ["🏔️", "muntanya", "neu", "alps", "pirineu"],
      ["🗻", "muntanya", "cim"],
      ["🌋", "volca", "erupcio"],
      ["🏞️", "vall", "riu", "parc", "paisatge"],
      ["🏜️", "desert", "sec", "seca"],
      ["🌲", "bosc", "pi", "pineda", "arbre"],
      ["🌳", "arbre", "bosc"],
      ["🌴", "palmera", "platja", "tropical"],
      ["🍀", "trevol", "sort"],
      ["🌷", "flor", "tulipa"],
      ["🌹", "rosa", "flor", "roses"],
      ["🌻", "girasol", "flor"],
      ["🌾", "camp", "era", "blat", "ordi"],
      ["🍄", "bolet", "bosc"],
      ["🌊", "mar", "aigua", "onada", "ona"],
      ["🏖️", "platja", "mar", "sorra"],
      ["⛲", "font", "aigua", "parc"],
      ["♨️", "aigues termals", "calent", "caldes", "balneari"],
      ["🌉", "pont"],
      ["🏕️", "camp", "camping", "acampada"],
      ["⛺", "tenda", "lona", "camping"],
      ["☀️", "sol", "estiu"],
      ["🌙", "lluna", "nit"],
      ["⭐", "estrella"],
      ["🪐", "planeta", "mart", "saturn"],
      ["❄️", "neu", "fred", "gel"],
      ["🔥", "foc", "flama"],
      ["💧", "gota", "aigua"],
    ],
  },
  {
    id: "animals",
    label: "Animals",
    items: [
      ["🦊", "guineu", "rabosa"],
      ["🐶", "gos", "perro"],
      ["🐕", "gos", "gosset"],
      ["🐱", "gat", "gato", "miau"],
      ["🐈", "gat"],
      ["🐭", "ratoli", "rata"],
      ["🐰", "conill", "llebre"],
      ["🐿️", "esquirol"],
      ["🐻", "os"],
      ["🐺", "llop"],
      ["🐗", "senglar"],
      ["🦌", "cervol", "cérvol"],
      ["🐐", "cabra"],
      ["🐑", "ovella", "be", "xai"],
      ["🐂", "bou", "brau", "toro"],
      ["🐮", "vaca"],
      ["🐴", "cavall", "egua"],
      ["🫏", "ruc", "ase", "burro"],
      ["🐷", "porc", "garri"],
      ["🦁", "lleo"],
      ["🐯", "tigre"],
      ["🐔", "gallina"],
      ["🐓", "gall"],
      ["🐦", "ocell", "pardal", "au"],
      ["🕊️", "colom", "pau", "coloma"],
      ["🦅", "aguila", "àliga"],
      ["🦆", "anec", "ànec"],
      ["🦉", "oliba", "mussol", "duc"],
      ["🐸", "granota"],
      ["🐢", "tortuga"],
      ["🐍", "serp"],
      ["🐌", "cargol", "caragol", "lent"],
      ["🐝", "abella", "mel"],
      ["🦋", "papallona"],
      ["🐜", "formiga"],
      ["🐟", "peix"],
      ["🐬", "dofi", "dofí"],
      ["🐳", "balena"],
      ["🦈", "tauro", "tauró"],
      ["🐙", "pop"],
      ["🦀", "cranc"],
      ["🦞", "llagosta", "llamàntol"],
    ],
  },
  {
    id: "menjar",
    label: "Menjar i beure",
    items: [
      ["🍎", "poma"],
      ["🍐", "pera"],
      ["🍊", "taronja"],
      ["🍋", "llimona", "llima"],
      ["🍌", "platan", "plàtan"],
      ["🍉", "sindria", "síndria"],
      ["🍈", "melo", "meló"],
      ["🍇", "raim", "raïm", "vinya"],
      ["🍓", "maduixa"],
      ["🍒", "cirera"],
      ["🍑", "pressec", "préssec"],
      ["🍍", "pinya"],
      ["🫒", "oliva", "olivera"],
      ["🌰", "castanya"],
      ["🍅", "tomaquet", "tomàquet", "tomata"],
      ["🥕", "pastanaga"],
      ["🌽", "blat de moro"],
      ["🌶️", "bitxo", "pebrot", "picant"],
      ["🧄", "all"],
      ["🧅", "ceba"],
      ["🍞", "pa"],
      ["🥖", "pa", "barra"],
      ["🥐", "croissant"],
      ["🧀", "formatge"],
      ["🥚", "ou"],
      ["🧂", "sal", "salt"],
      ["🍯", "mel"],
      ["🍫", "xocolata"],
      ["🍰", "pastis", "pastís"],
      ["🎂", "pastis", "aniversari"],
      ["🍪", "galeta"],
      ["🍕", "pizza"],
      ["🍔", "hamburguesa"],
      ["☕", "cafe", "cafè"],
      ["🍷", "vi"],
      ["🍺", "cervesa"],
      ["🍹", "coctel", "còctel", "terrassa", "beguda"],
    ],
  },
  {
    id: "gent",
    label: "Gent i cos",
    items: [
      ["👶", "nado", "nadó", "bebe"],
      ["🧒", "nen", "nena", "infant"],
      ["👦", "nen", "noi"],
      ["👧", "nena", "noia"],
      ["👩", "dona", "ella"],
      ["👨", "home", "ell"],
      ["👴", "avi"],
      ["👵", "avia", "àvia"],
      ["👸", "princesa", "verge", "reina"],
      ["🤴", "princep", "príncep"],
      ["👑", "corona", "rei", "reina"],
      ["🧚‍♀️", "fada", "ada"],
      ["🧙", "mag", "bruixa"],
      ["🧜", "sirena"],
      ["👮", "policia"],
      ["💂", "guardia"],
      ["🧑‍🌾", "pages", "pagès", "agricultor"],
      ["👨‍🍳", "cuiner", "xef"],
      ["🏊‍♀️", "nedar", "neda", "nedadora"],
      ["🚴", "bici", "ciclista"],
      ["🏃", "correr", "corre"],
      ["🧗", "escalar", "escalada"],
      ["👂", "orella", "sentir"],
      ["👃", "nas"],
      ["👁️", "ull"],
      ["👄", "boca", "llavis"],
      ["🦷", "dent", "queixal"],
      ["🧠", "cervell"],
      ["❤️", "cor", "amor"],
      ["🖐️", "ma", "mà"],
      ["👍", "be", "bé", "bo"],
      ["👎", "malament", "mal", "dolent"],
      ["🤏", "petit", "poc", "et", "diminutiu"],
      ["🙏", "resar", "resa", "pregar", "si us plau"],
      ["💪", "muscle", "força", "fort"],
      ["🦵", "cama"],
      ["🦶", "peu"],
    ],
  },
  {
    id: "cares",
    label: "Cares",
    items: [
      ["😊", "content", "grat", "somriure"],
      ["😍", "bell", "bonic", "enamorat"],
      ["😡", "enfadat", "colera", "ira"],
      ["😢", "trist", "plorar"],
      ["😱", "por", "espant"],
      ["🥶", "fred", "gelat", "gelida"],
      ["🥵", "calor"],
      ["🤧", "tos", "esternut", "refredat"],
      ["🤥", "mentider", "fals", "mentida"],
      ["😴", "dormir", "son"],
      ["🤔", "pensar", "dubte"],
      ["😂", "riure"],
    ],
  },
  {
    id: "coses",
    label: "Coses i transport",
    items: [
      ["🚗", "cotxe"],
      ["🚌", "autobus", "autobús"],
      ["🚲", "bicicleta", "bici"],
      ["🚂", "tren"],
      ["✈️", "avio", "avió"],
      ["🚁", "helicopter"],
      ["⛵", "veler", "vela"],
      ["🛶", "barca", "canoa"],
      ["🚢", "vaixell"],
      ["⚓", "ancora", "àncora", "port"],
      ["🔪", "ganivet", "matar"],
      ["✂️", "tisores", "tallar", "tosa"],
      ["🪵", "fusta", "pal", "tronc"],
      ["🪜", "escala"],
      ["⚙️", "engranatge", "moli", "molí", "roda"],
      ["🔦", "llanterna"],
      ["🔑", "clau"],
      ["🔔", "campana"],
      ["🔊", "so", "sona", "altaveu"],
      ["💰", "diners", "ric", "riquesa"],
      ["💎", "diamant", "joia", "rubi", "robí"],
      ["💍", "anell", "aro"],
      ["🥈", "argent", "plata", "segon"],
      ["🥇", "or", "primer"],
      ["💈", "barber", "barberia"],
      ["🛁", "bany", "banyera"],
      ["🎨", "art", "pintura", "paleta"],
      ["🎸", "guitarra"],
      ["🎻", "violi", "violí"],
      ["📚", "llibres"],
      ["📜", "pergami", "carta"],
      ["🏺", "amfora", "àmfora", "ceramica"],
      ["🧭", "bruixola", "brúixola"],
      ["⚽", "futbol", "pilota"],
      ["🏀", "basquet", "bàsquet"],
      ["🎾", "tennis"],
      ["🎯", "diana", "punteria"],
      ["🎣", "pesca", "canya"],
      ["🎲", "dau", "joc"],
    ],
  },
  {
    id: "simbols",
    label: "Lletres, números i símbols",
    items: [
      ["⭕", "o", "cercle", "rodo", "rodó"],
      ["⚪", "blanc", "blanca", "rodo", "rodó"],
      ["⚫", "negre"],
      ["🔴", "vermell", "roig"],
      ["🟢", "verd"],
      ["🔵", "blau"],
      ["🟡", "groc"],
      ["🟰", "igual"],
      ["➕", "mes", "més", "suma"],
      ["➖", "menys"],
      ["❌", "no", "creu"],
      ["❓", "pregunta"],
      ["🆕", "nou", "new"],
      ["🆗", "ok", "d'acord"],
      ["🅰️", "a", "lletra a"],
      ["🅱️", "b", "lletra b"],
      ["0️⃣", "zero", "0"],
      ["1️⃣", "u", "un", "1"],
      ["2️⃣", "dos", "2"],
      ["3️⃣", "tres", "3"],
      ["4️⃣", "quatre", "quart", "4"],
      ["5️⃣", "cinc", "5"],
      ["6️⃣", "sis", "6"],
      ["7️⃣", "set", "7"],
      ["8️⃣", "vuit", "8"],
      ["9️⃣", "nou", "9"],
      ["🔟", "deu", "10"],
      ["💯", "cent", "100"],
    ],
  },
  {
    id: "banderes",
    label: "Banderes",
    items: [
      ["🇬🇧", "angles", "anglès", "anglaterra", "regne unit"],
      ["🇫🇷", "frances", "francès", "franca", "frança"],
      ["🇪🇸", "espanya", "espanyol"],
      ["🇦🇩", "andorra", "andorra"],
      ["🇮🇹", "italia", "itàlia", "italià"],
      ["🇵🇹", "portugal", "portugues", "portuguès"],
      ["🇩🇪", "alemanya", "alemany"],
      ["🇳🇱", "holanda", "paisos baixos", "holandès"],
      ["🇧🇪", "belgica", "bèlgica"],
      ["🇨🇭", "suissa", "suís"],
      ["🇬🇷", "grecia", "grècia", "grec"],
      ["🇮🇪", "irlanda", "irlandès"],
      ["🇺🇸", "estats units", "america", "americà"],
      ["🇲🇽", "mexic", "mèxic"],
      ["🇦🇷", "argentina"],
      ["🇧🇷", "brasil"],
      ["🇨🇺", "cuba"],
      ["🇲🇦", "marroc"],
      ["🇯🇵", "japo", "japó", "japonès"],
      ["🇨🇳", "xina", "xinès"],
      ["🇪🇺", "europa", "unio europea"],
      ["🏳️", "bandera blanca", "blanca"],
      ["🏴", "bandera negra", "negra"],
      ["🏁", "bandera", "meta", "quadres"],
    ],
  },
];

/** Divideix en grafemes: 👩‍⚕️ són tres punts de codi però un sol emoji. */
const graphemes = splitGraphemes;

/** Compara sense el selector de variació (U+FE0F): «☀» i «☀️» són el mateix. */
const bare = (e: string) => e.replace(/\uFE0F/g, "");

/**
 * Xarxa de seguretat: qualsevol emoji que faci servir un trencaclosques i no
 * sigui a cap grup va a «Altres», amb el nom del poble com a paraula de cerca.
 * Així, si s'afegeix un poble nou, el selector no es queda curt.
 */
const GROUPS: Group[] = (() => {
  const known = new Set(BASE_GROUPS.flatMap((g) => g.items.map((e) => bare(e[0]))));
  const extra = new Map<string, string[]>();
  for (const p of puzzles) {
    for (const g of graphemes(p.emojis)) {
      if (!g.trim() || known.has(bare(g))) continue;
      extra.set(g, [...(extra.get(g) ?? []), p.answer]);
    }
  }
  if (extra.size === 0) return BASE_GROUPS;
  const items: Entry[] = [...extra].map(([e, words]) => [e, ...words]);
  return [...BASE_GROUPS, { id: "altres", label: "Altres", items }];
})();

/** Normalitza per a la cerca: sense accents, minúscules, sense espais. */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

interface Props {
  /** Emojis ja triats, per pintar-los com a seleccionats. */
  selected: string;
  onPick: (emoji: string) => void;
}

export default function EmojiPicker({ selected, onPick }: Props) {
  const [query, setQuery] = useState("");

  const q = norm(query.trim());

  const results = useMemo(() => {
    if (!q) return null;
    const hits: { entry: Entry; group: Group }[] = [];
    const seen = new Set<string>(); // un emoji pot ser a dos grups: es mostra un cop
    for (const group of GROUPS) {
      for (const entry of group.items) {
        if (seen.has(entry[0])) continue;
        const name = norm(entry.slice(1).join(" "));
        if (name.includes(q) || norm(entry[0]) === q) {
          seen.add(entry[0]);
          hits.push({ entry, group });
        }
      }
    }
    return hits;
  }, [q]);

  return (
    <div className="picker" role="dialog" aria-label="Selector d'emojis">
      <div className="picker-search">
        <IconSearch />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca: casa, mar, gos…"
          aria-label="Cerca un emoji"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="picker-clear"
            onClick={() => setQuery("")}
            aria-label="Neteja la cerca"
          >
            ×
          </button>
        )}
      </div>

      <div className="picker-body">
        {results ? (
          results.length === 0 ? (
            <p className="picker-empty">
              Cap emoji per «{query}». Prova «casa», «mar» o «bosc».
            </p>
          ) : (
            <>
              <p className="picker-count">
                {results.length} {results.length === 1 ? "resultat" : "resultats"}
              </p>
              <div className="picker-grid">
                {results.map(({ entry, group }) => (
                  <EmojiButton
                    key={`${group.id}-${entry[0]}`}
                    entry={entry}
                    picked={selected.includes(entry[0])}
                    onPick={onPick}
                  />
                ))}
              </div>
            </>
          )
        ) : (
          GROUPS.map((group) => (
            <section key={group.id} className="picker-group">
              <h4 className="picker-label">{group.label}</h4>
              <div className="picker-grid">
                {group.items.map((entry) => (
                  <EmojiButton
                    key={`${group.id}-${entry[0]}`}
                    entry={entry}
                    picked={selected.includes(entry[0])}
                    onPick={onPick}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function EmojiButton({
  entry,
  picked,
  onPick,
}: {
  entry: Entry;
  picked: boolean;
  onPick: (e: string) => void;
}) {
  const [emoji, ...words] = entry;
  return (
    <button
      type="button"
      className={`picker-emoji${picked ? " picked" : ""}`}
      onClick={() => onPick(emoji)}
      title={words.join(", ")}
      aria-label={`Afegir ${words[0] ?? emoji}`}
      aria-pressed={picked}
    >
      {emoji}
    </button>
  );
}

/** Llupa: un SVG inline per no carregar la llibreria d'icones per això. */
function IconSearch() {
  return (
    <svg
      className="picker-search-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}