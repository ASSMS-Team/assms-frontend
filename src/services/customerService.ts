import axios from 'axios'

import type { CreateCustomerRequest, CustomerResponse } from '../types/customer'

// baseURL comes from the env var declared in vite-env.d.ts, which types it as a
// required string - so there is no fallback URL here to quietly mask a missing
// .env and send requests somewhere unexpected.
export const customerApi = axios.create({
  baseURL: import.meta.env.VITE_CUSTOMER_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Resolves with the created customer on 201. Any non-2xx - 400 for a field
// validation failure, 409 for a phone already held by an active customer - is
// thrown by axios; callers read the problem details off error.response.data.
export async function createCustomer(
  request: CreateCustomerRequest,
): Promise<CustomerResponse> {
  const response = await customerApi.post<CustomerResponse>('/api/customers', request)

  return response.data
}

// The whole list, newest first - the ordering is the API's, not ours.
export async function getAllCustomers(): Promise<CustomerResponse[]> {
  const response = await customerApi.get<CustomerResponse[]>('/api/customers')

  return response.data
}

// Throws on 404 rather than resolving with null, so the caller can tell "no
// such customer" apart from a request that never reached the service.
export async function getCustomerById(id: string): Promise<CustomerResponse> {
  const response = await customerApi.get<CustomerResponse>(
    `/api/customers/${encodeURIComponent(id)}`,
  )

  return response.data
}
