/// Response shape from GET /api/my-assignments in Dispatch Service.
export interface MyAssignmentResponse {
  assignmentId: string
  jobId: string
  jobReference: string
  // Job summary for field work. Null for assignments made before Dispatch
  // started recording them.
  priority?: string | null
  serviceCategory?: string | null
  region?: string | null
  problemDescription?: string | null
  jobStatus: string
  assignedAt: string
}
