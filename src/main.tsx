import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import DevBanner from "./components/DevBanner.tsx";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DevBanner />
    <App />
  </StrictMode>,
)
