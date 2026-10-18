import { MODES, MODE_TITLES, MODE_IMAGES } from "../modes";
import type { Mode } from "../types";

/**
 * Selector de mode (rànquing i grups). Són set pastilles i el que diu l'estat
 * és el contorn i el text, no una vora de baix: amb vores, en fila les
 * pastilles semblen lleixes flotant i es llegeix malament. Porten el dibuix
 * del mode —el mateix del menú i de la capçalera de la partida—, no una
 * icona de traç.
 */
export default function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="tabs tabs-modes" role="tablist">
      {MODES.map((m) => (
        <button key={m} role="tab" aria-selected={m === mode} onClick={() => onChange(m)}>
          <img className="tabs-mark" src={MODE_IMAGES[m]} alt="" width={1254} height={1254} draggable={false} />
          {MODE_TITLES[m]}
        </button>
      ))}
    </div>
  );
}
