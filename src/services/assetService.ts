// The assets endpoints live on the customer & asset service, so they go through
// the same axios instance rather than a second one pointed at the same baseURL.
import { customerApi } from './customerService'
import type { AssetResponse, CreateAssetRequest } from '../types/asset'

// Resolves with the created asset on 201. Any non-2xx - 400 for a field
// validation failure, 409 for a serial another asset already holds or for a
// customer that is missing or inactive - is thrown by axios; callers read the
// problem details off error.response.data.
export async function createAsset(
  request: CreateAssetRequest,
): Promise<AssetResponse> {
  const response = await customerApi.post<AssetResponse>('/api/assets', request)

  return response.data
}

// Throws on 404 rather than resolving with null, so the caller can tell "no
// such asset" apart from a request that never reached the service.
export async function getAssetById(id: string): Promise<AssetResponse> {
  const response = await customerApi.get<AssetResponse>(
    `/api/assets/${encodeURIComponent(id)}`,
  )

  return response.data
}

// Every asset the customer owns, newest first - the ordering is the API's, not
// ours. The route is nested under the customer because that is who the list
// belongs to. Resolves with an empty array when the customer has no equipment;
// a 404 here means no such customer, not an empty list, and is thrown.
export async function getAssetsByCustomerId(
  customerId: string,
): Promise<AssetResponse[]> {
  const response = await customerApi.get<AssetResponse[]>(
    `/api/customers/${encodeURIComponent(customerId)}/assets`,
  )

  return response.data
}
