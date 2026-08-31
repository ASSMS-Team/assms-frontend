// `import type` rather than a plain import: the constants are only used in type
// positions here, and verbatimModuleSyntax would otherwise emit a real runtime
// import of the constants module from a file that has no runtime code.
import type { PRIORITIES, REGIONS, SERVICE_CATEGORIES } from '../constants/job'

// All three are derived from the constants so they stay in sync - see
// constants/job.ts.
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]

export type Priority = (typeof PRIORITIES)[number]

export type Region = (typeof REGIONS)[number]

// What POST /api/jobs accepts. Id, job reference, status, schedule, the raising
// agent and the timestamps are absent on purpose: the server owns them and
// rejects them from the body.
export interface CreateJobRequest {
  customerId: string
  assetId: string
  serviceCategory: ServiceCategory
  problemDescription: string
  priority: Priority
  region: Region
}

// What the API returns for a job.
export interface JobResponse {
  id: string
  // The human-readable handle, JOB- and six characters. This is what an Agent
  // quotes to a customer, so it is what the UI shows rather than the id.
  jobReference: string
  customerId: string
  assetId: string
  serviceCategory: ServiceCategory
  problemDescription: string
  priority: Priority
  region: Region
  // 'YYYY-MM-DD', or null while the job is unscheduled - which is every job
  // today, since nothing schedules work yet.
  scheduledDate: string | null
  // The agent who raised the job. The all-zero GUID until authentication
  // exists, so nothing should render it as a person yet.
  createdBy: string
  // CREATED on a new job. Typed as a plain string, exactly like
  // CustomerResponse.status and for the same reason: the lifecycle grows in
  // later sprints, and a value the frontend has not heard of should render
  // rather than fail to type-check against a stale union.
  status: string
  // ISO 8601 UTC strings, not Date objects - JSON has no date type.
  createdAt: string
  updatedAt: string
}
