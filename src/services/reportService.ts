import axios from 'axios'

import type { JobsByStatusReport } from '../types/report'
import { attachAuth } from './authToken'

// A third instance, alongside the customer and job ones: the reporting service
// is another separate process on another port, so it needs its own baseURL. As
// there, the URL comes from the env var declared in vite-env.d.ts, which types
// it as a required string - so there is no fallback here to quietly mask a
// missing .env.
export const reportingApi = axios.create({
  baseURL: import.meta.env.VITE_REPORTING_API_URL,
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
