import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { HypothesisDetailPage } from './pages/HypothesisDetailPage'
import { HypothesesPage } from './pages/HypothesesPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8 text-center text-thmp-muted">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/hypotheses"
        element={
          <Protected>
            <HypothesesPage />
          </Protected>
        }
      />
      <Route
        path="/hypotheses/:id"
        element={
          <Protected>
            <HypothesisDetailPage />
          </Protected>
        }
      />
      <Route path="/" element={<Navigate to="/hypotheses" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
