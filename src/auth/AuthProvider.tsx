import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import type { StaffIdentity, StaffRole } from '../types/auth'
import { login } from '../services/authService'
import { clearAccessToken, getAccessToken, setAccessToken } from '../services/authToken'
import { AuthContext } from './authContext'

function identityFromToken(token: string | null): StaffIdentity | null {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null
    const id = String(payload.sub ?? '')
    const username = String(payload.unique_name ?? '')
    const role = String(payload.role ?? '') as StaffRole
    if (!id || !username || !['Agent', 'Dispatcher', 'Technician', 'Manager'].includes(role)) return null
    return { id, username, email: '', role }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffIdentity | null>(() => identityFromToken(getAccessToken()))

  const refresh = useCallback(() => {
    const next = identityFromToken(getAccessToken())
    setStaff(next)
    if (!next) clearAccessToken()
  }, [])

  useEffect(() => {
    window.addEventListener('assms-auth-changed', refresh)
    return () => window.removeEventListener('assms-auth-changed', refresh)
  }, [refresh])

  const signIn = useCallback(async (identifier: string, password: string) => {
    const response = await login(identifier, password)
    setAccessToken(response.accessToken)
    setStaff(response.staff)
  }, [])

  const signOut = useCallback(() => {
    clearAccessToken()
    setStaff(null)
  }, [])

  const value = useMemo(() => ({
    staff,
    isAuthenticated: staff !== null,
    signIn,
    signOut,
    hasRole: (...roles: StaffRole[]) => staff !== null && roles.includes(staff.role),
  }), [staff, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
