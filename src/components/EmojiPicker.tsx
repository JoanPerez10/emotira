import { useMemo, useState } from "react";

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

const GROUPS: Group[] = [
  {
    id: "llocs",
    label: "Llocs i natura",
    items: [
      ["🏠", "casa", "home", "habitatge"],
      ["🏡", "casa", "jardi", "hort"],
      ["🏘️", "poble", "villa", "barri"],
      ["🏰", "castell", "fortalesa", "palau"],
      ["⛪", "esglesia", "campanar", "iglesia"],
      ["🏛️", "museu", "edifici", "monument"],
      ["🕌", "mesquita"],
      ["🏗️", "construccio", "obra", "grua"],
      ["⛰️", "muntanya", "muntanyes", "cima"],
      ["🌋", "volca", "erupcio"],
      ["🌲", "bosc", "pi", "arbre", "conifera"],
      ["🌳", "arbre", "bosc"],
      ["🌴", "palmera", "platja", "tropical"],
      ["🌷", "flor", "tulipa"],
      ["🌹", "rosa", "flor", "roses"],
      ["🌻", "girasol", "flor", "sol"],
      ["🌊", "mar", "aigua", "onada"],
      ["🏖️", "platja", "mar", "vacances"],
      ["⛲", "font", "aigua", "parc"],
      ["🌉", "pont"],
      ["🏕️", "camping", "tienda", "acampada"],
      ["🏔️", "muntanya", "neu", "everest"],
      ["🗻", "muntanya", "cima"],
      ["🌾", "camp", "sembra", "ordi"],
      ["🍇", "vinya", "raïm", "vinyes"],
      ["🍊", "taronja", "fruita", "citric"],
      ["🍋", "llima", "fruita"],
      ["🍄", "bolet", "bosque", "funga"],
    ],
  },
  {
    id: "animals",
    label: "Animals",
    items: [
      ["🦊", "guineu", "raposa", "foix"],
      ["🐶", "gos", "perro"],
      ["🐱", "gat", "gato", "miau"],
      ["🐭", "ratolí", "rat"],
      ["🐰", "conill", "llebre"],
      ["🐻", "os", "teddy"],
      ["🐼", "panda"],
      ["🐨", "koala"],
      ["🐯", "tigre"],
      ["🦁", "lleó", "leó", "bos"],
      ["🐮", "vaca", "vache"],
      ["🐷", "porc", "gall"],
      ["🐸", "granota", "rana"],
      ["🐔", "gall", "gallina"],
      ["🐧", "pinguï", "pinguin"],
      ["🐦", "ocell", "pardal", "au"],
      ["🦆", "ànec", "pato"],
      ["🦉", "boira", "búho"],
      ["🐝", "abella", "abeja", "mel"],
      ["🦋", "papallona", "mariposa"],
      ["🐌", "caragol", "babosa"],
      ["🐢", "tortuga"],
      ["🐬", "dofí", "delfín"],
      ["🐳", "balena"],
      ["🦈", "tiburón", "tiburon"],
      ["🐝", "mel", "abeja"],
      ["🐓", "gall", "roig"],
      ["🐕", "gos", "gosset"],
      ["🐈", "gat", "mig"],
      ["🐿️", "esquirol"],
    ],
  },
  {
    id: "comida",
    label: "Menjar i beure",
    items: [
      ["🍎", "poma", "manzana"],
      ["🍐", "pera"],
      ["🍊", "taronja", "naranja"],
      ["🍋", "llima", "limón"],
      ["🍌", "banana", "plàtan"],
      ["🍉", "meló", "sandia"],
      ["🍇", "raïm", "uvas"],
      ["🍓", "maduixa", "fresa"],
      ["🍒", "cirera", "cereza"],
      ["🍑", "préssec", "melocotón"],
      ["🥭", "mango"],
      ["🍍", "pinya", "ananás"],
      ["🍅", "tomàtiga", "tomate"],
      ["🥑", "alvocat", "aguacate"],
      ["🥦", "bròcoli"],
      ["🥕", "pastanaga", "zanahoria"],
      ["🌽", "blat de moro", "maíz"],
      ["🌶️", "pica", "pepino", "chili"],
      ["🍞", "pa", "pan", "barra"],
      ["🥐", "croissant"],
      ["🧀", "formatge", "queso"],
      ["🥚", "ou", "huevo"],
      ["🍔", "hamburgesa", "hamburguesa"],
      ["🍟", "patates fregides", "papel"],
      ["🍕", "pizza"],
      ["🌮", "taco"],
      ["🥗", "amanida", "ensalada"],
      ["🍰", "pastís", "tarta"],
      ["🍪", "galeta", "galleta"],
      ["🎂", "pastís", "tarta", "aniversari"],
      ["🍯", "mel"],
      ["🍫", "xocolata", "chocolate"],
      ["☕", "cafè", "te", "café"],
      ["🍺", "cervesa", "cerveza"],
      ["🍷", "vi", "vino"],
      ["🥖", "pa", "llarguer", "barra"],
      ["🧀", "formatge", "queso"],
    ],
  },
  {
    id: "activitat",
    label: "Esport i activitat",
    items: [
      ["⚽", "futbol", "pilota", "fútbol"],
      ["🏀", "basquet", "básquet"],
      ["🏈", "rugby", "futbol americà"],
      ["🎾", "tenis", "tennis"],
      ["🏐", "handbol", "voley"],
      ["🏓", "ping-pong", "tennis de taula"],
      ["🏸", "badminton"],
      ["🎯", "diana", "diana", "punteria"],
      ["⛳", "golf"],
      ["🏹", "arc", "fletxa"],
      ["🎣", "pesca", "canya"],
      ["🥊", "boxa", "punch"],
      ["🚴", "bici", "bicicleta", "ciclismo"],
      ["🏋️", "gimnàs", "pesa", "gimnasio"],
      ["🏃", "correr", "carrera", "atleta"],
      ["🧗", "escalar", "escalada"],
      ["🎮", "videojoc", "joc", "consola"],
      ["🎲", "taula", "dau", "joc"],
      ["🎯", "tir", "punteria"],
    ],
  },
  {
    id: "coses",
    label: "Coses i transport",
    items: [
      ["🚗", "cotxe", "carro", "coche"],
      ["🚌", "autobús", "bus"],
      ["🚲", "bicicleta", "bici"],
      ["✈️", "avió", "avio"],
      ["🚀", "nau", "llançament", "cohete"],
      ["⛵", "vaixell", "barca", "velero"],
      ["🚢", "vaixell", "barco", "navio"],
      ["🚂", "tren", "locomotora"],
      ["🚁", "helicopter"],
      ["🚚", "camió", "camio"],
      ["🗝️", "clau", "llave"],
      ["📜", "document", "pergamí", "carta"],
      ["💎", "diamant", "safir", "joia"],
      ["🔑", "clau", "llave"],
      ["🎻", "violí", "violin"],
      ["🎸", "guitarra", "guitar"],
      ["🎤", "microfon", "micro"],
      ["🎨", "pintura", "paleta", "art"],
      ["📚", "llibres", "libros", "estudi"],
      ["🧭", "brúixola", "brújula", "orientació"],
      ["⛪", "esglesia", "iglesia"],
      ["🏺", "ànfora", "vas", "ceràmica"],
      ["⚓", "àncora", "anclaje"],
      ["🧭", "mapa", "brúixola", "orientació"],
    ],
  },
  {
    id: "gent",
    label: "Gent",
    items: [
      ["👶", "nadó", "bebè", "bebe"],
      ["🧒", "nen", "nena", "niño"],
      ["👦", "nen", "noi", "niño"],
      ["👧", "nena", "noia", "niña"],
      ["🧑", "adult", "persona"],
      ["👩", "dona", "mujer"],
      ["👨", "home", "hombre"],
      ["👴", "avi", "abuelo"],
      ["👵", "àvia", "abuela"],
      ["👮", "policia", "policía"],
      ["🧑‍🌾", "pagès", "agricultor", "campesí"],
      ["👩‍⚕️", "infermera", "sanitari"],
      ["👩‍🏫", "mestra", "professor"],
      ["👨‍🍳", "cuiner", "xef", "cocinero"],
      ["👩‍🌾", "pagessa", "campesina"],
      ["🧙", "mag", "bruixa", "mago"],
      ["🎅", "pare Noel", "sant"],
      ["🥷", "ninja"],
      ["🧜", "sirena", "mermaid"],
      ["💂", "guardia", "guard"],
      ["🕵️", "detectiu", "espia"],
      ["👨‍🚀", "astronauta", "astronauta"],
    ],
  },
];

/** Normalitza per a la cerca: sense accents, minúscules, sense espais. */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Divideix en grafemes: 👩‍⚕️ són tres punts de codi però un sol emoji. */
const graphemes = (s: string) => [...new Intl.Segmenter().segment(s)].map((x) => x.segment);

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
    for (const group of GROUPS) {
      for (const entry of group.items) {
        const name = norm(entry.slice(1).join(" "));
        if (name.includes(q) || norm(entry[0]) === q) hits.push({ entry, group });
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
              Cap emoji per «{query}». Prova «casa», «mar» o «bosque».
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

/** Grafemes ja seleccionats: el pare l'ha de poder recarregar. */
export const toGraphemes = graphemes;