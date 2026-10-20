/**
 * Petjades de fons.
 *
 * Capa purament decorativa: un embolcallat de petjades de guineu que
 * balancegen una mica, com si algú passes pel bosc. Les petjades van en
 * **graella**, com un paper pintat: una casella per petjada, totes iguals,
 * perquè el fons sembli un fons i no una llista de capitals. Dins de la
 * casella, cada petjada té la seva pròpia animació, amb retard i durada
 * diferents, i gira **sobre ella mateixa** (l'eix és el seu propi peu, no el
 * de la graella): el vent les mou una per una, no en bloc.
 *
 * No es pot fer amb un `background-image` repetit: allò la petjada és una
 * sola imatge i el que es mou és el paper sencer, que lliscaria en bloc i
 * no balancejaria. Cal una petjada per element.
 *
 * La graella es calcula a partir de la finestra, i no amb un nombre fix de
 * petjades, perquè el paper quedi ple tant en un mòbil estret com en un
 * monitor ample. La llavor és fixa: en recarregar la pàgina, o en canviar la
 * mida de la finestra, les petjades tornen als mateixos llocs.
 */

import { useEffect, useMemo, useState } from "react";

/** Costat de la casella, en rem: una petjada amb aire al voltant. */
const CELLA = 9.5;
const MIDA_MAX = 7.2;

/** Generador senzill i determinista: mateixa llavor, mateix paper. */
const rnd = (llavor: number) => {
  let s = llavor;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
};

/** Quantes files i columnes caben a la finestra, amb un marge que fa que el
 *  paper surti per les vores en lloc de deixar un Fil de llum al costat. */
function caselles() {
  if (typeof window === "undefined") return { files: 1, columnes: 1 };
  const celada = CELLA * 16;
  return {
    files: Math.ceil(window.innerHeight / celada) + 1,
    columnes: Math.ceil(window.innerWidth / celada) + 1,
  };
}

export default function PawSwarm() {
  const [{ files, columnes }, setCaselles] = useState(caselles);

  // La finestra canvia de mida amb els giratoris i quan es divideix en
  // pantalles: el paper s'ha de recomptar, però amb un retard curt per no
  // recomptear durant un arrosseg de finestra.
  useEffect(() => {
    let id = 0;
    const recalcula = () => {
      clearTimeout(id);
      id = window.setTimeout(() => setCaselles(caselles()), 150);
    };
    window.addEventListener("resize", recalcula);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", recalcula);
    };
  }, []);

  const potades = useMemo(() => {
    const r = rnd(20241018);
    return Array.from({ length: files * columnes }, (_, i) => ({
      id: i,
      // Petita esbiaitada dins de la casella: prou perquè no sigui un
      // paper de quadrícula perfecte, prou poc perquè continuï ordenat.
      x: (r() - 0.5) * 0.9,
      y: (r() - 0.5) * 0.9,
      mida: MIDA_MAX * (0.78 + r() * 0.24),
      // Al voltant de zero, perquè el balancei sigui el de la petjada i no
      // el d'un retaule torçat.
      gir: (r() - 0.5) * 18,
      duracio: 5.5 + r() * 3.5,
      retard: -r() * 12,
      flip: r() > 0.5,
    }));
  }, [files, columnes]);

  return (
    <div
      className="paws"
      aria-hidden="true"
      style={{ gridTemplateColumns: `repeat(${columnes}, 1fr)`, gridTemplateRows: `repeat(${files}, 1fr)` }}
    >
      {potades.map((p) => (
        <span
          key={p.id}
          className="paw"
          style={
            {
              width: `${p.mida}rem`,
              ["--paw-x" as string]: `${p.x}rem`,
              ["--paw-y" as string]: `${p.y}rem`,
              ["--paw-gir" as string]: `${p.gir}deg`,
              ["--paw-dur" as string]: `${p.duracio}s`,
              ["--paw-retard" as string]: `${p.retard}s`,
              ["--paw-flip" as string]: p.flip ? "-1" : "1",
            } as React.CSSProperties
          }
        >
          <img src="/assets/petjada.svg" alt="" draggable={false} />
        </span>
      ))}
    </div>
  );
}
