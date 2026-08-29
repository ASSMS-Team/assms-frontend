import axios from 'axios'

import type { CreateJobRequest, JobResponse } from '../types/job'

// Its own instance, not the customer one: the job service is a separate process
// on a separate port, so it needs its own baseURL. As there, the URL comes from
// the env var declared in vite-env.d.ts, which types it as a required string -
// so there is no fallback here to quietly mask a missing .env.
export const jobApi = axios.create({
  baseURL: import.meta.env.VITE_JOB_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Resolves with the created job on 201. Any non-2xx is thrown by axios; callers
// read the problem details off error.response.data. The failures worth telling
// apart are 400 for a field validation failure, 409 for an asset and customer
// pairing no job can be raised against - no such asset, an asset owned by
// someone else, an inactive asset, or an inactive customer, all keyed on the
// field to correct - and 503 when the job service could not reach the customer
// service to validate at all. The 503 is the one where nothing was found to be
// wrong with the request, so it is safe to repeat unchanged.
export async function createJob(request: CreateJobRequest): Promise<JobResponse> {
  const response = await jobApi.post<JobResponse>('/api/jobs', request)

  return response.data
}

// Throws on 404 rather than resolving with null, so the caller can tell "no
// such job" apart from a request that never reached the service.
export async function getJobById(id: string): Promise<JobResponse> {
  const response = await jobApi.get<JobResponse>(
    `/api/jobs/${encodeURIComponent(id)}`,
  )

  return response.data
}

// The reference lookup is a different route from the id one, not the same route
// accepting either - a mistyped id must read as a missing job, not get retried
// as a reference. Throws on 404 for the same reason as getJobById.
export async function getJobByReference(
  jobReference: string,
): Promise<JobResponse> {
  const response = await jobApi.get<JobResponse>(
    `/api/jobs/reference/${encodeURIComponent(jobReference)}`,
  )

  return response.data
}
