export type StaffRole = 'Agent' | 'Dispatcher' | 'Technician' | 'Manager'

export interface StaffIdentity {
  id: string
  username: string
  email: string
  role: StaffRole
  technicianId?: string | null
}

export interface LoginResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresAt: string
  staff: StaffIdentity
}
