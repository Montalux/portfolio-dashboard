import { HashRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth'
import Login from '@/pages/Login'
import Start from '@/pages/Start'

function Gate() {
  const { session, appUser, loading } = useAuth()

  if (loading) return null
  if (!session) return <Login />
  if (!appUser) {
    return <p className="p-4 text-sm">Kein Zugriff. Bitte bei Pascal Müller freischalten lassen.</p>
  }

  return (
    <Routes>
      <Route path="/" element={<Start />} />
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
