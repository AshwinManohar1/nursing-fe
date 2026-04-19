import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  allowedRoles?: string[]
}

const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) return null

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (allowedRoles && user && !allowedRoles.includes(user.role.toUpperCase())) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
