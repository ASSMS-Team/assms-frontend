import axios from 'axios'

import type {
  JobCompletionFilters,
  JobCompletionReport,
  JobsByStatusReport,
  JobsByTechnicianFilters,
  JobsByTechnicianReport,
} from '../types/report'
import { attachAuth } from './authToken'
import { REPORTING_API_BASE_URL } from './apiConfig'

export const reportingApi = axios.create({
  baseURL: REPORTING_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
attachAuth(reportingApi)

// The jobs-by-status report. Both bounds are optional and independent: with
// neither, every projected job is counted; with both, the jobs created between
// them inclusive; with one, that end alone.
//
// Resolves with the counts on 200 - including when nothing matches, which comes
// back as an empty statuses array and a total of 0 rather than a 404. A 400 for
// an unusable filter is thrown by axios; callers read the errors off
// error.response.data, keyed on "from" and "to".
export async function getJobsByStatus(
  from?: string,
  to?: string,
): Promise<JobsByStatusReport> {
  // Built up rather than passed as { from, to }. A bound that is absent has to
  // be left off the URL entirely, never sent as an empty string: the API reads
  // ?from= as a caller who cleared the field and returns the unfiltered report,
  // so an empty string would silently widen the range instead of narrowing it.
  const params: Record<string, string> = {}

  if (from) {
    params.from = from
  }

  if (to) {
    params.to = to
  }

  const response = await reportingApi.get<JobsByStatusReport>(
    '/api/reports/jobs-by-status',
    { params },
  )

  return response.data
}

// Assignment-time report. The API validates RFC 3339 values and the exact
// normalized region; omitted values are left off the query entirely.
export async function getJobsByTechnician(
  filters: JobsByTechnicianFilters = {},
): Promise<JobsByTechnicianReport> {
  const params: Record<string, string> = {}
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.region) params.region = filters.region

  const response = await reportingApi.get<JobsByTechnicianReport>(
    '/api/reports/jobs-by-technician',
    { params },
  )

  return response.data
}

// Completed jobs dynamic report. The API validates RFC 3339 values and the exact
// normalized region; omitted values are left off the query entirely.
export async function getJobCompletions(
  filters: JobCompletionFilters = {},
): Promise<JobCompletionReport> {
  const params: Record<string, string> = {}
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.region) params.region = filters.region

  const response = await reportingApi.get<JobCompletionReport>(
    '/api/reports/job-completions',
    { params },
  )

  return response.data
}
