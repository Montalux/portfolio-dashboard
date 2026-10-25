import { useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth'
import Login from '@/pages/Login'
import Start from '@/pages/Start'
import InitiativePage from '@/pages/InitiativePage'
import NewInitiative from '@/pages/NewInitiative'

function Gate() {
  const { session, appUser, loading } = useAuth()
  const { pathname } = useLocation()

  // Start each page at the top
  useEffect(() => window.scrollTo(0, 0), [pathname])

  if (loading) return null
  if (!session) return <Login />
  if (!appUser) {
    return <p className="p-4 text-sm">Kein Zugriff. Bitte bei Pascal Müller freischalten lassen.</p>
  }

  return (
    <Routes>
      <Route path="/" element={<Start />} />
      <Route path="/initiative/:key" element={<InitiativePage />} />
      <Route path="/neu" element={<NewInitiative />} />
    </Routes>
  )
}

// HashRouter: GitHub Pages has no SPA fallback
export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </HashRouter>
  )
}
