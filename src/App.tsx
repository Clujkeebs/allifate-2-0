import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })))
const AuthPage = lazy(() => import('@/pages/AuthPage').then(m => ({ default: m.AuthPage })))
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const CreatePage = lazy(() => import('@/pages/CreatePage').then(m => ({ default: m.CreatePage })))
const ReviewPage = lazy(() => import('@/pages/ReviewPage').then(m => ({ default: m.ReviewPage })))
const SchedulePage = lazy(() => import('@/pages/SchedulePage').then(m => ({ default: m.SchedulePage })))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))
const LibraryPage = lazy(() => import('@/pages/LibraryPage').then(m => ({ default: m.LibraryPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const UpgradePage = lazy(() => import('@/pages/UpgradePage').then(m => ({ default: m.UpgradePage })))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })))
const TermsPage = lazy(() => import('@/pages/TermsPage').then(m => ({ default: m.TermsPage })))

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuth()
  if (!initialized || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#080B0F' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40,
            background: 'linear-gradient(135deg, #00E5A0, #00B4D8)',
            borderRadius: 10,
            margin: '0 auto 16px',
            animation: 'pulse-glow 1.5s ease-in-out infinite',
          }} />
          <div style={{ color: '#4A5E70', fontSize: 13, fontFamily: 'JetBrains Mono' }}>Loading…</div>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function AppInner() {
  const { user } = useAuth()

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Suspense fallback={<div/>}><LandingPage /></Suspense>} />
      <Route path="/auth" element={<Suspense fallback={<div/>}><AuthPage /></Suspense>} />
      <Route path="/auth/signup" element={<Suspense fallback={<div/>}><AuthPage mode="signup" /></Suspense>} />
      <Route path="/privacy" element={<Suspense fallback={<div/>}><PrivacyPage /></Suspense>} />
      <Route path="/terms" element={<Suspense fallback={<div/>}><TermsPage /></Suspense>} />

      {/* Onboarding */}
      <Route path="/onboarding" element={<RequireAuth><Suspense fallback={<div/>}><OnboardingPage /></Suspense></RequireAuth>} />

      {/* App (requires auth) */}
      <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route path="/dashboard" element={<Suspense fallback={<div/>}><DashboardPage /></Suspense>} />
        <Route path="/create" element={<Suspense fallback={<div/>}><CreatePage /></Suspense>} />
        <Route path="/review/:jobId" element={<Suspense fallback={<div/>}><ReviewPage /></Suspense>} />
        <Route path="/schedule" element={<Suspense fallback={<div/>}><SchedulePage /></Suspense>} />
        <Route path="/analytics" element={<Suspense fallback={<div/>}><AnalyticsPage /></Suspense>} />
        <Route path="/library" element={<Suspense fallback={<div/>}><LibraryPage /></Suspense>} />
        <Route path="/settings" element={<Suspense fallback={<div/>}><SettingsPage /></Suspense>} />
        <Route path="/upgrade" element={<Suspense fallback={<div/>}><UpgradePage /></Suspense>} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  // Initialize auth listener
  useAuth()

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#161C24',
              color: '#F0F4F8',
              border: '1px solid #1E2A36',
              borderRadius: 8,
              fontSize: 13,
            },
          }}
        />
        <AppInner />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
