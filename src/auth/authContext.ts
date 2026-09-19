import { createContext } from 'react'

import type { StaffIdentity, StaffRole } from '../types/auth'

export interface AuthState {
  staff: StaffIdentity | null
  isAuthenticated: boolean
  signIn: (identifier: string, password: string) => Promise<void>
  signOut: () => void
  hasRole: (...roles: StaffRole[]) => boolean
}

export const AuthContext = createContext<AuthState | null>(null)
