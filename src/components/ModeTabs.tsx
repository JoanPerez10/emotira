import { MODES, MODE_TITLES } from "../modes";
import type { Mode } from "../types";

export default function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="tabs" role="tablist">
      {MODES.map((m) => (
        <button
          key={m}
          role="tab"
          aria-selected={m === mode}
          className={m === mode ? "" : "ghost"}
          onClick={() => onChange(m)}
        >
          {MODE_TITLES[m]}
        </button>
      ))}
    </div>
  );
}