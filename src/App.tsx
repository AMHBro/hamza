import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { useApp } from './context/AppState'
import { Gate } from './pages/Gate'
import { OfficePage } from './pages/OfficePage'
import { OfficesPage } from './pages/OfficesPage'

function Boot() {
  return (
    <div className="grid min-h-screen place-items-center text-muted">
      نحمّل الديوان...
    </div>
  )
}

export default function App() {
  const { ready, session } = useApp()
  if (!ready) return <Boot />

  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/offices" replace /> : <Gate />} />
      <Route
        path="/offices"
        element={
          session ? (
            <Shell>
              <OfficesPage />
            </Shell>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/offices/:officeId"
        element={
          session ? (
            <Shell>
              <OfficePage />
            </Shell>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to={session ? '/offices' : '/'} replace />} />
    </Routes>
  )
}
