import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { login as loginApi, logout as logoutApi } from '../api'
import { decodeToken, isTokenExpired } from '../utils/jwt'

export interface User {
  id: string
  employee_id: string
  name: string
  role: string
  org_id: string
  staff_id: string | null
  status: string
  ward_id: string[]
}

interface AuthContextType {
  user: User | null
  login: (employee_id: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  isLoading: boolean
  isAuthenticated: boolean
  syncUserFromToken: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function userFromToken(token: string): User | null {
  const payload = decodeToken(token)
  if (!payload?.user_id || !payload?.role) return null
  return {
    id: payload.user_id as string,
    employee_id: (payload.employee_id as string) || '',
    name: (payload.name as string) || (payload.employee_id as string) || 'User',
    role: payload.role as string,
    org_id: (payload.org_id as string) || '',
    staff_id: (payload.staff_id as string) ?? null,
    status: 'ACTIVE',
    ward_id: Array.isArray(payload.ward_id) ? (payload.ward_id as string[]) : [],
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const syncUserFromToken = useCallback(() => {
    const token = localStorage.getItem('access_token')
    if (!token || isTokenExpired(token)) {
      setUser(null)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      return
    }
    setUser(userFromToken(token))
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token || isTokenExpired(token)) {
      setUser(null)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    } else {
      setUser(userFromToken(token))
    }
    setIsLoading(false)
  }, [])

  const login = async (employee_id: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await loginApi(employee_id, password)
      if (response.success && response.data?.access_token) {
        const token = response.data.access_token
        localStorage.setItem('access_token', token)
        localStorage.setItem('refresh_token', response.data.refresh_token || '')
        const derived = userFromToken(token)
        if (derived) {
          setUser(derived)
          setIsLoading(false)
          return true
        }
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      }
      setIsLoading(false)
      return false
    } catch {
      setIsLoading(false)
      return false
    }
  }

  const logout = async () => {
    try { await logoutApi() } catch { /* ignore */ }
    setUser(null)
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAuthenticated: !!user, syncUserFromToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
