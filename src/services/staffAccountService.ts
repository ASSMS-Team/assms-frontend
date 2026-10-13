import axios from 'axios'
import { CUSTOMER_API_BASE_URL } from './apiConfig'
import { attachAuth } from './authToken'

export const staffApi = axios.create({ baseURL: CUSTOMER_API_BASE_URL })
attachAuth(staffApi)

export interface StaffAccountResponse {
  id: string
  fullName: string
  username: string
  email: string
  role: string
  status: string
  technicianId: string | null
  createdAt: string
  createdBy: string | null
  dispatchSyncStatus?: string | null
}

export interface CreateStaffAccountRequest {
  fullName: string
  username: string
  email: string
  role: string
  password: string
  technicianId?: string | null
}

export async function getStaffAccounts(status?: string): Promise<StaffAccountResponse[]> {
  const url = status ? `/api/staff-accounts?status=${encodeURIComponent(status)}` : '/api/staff-accounts'
  const response = await staffApi.get<StaffAccountResponse[]>(url)
  return Array.isArray(response.data) ? response.data : []
}

export async function getStaffAccountById(id: string): Promise<StaffAccountResponse> {
  const response = await staffApi.get<StaffAccountResponse>(`/api/staff-accounts/${encodeURIComponent(id)}`)
  return response.data
}

export async function createStaffAccount(request: CreateStaffAccountRequest): Promise<StaffAccountResponse> {
  const response = await staffApi.post<StaffAccountResponse>('/api/staff-accounts', request)
  return response.data
}

export async function deactivateStaffAccount(id: string): Promise<StaffAccountResponse> {
  const response = await staffApi.post<StaffAccountResponse>(`/api/staff-accounts/${encodeURIComponent(id)}/deactivate`)
  return response.data
}

export function staffAccountError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.detail)
      return error.response.data.detail
    if (error.response?.data?.title)
      return error.response.data.title
    if (error.response?.status === 409)
      return 'The operation was rejected due to a conflict (e.g. duplicate username or email, technician has open assignments, or last active Manager cannot be deactivated).'
    if (error.response?.status === 400)
      return 'Check the request details and try again.'
    if (error.response?.status === 403)
      return 'Only Managers are authorized to perform this operation.'
    if (error.response?.status === 503)
      return 'Could not reach dependent services. Try again later.'
    if (error.code === 'ERR_NETWORK' || !error.response)
      return 'Could not connect to the service. Please check your network connection and try again.'
  }
  if (error instanceof Error)
    return error.message
  return 'Operation failed. Please try again.'
}
