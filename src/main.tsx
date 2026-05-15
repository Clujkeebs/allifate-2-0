import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import { initMonitoring } from '@/lib/monitoring'

initMonitoring()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p style={{ padding: 32 }}>Something went wrong. Please refresh.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
