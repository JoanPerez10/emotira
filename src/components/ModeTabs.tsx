import { MODES, MODE_TITLES, MODE_ICONS } from "../modes";
import type { Mode } from "../types";
import Icon from "./Icon";

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
          <span className="tabs-modes">
            <Icon name={MODE_ICONS[m]} size={21} />
            {MODE_TITLES[m]}
          </span>
        </button>
      ))}
    </div>
  );
}