/**
 * Icones de la guineu: dibuixos en imatge en comptes d'emojis.
 *
 * Els emojis són del sistema operatiu i es veuen diferent a cada aparell (i a
 * alguns no n'hi ha de tots els colors). Aquests dibuixos són la marca del joc:
 * han de ser els mateixos a tots els llocs i a totes les mides. Mateixa
 * interfície que `Icon` (SVG de traç) perquè les dues famílies es puguin
 * intercanviar sense tocar el codi que les crida.
 *
 * `size` és l'alçada en píxels. L'amplada no s'imposa mai: la mana la
 * proporció del dibuix, que és el que evita que una urna es vegi estreta i un
 * cor ample. `label` només cal quan el dibuix és l'únic que explica alguna cosa
 * (una vida perduda, un poble bloquejat): al costat d'un text és decoratiu i
 * queda fora de la lectura.
 */
export type GuineuName =
  | "check"
  | "lock"
  | "lifeUp"
  | "lifeDown"
  | "profile"
  | "group"
  | "idea"
  | "vote"
  | "ranking";

const SRC: Record<GuineuName, string> = {
  check: "/assets/check-guineu.png",
  lock: "/assets/candau-guineu.png",
  lifeUp: "/assets/cor-vermell-guineu.png",
  lifeDown: "/assets/cor-gris-guineu.png",
  profile: "/assets/perfil-guineu.png",
  group: "/assets/grup-guineu.png",
  idea: "/assets/idea-guineu.png",
  vote: "/assets/vot-guineu.png",
  ranking: "/assets/ranquing-guineu.png",
};

interface Props {
  name: GuineuName;
  /** Alçada en píxels. */
  size?: number;
  className?: string;
  /** Text que substitueix el dibuix en la lectura. Per defecte: decoratiu. */
  label?: string;
}

export default function GuineuIcon({ name, size = 20, className, label }: Props) {
  return (
    <img
      className={className ? `guineu ${className}` : "guineu"}
      src={SRC[name]}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      height={size}
      draggable={false}
      decoding="async"
    />
  );
}