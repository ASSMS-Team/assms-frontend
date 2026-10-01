import type { CreateTechnicianLogin } from '../../services/technicianAccounts'

export interface LoginDraft extends CreateTechnicianLogin { confirmation: string }
export const EMPTY_LOGIN: LoginDraft = { username: '', email: '', password: '', confirmation: '' }
export function validateLogin(draft: LoginDraft): string | null {
  if (!/^[A-Za-z0-9._-]{3,100}$/.test(draft.username.trim())) return 'Username must be 3–100 letters, numbers, dots, underscores or hyphens.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) return 'Enter a valid login email.'
  if (draft.password.length < 12 || draft.password.length > 128) return 'Password must be between 12 and 128 characters.'
  if (draft.password !== draft.confirmation) return 'Passwords do not match.'
  return null
}
