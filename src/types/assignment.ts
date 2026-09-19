/// Response shape from GET /api/my-assignments in Dispatch Service.
export interface MyAssignmentResponse {
  assignmentId: string
  jobId: string
  jobReference: string
  jobStatus: string
  assignedAt: string
}
