import { useMemo, useState } from "react";
import CatalunyaMap from "./CatalunyaMap";
import { MAP_COMARQUES, MUNICIPIS } from "../data/catalunyaMap";
import type { Puzzle } from "../data/puzzles";
import { buildCollection } from "../utils/collection";
import { normalize } from "../utils/normalize";

type StatusFilter = "all" | "unlocked" | "pending";
type SortBy = "name" | "status";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "Tots",
  unlocked: "Descoberts",
  pending: "Pendents",
};

interface Props {
  pool: Puzzle[];
  /** Respostes (`puzzle.answer`) dels pobles ja encertats */
  unlocked: string[];
  onExit: () => void;
}

export default function Collection({ pool, unlocked, onExit }: Props) {
  const collection = useMemo(
    () => buildCollection(pool, unlocked, MUNICIPIS, MAP_COMARQUES),
    [pool, unlocked]
  );
  const { entries } = collection;

  const [showList, setShowList] = useState(true);
  const [query, setQuery] = useState("");
  const [comarca, setComarca] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("name");

  const total = MUNICIPIS.length;
  const found = entries.filter((e) => e.unlocked).length;
  const pct = total ? (found / total) * 100 : 0;
  const pctText = pct.toLocaleString("ca", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const counts: Record<StatusFilter, number> = {
    all: entries.length,
    unlocked: found,
    pending: entries.length - found,
  };

  // Només s'ofereixen les comarques que tenen algun poble al joc
  const comarcaOptions = useMemo(() => {
    const n = new Map<string, number>();
    for (const e of entries) if (e.comarca) n.set(e.comarca, (n.get(e.comarca) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => a[0].localeCompare(b[0], "ca"));
  }, [entries]);

  const q = normalize(query);
  const visible = useMemo(() => {
    const list = entries.filter((e) => {
      if (status === "unlocked" && !e.unlocked) return false;
      if (status === "pending" && e.unlocked) return false;
      if (comarca && e.comarca !== comarca) return false;
      if (q) {
        // El nom d'un poble per descobrir no es pot cercar: seria una manera de fer trampa
        const byName =
          e.unlocked &&
          [e.puzzle.answer, ...(e.puzzle.aliases ?? [])].some((n) => normalize(n).includes(q));
        const byComarca = normalize(e.comarca).includes(q);
        if (!byName && !byComarca) return false;
      }
      return true;
    });
    const byName = (a: (typeof list)[number], b: (typeof list)[number]) =>
      normalize(a.puzzle.answer).localeCompare(normalize(b.puzzle.answer), "ca");
    return list.sort((a, b) =>
      sortBy === "status" && a.unlocked !== b.unlocked ? (a.unlocked ? -1 : 1) : byName(a, b)
    );
  }, [entries, status, comarca, q, sortBy]);

  const filtered = status !== "all" || comarca !== "" || q !== "";
  const clearFilters = () => {
    setQuery("");
    setComarca("");
    setStatus("all");
  };

  return (
    <main className="app collection">
      <div className="topbar">
        <button className="back" onClick={onExit}>← Menú</button>
        <strong>🗺️ Col·lecció</strong>
      </div>

      <section className="coll-progress" aria-label="Progrés de la col·lecció">
        <p className="coll-progress-main">
          <b>{found}</b> / {total} {found === 1 ? "municipi descobert" : "municipis descoberts"}{" "}
          <span className="coll-pct">({pctText}%)</span>
        </p>
        <div
          className="coll-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={found}
          aria-label="Municipis descoberts"
        >
          <span style={{ width: `${Math.max(pct, found > 0 ? 1 : 0)}%` }} />
        </div>
        <p className="help">
          Ara mateix el joc té {entries.length} trencaclosques; se&apos;n sumaran més amb les
          propostes de la comunitat.
        </p>
      </section>

      <div className="map-legend" aria-hidden="true">
        <span><i className="dot dot-on" /> Descobert</span>
        <span><i className="dot" /> Pendent</span>
      </div>

      <CatalunyaMap collection={collection} />

      <section className="coll-list" aria-label="Llista de pobles">
        <div className="coll-list-head">
          <h2>Pobles ({counts.all})</h2>
          <button
            type="button"
            className="list-toggle"
            aria-expanded={showList}
            aria-controls="coll-list-body"
            onClick={() => setShowList((s) => !s)}
          >
            {showList ? "👁️ Amagar llista" : "👁️ Mostrar llista"}
          </button>
        </div>

        {showList && (
          <div id="coll-list-body">
            <div className="coll-filters">
              <div className="field">
                <label htmlFor="c-search">Cerca</label>
                <input
                  id="c-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nom, àlies o comarca…"
                  autoComplete="off"
                />
                <p className="help">Els pobles per descobrir només es poden cercar per comarca.</p>
              </div>

              <div className="coll-filters-row">
                <div className="field">
                  <label htmlFor="c-comarca">Comarca</label>
                  <select id="c-comarca" value={comarca} onChange={(e) => setComarca(e.target.value)}>
                    <option value="">Totes les comarques</option>
                    {comarcaOptions.map(([name, n]) => (
                      <option key={name} value={name}>{name} ({n})</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="c-sort">Ordena per</label>
                  <select id="c-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                    <option value="name">Nom (A-Z)</option>
                    <option value="status">Estat (descoberts primer)</option>
                  </select>
                </div>
              </div>

              <div className="seg" role="group" aria-label="Filtra per estat">
                {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={status === s ? "active" : ""}
                    aria-pressed={status === s}
                    onClick={() => setStatus(s)}
                  >
                    {STATUS_LABELS[s]} <span>{counts[s]}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="coll-count" aria-live="polite">
              {visible.length} {visible.length === 1 ? "resultat" : "resultats"}
              {filtered && (
                <button type="button" className="ghost" onClick={clearFilters}>
                  Neteja els filtres
                </button>
              )}
            </p>

            {visible.length === 0 ? (
              <p className="help">Cap poble coincideix amb els filtres.</p>
            ) : (
              <ul className="town-grid">
                {visible.map((e, i) => (
                  <li
                    key={`${e.puzzle.answer}|${e.puzzle.emojis}|${i}`}
                    className={`town-card ${e.unlocked ? "town-on" : "town-off"}`}
                  >
                    {e.unlocked &&
                      <span className="town-emoji">{e.puzzle.emojis}</span>
                    }
                    <div className="town-body">
                      <strong>{e.unlocked ? e.puzzle.answer : "Poble per descobrir"}</strong>
                      <span>{e.comarca || "Comarca per determinar"}</span>
                      {e.unlocked && <em>{e.puzzle.explanation}</em>}
                    </div>
                    <span
                      className="town-status"
                      role="img"
                      aria-label={e.unlocked ? "Descobert" : "Bloquejat"}
                    >
                      {e.unlocked ? "✅" : "🔒"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <p className="help coll-credit">
        Mapa municipal: ICGC · sirisacademic/catalonia-cartography (cat-topojson).
      </p>
    </main>
  );
}
