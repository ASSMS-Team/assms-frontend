import axios from 'axios'

import type { LoginResponse } from '../types/auth'
import { gatewayServiceUrl } from './apiGateway'

export const authApi = axios.create({
  baseURL: gatewayServiceUrl('customer'),
  headers: { 'Content-Type': 'application/json' },
})

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const response = await authApi.post<LoginResponse>('/api/auth/login', { identifier, password })
  return response.data
}
