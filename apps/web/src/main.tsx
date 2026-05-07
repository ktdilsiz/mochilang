import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configureApiBaseUrl } from '@mochilang/shared'
import './index.css'
import App from './App.tsx'

// API base URL is wired here once at startup so the shared client can
// be platform-agnostic (RN reads its base URL from Expo Constants).
configureApiBaseUrl(
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    'http://localhost:8181'
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
