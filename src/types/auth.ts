export type StaffRole = 'Agent' | 'Dispatcher' | 'Technician' | 'Manager'

export interface StaffIdentity {
  id: string
  username: string
  email: string
  role: StaffRole
}

export interface LoginResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresAt: string
  staff: StaffIdentity
}
