import axios from 'axios'

import type { LoginResponse } from '../types/auth'

const authApi = axios.create({
  baseURL: import.meta.env.VITE_CUSTOMER_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const response = await authApi.post<LoginResponse>('/api/auth/login', { identifier, password })
  return response.data
}
