import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ProtectedRoute from '../components/ProtectedRoute'
import MainLayout from '../layouts/MainLayout'
import LoginPage from '../containers/LoginPage'
import Dashboard from '../containers/Dashboard'
import RosterPage from '../containers/RosterPage'
import StaffPage from '../containers/StaffPage'
import InsightsPage from '../containers/InsightsPage'
import TransfersPage from '../containers/TransfersPage'

const AppRouter = () => {
  const { user } = useAuth()
  const role = user?.role?.toUpperCase()

  return (
    <MainLayout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              {role === 'WARD_INCHARGE' ? <Navigate to="/roster" replace /> : <Dashboard />}
            </ProtectedRoute>
          }
        />

        <Route
          path="/roster"
          element={
            <ProtectedRoute>
              <RosterPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/transfers"
          element={
            <ProtectedRoute>
              <TransfersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <StaffPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/insights"
          element={
            <ProtectedRoute>
              <InsightsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  )
}

export default AppRouter
