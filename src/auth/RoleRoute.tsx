import { Navigate, Outlet } from 'react-router-dom'

import type { StaffRole } from '../types/auth'
import { useAuth } from './useAuth'

export default function RoleRoute({ roles }: { roles: StaffRole[] }) {
  const { hasRole } = useAuth()
  return hasRole(...roles) ? <Outlet /> : <Navigate to="/forbidden" replace />
}
