import axios from 'axios'

import { attachAuth } from './authToken'
import type { CreateTechnicianRequest, TechnicianResponse, UpdateTechnicianRequest } from '../types/technician'

export const dispatchApi = axios.create({
  baseURL: import.meta.env.VITE_DISPATCH_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

attachAuth(dispatchApi)

export async function createTechnician(request: CreateTechnicianRequest): Promise<TechnicianResponse> {
  const response = await dispatchApi.post<TechnicianResponse>('/api/technicians', request)
  return response.data
}

export async function getAllTechnicians(): Promise<TechnicianResponse[]> {
  const response = await dispatchApi.get<TechnicianResponse[]>('/api/technicians')
  return response.data
}

export async function getTechnicianById(id: string): Promise<TechnicianResponse> {
  const response = await dispatchApi.get<TechnicianResponse>(`/api/technicians/${encodeURIComponent(id)}`)
  return response.data
}

export async function updateTechnician(id: string, request: UpdateTechnicianRequest): Promise<TechnicianResponse> {
  const response = await dispatchApi.put<TechnicianResponse>(`/api/technicians/${encodeURIComponent(id)}`, request)
  return response.data
}
