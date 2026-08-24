import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore, useUIStore } from '@/store'
import { PageLoader } from '@/components/ui'
import BottomNav from '@/components/ui/BottomNav'
import ProtectedRoute from '@/components/ProtectedRoute'
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
import EvolutionPage from '@/pages/EvolutionPage'
import SettingsPage from '@/pages/SettingsPage'
import { getAppFontSize, getThemeColor } from '@/features/ui/displayPreferences'

export default function App() {
  const { init, loading, user } = useAuthStore()
  const { darkMode, appFontScale } = useUIStore()

  useEffect(() => { init() }, [init])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    const themeMeta = document.querySelector('meta[name="theme-color"]')
    themeMeta?.setAttribute('content', getThemeColor(darkMode))
  }, [darkMode])

  useEffect(() => {
    document.documentElement.style.fontSize = getAppFontSize(appFontScale)
  }, [appFontScale])

  if (loading) return <PageLoader />

  return (
    <div className={darkMode ? 'dark' : ''}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to="/home" replace /> : <AuthPage />}
          />

          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />

          <Route path="/home" element={
            <ProtectedRoute><HomePage /></ProtectedRoute>
          } />

          <Route path="/comecar" element={
            <ProtectedRoute><GettingStartedPage /></ProtectedRoute>
          } />

          <Route path="/descobrir" element={
            <ProtectedRoute><DiscoverPage /></ProtectedRoute>
          } />

          <Route path="/trecho/:sectionId" element={
            <ProtectedRoute><PassagePage /></ProtectedRoute>
          } />

          <Route path="/livro/:id" element={
            <ProtectedRoute><BookDetailPage /></ProtectedRoute>
          } />

          <Route path="/ler/:id" element={
            <ProtectedRoute><ReaderPage /></ProtectedRoute>
          } />

          <Route path="/biblioteca" element={
            <ProtectedRoute><LibraryPage /></ProtectedRoute>
          } />

          <Route path="/salvos" element={
            <ProtectedRoute><SavedPassagesPage /></ProtectedRoute>
          } />

          <Route path="/evolucao" element={
            <ProtectedRoute><EvolutionPage /></ProtectedRoute>
          } />

          <Route path="/configuracoes" element={
            <ProtectedRoute><SettingsPage /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {user && <BottomNav />}
      </BrowserRouter>
    </div>
  )
}
