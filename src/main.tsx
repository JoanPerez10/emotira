import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import DevBanner from "./components/DevBanner.tsx";
import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";
import flagFontUrl from "country-flag-emoji-polyfill/dist/TwemojiCountryFlags.woff2?url";

// Windows no porta banderes als emojis (🇬🇧 surt com «GB»). Només carrega la
// font si el navegador no les sap pintar; la serveix Vite, sense CDN.
polyfillCountryFlagEmojis("Twemoji Country Flags", flagFontUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DevBanner />
    <App />
  </StrictMode>,
)
