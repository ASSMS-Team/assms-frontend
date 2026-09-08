import axios from 'axios'

import { attachAuth } from './authToken'
import type { CreateTechnicianRequest, TechnicianResponse } from '../types/technician'

export const dispatchApi = axios.create({
  baseURL: import.meta.env.VITE_DISPATCH_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

attachAuth(dispatchApi)

export async function createTechnician(request: CreateTechnicianRequest): Promise<TechnicianResponse> {
  const response = await dispatchApi.post<TechnicianResponse>('/api/technicians', request)
  return response.data
}
