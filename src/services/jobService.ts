import axios from 'axios'

import type {
  CompleteJobRequest,
  CreateJobRequest,
  CreateWorkRecordRequest,
  JobListFilters,
  JobResponse,
  JobStatusHistoryResponse,
  ServiceWorkRecordResponse,
  UpdateWorkRecordRequest,
} from '../types/job'
import { attachAuth } from './authToken'
import { JOB_API_BASE_URL } from './apiConfig'

export const jobApi = axios.create({
  baseURL: JOB_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
attachAuth(jobApi)

export async function getJobs(filters: JobListFilters = {}): Promise<JobResponse[]> {
  const params: Record<string, string> = {}
  if (filters.status) params.status = filters.status
  if (filters.assignedTechnicianId) params.assignedTechnicianId = filters.assignedTechnicianId

  const response = await jobApi.get<JobResponse[]>('/api/jobs', { params })
  if (!Array.isArray(response.data)) {
    throw new Error('Job Service returned an invalid job-list response.')
  }

  return response.data
}

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

// Starts an assigned job (moves status from ASSIGNED to IN_PROGRESS).
// The caller provides the technician's id. Throws on 403 (not assignee),
// 404 (not found), or 409 (not assigned / invalid transition).
export async function startJob(
  id: string,
  technicianId: string,
): Promise<JobResponse> {
  const response = await jobApi.post<JobResponse>(
    `/api/jobs/${encodeURIComponent(id)}/start`,
    { technicianId },
  )

  return response.data
}

// Completes an in-progress job (moves status from IN_PROGRESS to COMPLETED).
// The caller provides the technician's id. Throws on 403 (not assignee),
// 404 (not found), or 409 (not in-progress / no work records / invalid transition).
export async function completeJob(
  id: string,
  technicianId: string,
): Promise<JobResponse> {
  const response = await jobApi.post<JobResponse>(
    `/api/jobs/${encodeURIComponent(id)}/complete`,
    { technicianId } as CompleteJobRequest,
  )

  return response.data
}
// Adds a service work record for an active in-progress job.
// The caller must be the active assignee.
export async function addWorkRecord(
  jobId: string,
  request: CreateWorkRecordRequest,
): Promise<ServiceWorkRecordResponse> {
  const response = await jobApi.post<ServiceWorkRecordResponse>(
    `/api/jobs/${encodeURIComponent(jobId)}/work-records`,
    request,
  )

  return response.data
}

// Retrieves all service work records for a job.
export async function getWorkRecords(
  jobId: string,
): Promise<ServiceWorkRecordResponse[]> {
  const response = await jobApi.get<ServiceWorkRecordResponse[]>(
    `/api/jobs/${encodeURIComponent(jobId)}/work-records`,
  )

  if (!Array.isArray(response.data)) {
    throw new Error('Job Service returned an invalid work records response.')
  }

  return response.data
}

// Updates a work record while its job remains in progress.
export async function updateWorkRecord(
  jobId: string,
  recordId: string,
  request: UpdateWorkRecordRequest,
): Promise<ServiceWorkRecordResponse> {
  const response = await jobApi.put<ServiceWorkRecordResponse>(
    `/api/jobs/${encodeURIComponent(jobId)}/work-records/${encodeURIComponent(recordId)}`,
    request,
  )

  return response.data
}

export async function getJobStatusHistory(
  id: string,
): Promise<JobStatusHistoryResponse[]> {
  const response = await jobApi.get<JobStatusHistoryResponse[]>(
    `/api/jobs/${encodeURIComponent(id)}/history`,
  )
  return response.data
}

// Deletes a draft work record while its job remains in progress.
export async function deleteWorkRecord(
  jobId: string,
  recordId: string,
  technicianId: string,
): Promise<void> {
  await jobApi.delete(
    `/api/jobs/${encodeURIComponent(jobId)}/work-records/${encodeURIComponent(recordId)}`,
    { params: { technicianId } },
  )
}


