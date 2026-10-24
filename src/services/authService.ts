import axios from 'axios'

import type { LoginResponse } from '../types/auth'

import { CUSTOMER_API_BASE_URL } from './apiConfig'

const authApi = axios.create({
  baseURL: CUSTOMER_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const response = await authApi.post<LoginResponse>('/api/auth/login', { identifier, password })
  return response.data
}
