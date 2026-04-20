import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { EvidenceHubPage } from './pages/EvidenceHubPage'
import { FindingsPage } from './pages/FindingsPage'
import { HypothesisDetailPage } from './pages/HypothesisDetailPage'
import { HypothesesPage } from './pages/HypothesesPage'
import { IngestionQueuePage } from './pages/IngestionQueuePage'
import { IntegrationsPage } from './pages/IntegrationsPage'
import { HuntsPage } from './pages/HuntsPage'
import { LoginPage } from './pages/LoginPage'
import { OverviewPage } from './pages/OverviewPage'
import { RegisterPage } from './pages/RegisterPage'
import { ReportingPage } from './pages/ReportingPage'

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <OverviewPage />
          </Protected>
        }
      />
      <Route
        path="/hypotheses"
        element={
          <Protected>
            <HypothesesPage />
          </Protected>
        }
      />
      <Route
        path="/ingestion"
        element={
          <Protected>
            <IngestionQueuePage />
          </Protected>
        }
      />
      <Route
        path="/integrations"
        element={
          <Protected>
            <IntegrationsPage />
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
      <Route
        path="/hunts"
        element={
          <Protected>
            <HuntsPage />
          </Protected>
        }
      />
      <Route
        path="/evidence"
        element={
          <Protected>
            <EvidenceHubPage />
          </Protected>
        }
      />
      <Route
        path="/findings"
        element={
          <Protected>
            <FindingsPage />
          </Protected>
        }
      />
      <Route
        path="/reporting"
        element={
          <Protected>
            <ReportingPage />
          </Protected>
        }
      />
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
