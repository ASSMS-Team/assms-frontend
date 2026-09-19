import axios from 'axios'

import type {
  CreateCustomerRequest,
  CustomerResponse,
  UpdateCustomerRequest,
} from '../types/customer'
import { attachAuth } from './authToken'

// baseURL comes from the env var declared in vite-env.d.ts, which types it as a
// required string - so there is no fallback URL here to quietly mask a missing
// .env and send requests somewhere unexpected.
export const customerApi = axios.create({
  baseURL: import.meta.env.VITE_CUSTOMER_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
attachAuth(customerApi)

// Resolves with the created customer on 201. Any non-2xx - 400 for a field
// validation failure, 409 for a phone already held by an active customer - is
// thrown by axios; callers read the problem details off error.response.data.
export async function createCustomer(
  request: CreateCustomerRequest,
): Promise<CustomerResponse> {
  const response = await customerApi.post<CustomerResponse>('/api/customers', request)

  return response.data
}

// Resolves with the customer as it now stands on 200. Non-2xx is thrown by
// axios: 400 for a field validation failure, 404 when no such customer exists,
// and 409 either for a phone another active customer holds or for a customer
// that is no longer active - the two 409s are told apart by whether the problem
// details carry an "errors" object.
export async function updateCustomer(
  id: string,
  request: UpdateCustomerRequest,
): Promise<CustomerResponse> {
  const response = await customerApi.put<CustomerResponse>(
    `/api/customers/${encodeURIComponent(id)}`,
    request,
  )

  return response.data
}

// The list, newest first - the ordering is the API's, not ours. Without a
// status that is every customer; with one it is only the customers holding it.
export async function getAllCustomers(status?: string): Promise<CustomerResponse[]> {
  // The parameter is appended only when there is a status to send. Passing it
  // as '' instead would not filter: the server converts an empty query value to
  // null before validating, so it reads as "no filter" and returns everyone -
  // silently, which is exactly the outcome the 400 exists to prevent.
  const response = await customerApi.get<CustomerResponse[]>('/api/customers', {
    params: status ? { status } : undefined,
  })

  return response.data
}

// Resolves with the customer as it now stands on 200 - status INACTIVE, whether
// this call changed it or it was already inactive. 404 is the only failure the
// caller has to tell apart: no customer with this id.
export async function deactivateCustomer(id: string): Promise<CustomerResponse> {
  const response = await customerApi.post<CustomerResponse>(
    `/api/customers/${encodeURIComponent(id)}/deactivate`,
  )

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
