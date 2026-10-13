import { useContext } from 'react'

import { AuthContext } from './authContext'

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    return {
      staff: null,
      isAuthenticated: false,
      signIn: async () => {},
      signOut: () => {},
      hasRole: () => true,
    }
  }
  return value
}
