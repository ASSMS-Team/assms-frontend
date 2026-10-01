import axios from 'axios'
import { CUSTOMER_API_BASE_URL } from './apiConfig'
import { attachAuth } from './authToken'

const api = axios.create({ baseURL: CUSTOMER_API_BASE_URL })
attachAuth(api)

export interface TechnicianAccount {
  id: string
  username: string
  email: string
  technicianId: string
}
export interface CreateTechnicianLogin {
  username: string
  email: string
  password: string
}
export async function getTechnicianAccount(id: string): Promise<TechnicianAccount | null> {
  try { return (await api.get<TechnicianAccount>(`/api/auth/technician-accounts/${encodeURIComponent(id)}`)).data }
  catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null
    throw error
  }
}
export async function createTechnicianAccount(id: string, request: CreateTechnicianLogin): Promise<TechnicianAccount> {
  return (await api.post<TechnicianAccount>(`/api/auth/technician-accounts/${encodeURIComponent(id)}`, request)).data
}
export async function linkTechnicianAccount(id: string, identifier: string): Promise<TechnicianAccount> {
  return (await api.put<TechnicianAccount>(`/api/auth/technician-accounts/${encodeURIComponent(id)}/link`, { identifier })).data
}
export function loginSetupError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 409)
    return 'Username, email or technician is already linked, or the existing login is not an active Technician account. Check the account details.'
  if (axios.isAxiosError(error) && error.response?.status === 400)
    return 'Check the username, email and password requirements.'
  return 'Login setup could not be completed. The technician record is retained. Try again or set up login from technician details.'
}
