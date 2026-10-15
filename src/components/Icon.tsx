/**
 * Icones SVG de traç (estil "outline"): un sol color, heretat del text del
 * botó, així que s'adapten a cada targeta sense duplicarPaths.
 * Els emojis es veuen diferents a cada sistema i atapeen el menú; aquestes
 * línies es veuen iguals a tot arreu.
 */
export type IconName =
  | "timer"
  | "calendar"
  | "target"
  | "reverse"
  | "flame"
  | "infinity"
  | "map"
  | "trophy"
  | "lightbulb"
  | "share"
  | "check"
  | "plus"
  | "music"
  | "grid"
  | "chevron"
  | "play"
  | "user"
  | "users"
  | "crown"
  | "chart"
  | "pencil"
  | "ballot"
  | "compass";

interface Props {
  name: IconName;
  size?: number;
  className?: string;
}

const PATHS: Record<IconName, React.ReactNode> = {
  reverse: <><path d="M4 7h16l-4-4M20 17H4l4 4" /><path d="M20 7v4M4 17v-4" /></>,
  timer: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6M12 2v3M18 6l2-2" /></>,
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16.5" rx="3.5" />
      <path d="M3 9.75h18M8 2.75v3.5M16 2.75v3.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  flame: (
    <>
      <path d="M12 2.5c4 3 6 5.8 6 9.2a6 6 0 0 1-12 0c0-2.4 1.2-4.4 1.2-4.4s.9 2.1 2.4 2.1C11.2 9.4 12 6 12 2.5Z" />
    </>
  ),
  infinity: (
    <>
      <path d="M12 12s-2.6-4.2-5.6-4.2a4.1 4.1 0 0 0 0 8.2C9.4 16 12 12 12 12Z" />
      <path d="M12 12s2.6-4.2 5.6-4.2a4.1 4.1 0 0 1 0 8.2C14.6 16 12 12 12 12Z" />
    </>
  ),
  map: (
    <>
      <path d="M9 3.2 4 5.4v15.4l5-2.2 6 2.2 5-2.2V3.2l-5 2.2-6-2.2Z" />
      <path d="M9 3.2v15.4M15 5.4v15.4" />
    </>
  ),
  trophy: (
    <>
      <path d="M7.5 3.5h9v6a4.5 4.5 0 0 1-9 0v-6Z" />
      <path d="M7.5 5.5h-3a2.5 2.5 0 0 0 0 5h1M16.5 5.5h3a2.5 2.5 0 0 1 0 5h-1" />
      <path d="M12 14v3.75M8.75 20.5h6.5" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M9.2 17.2a6 6 0 1 1 5.6 0v1.6H9.2v-1.6Z" />
      <path d="M9.5 20.5h5" />
    </>
  ),
  share: (
    <>
      <path d="M12 3.5v12M8 7.2 12 3.2l4 4" />
      <path d="M5 13v6.5h14V13" />
    </>
  ),
  check: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2.2" />
    </>
  ),
  chevron: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  play: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M10.2 8.4 15.6 12l-5.4 3.6Z" fill="currentColor" stroke="none" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.8 20c0-3.9 3.2-6.3 7.2-6.3s7.2 2.4 7.2 6.3" />
    </>
  ),
  users: (
    <>
      <circle cx="9.5" cy="8" r="3.3" />
      <path d="M3.5 19.6c0-3.2 2.7-5.3 6-5.3s6 2.1 6 5.3" />
      <path d="M16.8 5.3a3.3 3.3 0 0 1 0 5.5M18 14.4c1.8.8 2.7 2.2 2.7 4.2" />
    </>
  ),
  crown: (
    <>
      <path d="M3.8 16.2 3 6.8l5.2 3.6L12 4.2l3.8 6.2 5.2-3.6-.8 9.4H3.8Z" />
      <path d="M5.5 19.5h13" />
    </>
  ),
  chart: <path d="M3.5 20.5h17M6.8 20V11.5M12 20V4.8M17.2 20v-5.6" />,
  pencil: (
    <>
      <path d="M4.5 19.5l.9-3.8L16 5.1a2.12 2.12 0 0 1 3 3L8.4 18.7l-3.9.8Z" />
      <path d="M14.2 6.9l3 3" />
    </>
  ),
  ballot: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
      <path d="M7.5 9.4l1.7 1.7 3.3-3.3M7.5 15.6h9M7.5 18h5.5" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <path d="m15.4 8.6-2 4.8-4.8 2 2-4.8Z" />
    </>
  ),
};

export default function Icon({ name, size = 22, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
