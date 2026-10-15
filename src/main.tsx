import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import DevBanner from "./components/DevBanner.tsx";
import flagFontUrl from "country-flag-emoji-polyfill/dist/TwemojiCountryFlags.woff2?url";

// Banderes: sempre, sense detector. El polyfill del paquet només
// injecta la font quan el navegador no sabria dibuixar *cap* emoji, però
// al Windows modern els indicadors regionals es dibuixen com lletres
// (🇬🇧 surt «GB», 🇨🇳 surt «CN»), de manera que el detector dóna per bo el
// navegador i no s'injecta res. El rang Unicode només cobreix els codis
// de bandera, de manera que aquesta font no toca cap altre emoji.
const flagFont = document.createElement("style");
flagFont.textContent = `@font-face {
  font-family: "Twemoji Country Flags";
  unicode-range: U+1F1E6-1F1FF, U+1F3F4, U+E0062-E0063, U+E0065, U+E0067,
    U+E006C, U+E006E, U+E0073-E0074, U+E0077, U+E007F;
  src: url('${flagFontUrl}') format('woff2');
  font-display: swap;
}`;
document.head.appendChild(flagFont);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DevBanner />
    <App />
  </StrictMode>,
)
