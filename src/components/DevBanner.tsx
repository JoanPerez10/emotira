import { api } from "../api";
import { resetMockDb } from "../api/mockApi";

export default function DevBanner() {
  if (api.mode !== "mock") return null;
  return (
    <div className="dev-banner" role="status">
      🧪 <strong>Mode developer</strong>: dades simulades, no es toca la base de dades real.
      <button
        className="ghost"
        onClick={() => {
          if (confirm("Vols reiniciar les dades simulades?")) {
            resetMockDb();
            window.location.reload();
          }
        }}
      >
        Reiniciar dades
      </button>
    </div>
  );
}