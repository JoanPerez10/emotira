import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { MAP_COMARQUES, MAP_H, MAP_W, MUNICIPIS } from "../data/catalunyaMap";
import type { Collection } from "../utils/collection";

const MAX_ZOOM = 14;
const BY_ID = new Map(MUNICIPIS.map((m) => [m.id, m]));

// Finestra visible del mapa. L'alçada es dedueix de l'amplada (es manté la proporció).
interface View {
  x: number;
  y: number;
  w: number;
}

const FULL_VIEW: View = { x: 0, y: 0, w: MAP_W };
const heightOf = (w: number) => (w * MAP_H) / MAP_W;

const clampView = (v: View): View => {
  const w = Math.min(MAP_W, Math.max(MAP_W / MAX_ZOOM, v.w));
  return {
    w,
    x: Math.min(MAP_W - w, Math.max(0, v.x)),
    y: Math.min(MAP_H - heightOf(w), Math.max(0, v.y)),
  };
};

// Els 947 paths només es tornen a pintar si canvia el conjunt de municipis descoberts
// (el hover/selecció es dibuixa a part, en una capa superior).
const Municipis = memo(function Municipis({ unlocked }: { unlocked: Set<string> }) {
  const pending: React.ReactNode[] = [];
  const done: React.ReactNode[] = []; // dibuixats al final perquè el seu contorn quedi per sobre
  for (const m of MUNICIPIS) {
    if (!m.d) continue;
    const on = unlocked.has(m.id);
    (on ? done : pending).push(
      <path key={m.id} data-id={m.id} d={m.d} className={on ? "muni muni-on" : "muni"} />
    );
  }
  return (
    <>
      {pending}
      {done}
    </>
  );
});

interface Gesture {
  startX: number;
  startY: number;
  startView: View;
  moved: boolean;
  lastDist: number;
}

export default function CatalunyaMap({ collection }: { collection: Collection }) {
  const [view, setView] = useState<View>(FULL_VIEW);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);

  const zoomed = view.w < MAP_W - 1;

  // Zoom mantenint fix el punt (clientX, clientY)
  const zoomAt = useCallback((factor: number, clientX: number, clientY: number) => {
    setView((v) => {
      const w = Math.min(MAP_W, Math.max(MAP_W / MAX_ZOOM, v.w / factor));
      const r = svgRef.current!.getBoundingClientRect();
      const px = v.x + ((clientX - r.left) / r.width) * v.w;
      const py = v.y + ((clientY - r.top) / r.height) * heightOf(v.w);
      const s = w / v.w;
      return clampView({ w, x: px - (px - v.x) * s, y: py - (py - v.y) * s });
    });
  }, []);

  const zoomCenter = (factor: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    zoomAt(factor, r.left + r.width / 2, r.top + r.height / 2);
  };

  // Ctrl + roda per fer zoom (la roda sola continua desplaçant la pàgina).
  // Cal un listener no passiu per poder fer preventDefault.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const idUnder = (e: ReactPointerEvent<SVGSVGElement>) =>
    (e.target as SVGElement).dataset?.id ?? null;

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      gesture.current = {
        startX: e.clientX,
        startY: e.clientY,
        startView: view,
        moved: false,
        lastDist: 0,
      };
    } else if (gesture.current) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.moved = true; // dos dits: mai és un toc de selecció
      gesture.current.lastDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    const tracked = pointers.current.has(e.pointerId);

    if (!tracked) {
      // Ratolí sense cap botó premut: només hover
      if (e.pointerType === "mouse") {
        const id = idUnder(e);
        setHoverId((prev) => (prev === id ? prev : id));
      }
      return;
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!g) return;

    if (pointers.current.size === 2) {
      // Pessic: zoom (incremental) al voltant del punt mig entre els dos dits
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.lastDist > 0 && dist > 0) {
        zoomAt(dist / g.lastDist, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      g.lastDist = dist;
      return;
    }

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.moved && Math.hypot(dx, dy) > 5) {
      g.moved = true;
      if (zoomed) {
        svgRef.current?.setPointerCapture(e.pointerId);
        setDragging(true);
      }
    }
    if (g.moved && zoomed) {
      // Arrossegar: només té sentit amb zoom (sense zoom, el mapa ja és sencer)
      const r = svgRef.current!.getBoundingClientRect();
      const v = g.startView;
      setView(
        clampView({
          w: v.w,
          x: v.x - (dx / r.width) * v.w,
          y: v.y - (dy / r.height) * heightOf(v.w),
        })
      );
    }
  };

  const endPointer = (e: ReactPointerEvent<SVGSVGElement>, select: boolean) => {
    const g = gesture.current;
    const wasTap = select && g && !g.moved && pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    if (svgRef.current?.hasPointerCapture(e.pointerId))
      svgRef.current.releasePointerCapture(e.pointerId);
    if (pointers.current.size === 0) {
      gesture.current = null;
      setDragging(false);
    }
    if (wasTap) setSelectedId(idUnder(e));
  };

  // --- Informació del municipi enfocat (hover o seleccionat) ---
  const focus = BY_ID.get(hoverId ?? selectedId ?? "");
  const entries = focus ? collection.byMunicipi.get(focus.id) ?? [] : [];
  const discovered = entries.filter((e) => e.unlocked);
  const selected = selectedId ? BY_ID.get(selectedId) : undefined;
  const hovered = hoverId && hoverId !== selectedId ? BY_ID.get(hoverId) : undefined;

  const v = view;
  return (
    <div className="map-frame" style={{ ["--map-aspect" as string]: MAP_W / MAP_H }}>
      <div className="map-stage">
        <svg
          ref={svgRef}
          className={`map-svg${zoomed ? " zoomed" : ""}${dragging ? " dragging" : ""}`}
          viewBox={`${v.x} ${v.y} ${v.w} ${heightOf(v.w)}`}
          role="img"
          aria-label="Mapa de Catalunya per municipis, amb els pobles descoberts il·luminats"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endPointer(e, true)}
          onPointerCancel={(e) => endPointer(e, false)}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setHoverId(null);
          }}
        >
          <Municipis unlocked={collection.unlockedMunicipis} />
          {selected?.d && <path className="muni-focus muni-selected" d={selected.d} />}
          {hovered?.d && <path className="muni-focus" d={hovered.d} />}
        </svg>

        <div className="map-controls">
          <button
            type="button"
            aria-label="Apropar el mapa"
            title="Apropar (o Ctrl + roda del ratolí)"
            disabled={v.w <= MAP_W / MAX_ZOOM + 1}
            onClick={() => zoomCenter(1.8)}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Allunyar el mapa"
            title="Allunyar"
            disabled={!zoomed}
            onClick={() => zoomCenter(1 / 1.8)}
          >
            −
          </button>
          <button
            type="button"
            aria-label="Mostrar tot el mapa"
            title="Restablir la vista"
            disabled={!zoomed}
            onClick={() => setView(FULL_VIEW)}
          >
            ⤢
          </button>
        </div>
      </div>

      <div className="map-info" aria-live="polite">
        {focus ? (
          <>
            {discovered.length > 0 && (
              <span className="map-info-emoji">
                {discovered.map((d) => d.puzzle.emojis).join(" ")}
              </span>
            )}
            <div className="map-info-text">
              <strong>{focus.n}</strong>
              <span>{MAP_COMARQUES[focus.c - 1]}</span>
              {discovered.length > 0 && <em>{discovered[0].puzzle.explanation}</em>}
            </div>
            <span className={`badge ${discovered.length > 0 ? "badge-on" : ""}`}>
              {discovered.length > 0 ? "✅ Descobert" : "🔒 Per descobrir"}
            </span>
          </>
        ) : (
          <p className="map-hint">
            Passa el ratolí o toca un municipi per veure&apos;n la fitxa.
          </p>
        )}
      </div>
    </div>
  );
}
