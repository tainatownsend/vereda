import { useEffect, useLayoutEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, useUIStore } from '@/store'
import { PageLoader } from '@/components/ui'
import BottomNav from '@/components/ui/BottomNav'
import ProtectedRoute from '@/components/ProtectedRoute'
import LandingPage from '@/pages/LandingPage'
import AuthPage from '@/pages/AuthPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import HomePage from '@/pages/HomePage'
import BookDetailPage from '@/pages/BookDetailPage'
import ReaderPage from '@/pages/ReaderPage'
import LibraryPage from '@/pages/LibraryPage'
import SavedPassagesPage from '@/pages/SavedPassagesPage'
import PassagePage from '@/pages/PassagePage'
import DiscoverPage from '@/pages/DiscoverPage'
import GettingStartedPage from '@/pages/GettingStartedPage'
import ReflectionPage from '@/pages/ReflectionPage'
import FavoritesPage from '@/pages/FavoritesPage'
import CommunityPage from '@/pages/CommunityPage'
import EvolutionPage from '@/pages/EvolutionPage'
import SettingsPage from '@/pages/SettingsPage'
import NorthStarVisualQaPage from '@/pages/NorthStarVisualQaPage'
import { getAppFontSize, getThemeColor } from '@/features/ui/displayPreferences'

const visualQaEnabled = import.meta.env.VITE_NORTHSTAR_QA === 'true'

export default function App() {
  const { init, loading, user } = useAuthStore()
  const { darkMode, appFontScale } = useUIStore()

  useEffect(() => {
    if (!visualQaEnabled) init()
  }, [init])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    const themeMeta = document.querySelector('meta[name="theme-color"]')
    themeMeta?.setAttribute('content', getThemeColor(darkMode))
  }, [darkMode])

  useEffect(() => {
    document.documentElement.style.fontSize = getAppFontSize(appFontScale)
  }, [appFontScale])

  if (!visualQaEnabled && loading) return <PageLoader />

  return (
    <div className={darkMode ? 'dark' : ''}>
      <BrowserRouter>
        <ScrollToTop />

        <Routes>
          {visualQaEnabled && <Route path="/__northstar-qa" element={<NorthStarVisualQaPage />} />}

          <Route path="/" element={<LandingPage />} />
          <Route path="/entrar" element={user ? <Navigate to="/home" replace /> : <AuthPage />} />
          <Route path="/criar-conta" element={user ? <Navigate to="/home" replace /> : <AuthPage initialMode="signup" />} />
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />

          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/comecar" element={<ProtectedRoute><GettingStartedPage /></ProtectedRoute>} />
          <Route path="/descobrir" element={<ProtectedRoute><DiscoverPage /></ProtectedRoute>} />
          <Route path="/trecho/:sectionId" element={<ProtectedRoute><PassagePage /></ProtectedRoute>} />
          <Route path="/livro/:id" element={<ProtectedRoute><BookDetailPage /></ProtectedRoute>} />
          <Route path="/ler/:id" element={<ProtectedRoute><ReaderPage /></ProtectedRoute>} />
          <Route path="/biblioteca" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
          <Route path="/reflexoes" element={<ProtectedRoute><ReflectionPage /></ProtectedRoute>} />
          <Route path="/favoritos" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
          <Route path="/comunidade" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
          <Route path="/salvos" element={<ProtectedRoute><SavedPassagesPage /></ProtectedRoute>} />
          <Route path="/evolucao" element={<ProtectedRoute><EvolutionPage /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {!visualQaEnabled && <AppBottomNav user={user} />}
      </BrowserRouter>
    </div>
  )
}

function AppBottomNav({ user }) {
  const { pathname } = useLocation()
  const publicPaths = new Set(['/', '/entrar', '/criar-conta', '/redefinir-senha'])

  if (!user || publicPaths.has(pathname)) return null
  return <BottomNav />
}

function ScrollToTop() {
  const { pathname, search, hash } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, search, hash])

  return null
}
