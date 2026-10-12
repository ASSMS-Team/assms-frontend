import axios from 'axios'
import { CUSTOMER_API_BASE_URL } from './apiConfig'
import { attachAuth } from './authToken'

const api = axios.create({ baseURL: CUSTOMER_API_BASE_URL })
attachAuth(api)

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
  try {
    const url = status ? `/api/staff-accounts?status=${encodeURIComponent(status)}` : '/api/staff-accounts'
    const response = await api.get<StaffAccountResponse[]>(url)
    if (Array.isArray(response.data)) {
      return response.data
    }
  } catch {
    // fallback in dev
  }

  if (import.meta.env.DEV) {
    const mockAccounts: StaffAccountResponse[] = [
      {
        id: 'acc-001',
        fullName: 'Kasun Bandara',
        username: 'kasun.manager',
        email: 'kasun.mgr@assms.lk',
        role: 'Manager',
        status: 'ACTIVE',
        technicianId: null,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        createdBy: null,
      },
      {
        id: 'acc-002',
        fullName: 'Saman Kumara',
        username: 'saman.dispatcher',
        email: 'saman@assms.lk',
        role: 'Dispatcher',
        status: 'ACTIVE',
        technicianId: null,
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        createdBy: 'acc-001',
      },
      {
        id: 'acc-003',
        fullName: 'Nimal Perera',
        username: 'nimal.agent',
        email: 'nimal@assms.lk',
        role: 'Agent',
        status: 'ACTIVE',
        technicianId: null,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        createdBy: 'acc-001',
      },
      {
        id: 'acc-004',
        fullName: 'Amal Silva',
        username: 'amal.tech',
        email: 'amal.tech@assms.lk',
        role: 'Technician',
        status: 'ACTIVE',
        technicianId: '783a9fae-a2da-4acb-906a-74cbfa5fbc6e',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        createdBy: 'acc-001',
      },
      {
        id: 'acc-005',
        fullName: 'Kamal Jayawardena',
        username: 'kamal.former',
        email: 'kamal@assms.lk',
        role: 'Agent',
        status: 'INACTIVE',
        technicianId: null,
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        createdBy: 'acc-001',
      },
    ]

    return status
      ? mockAccounts.filter((a) => a.status.toUpperCase() === status.toUpperCase())
      : mockAccounts
  }
  return []
}

export async function getStaffAccountById(id: string): Promise<StaffAccountResponse> {
  const response = await api.get<StaffAccountResponse>(`/api/staff-accounts/${encodeURIComponent(id)}`)
  return response.data
}

export async function createStaffAccount(request: CreateStaffAccountRequest): Promise<StaffAccountResponse> {
  try {
    const response = await api.post<StaffAccountResponse>('/api/staff-accounts', request)
    if (response.data && typeof response.data === 'object' && 'id' in response.data) {
      return response.data
    }
  } catch (error) {
    if (!import.meta.env.DEV) throw error
  }

  if (import.meta.env.DEV) {
    return {
      id: `acc-${Date.now()}`,
      fullName: request.fullName,
      username: request.username,
      email: request.email,
      role: request.role,
      status: 'ACTIVE',
      technicianId: request.technicianId ?? null,
      createdAt: new Date().toISOString(),
      createdBy: 'acc-001',
    }
  }
  throw new Error('Staff account creation failed.')
}

export async function deactivateStaffAccount(id: string): Promise<StaffAccountResponse> {
  try {
    const response = await api.post<StaffAccountResponse>(`/api/staff-accounts/${encodeURIComponent(id)}/deactivate`)
    if (response.data && typeof response.data === 'object' && 'id' in response.data) {
      return response.data
    }
  } catch (error) {
    if (!import.meta.env.DEV) throw error
  }

  if (import.meta.env.DEV) {
    return {
      id,
      fullName: 'Deactivated Staff',
      username: 'deactivated.user',
      email: 'deactivated@assms.lk',
      role: 'Agent',
      status: 'INACTIVE',
      technicianId: null,
      createdAt: new Date().toISOString(),
      createdBy: 'acc-001',
    }
  }
  throw new Error('Staff account deactivation failed.')
}

export function staffAccountError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data?.detail)
    return error.response.data.detail
  if (axios.isAxiosError(error) && error.response?.status === 409)
    return 'The operation was rejected due to a conflict (e.g. last active Manager cannot be deactivated, or duplicate identifier).'
  if (axios.isAxiosError(error) && error.response?.status === 400)
    return 'Check the request details and try again.'
  if (axios.isAxiosError(error) && error.response?.status === 403)
    return 'Only Managers are authorized to perform this operation.'
  if (axios.isAxiosError(error) && error.response?.status === 503)
    return 'Could not reach dependent services. Try again later.'
  if (error instanceof Error)
    return error.message
  return 'Operation failed. Please try again.'
}
