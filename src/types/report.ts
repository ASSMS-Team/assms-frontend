// One row of the jobs-by-status report: a status and how many jobs hold it.
export interface StatusCount {
  // A plain string, not a union - exactly like JobResponse.status and for the
  // same reason. The reporting service deliberately holds no list of what the
  // statuses are, so a value added to the job lifecycle upstream arrives here
  // with no release of this app, and it should render rather than fail to
  // type-check against a stale union.
  status: string
  count: number
}

// What GET /api/reports/jobs-by-status returns.
export interface JobsByStatusReport {
  // One entry per status that at least one job in range carries, ordered by
  // status. Empty when nothing matches - which is an answer, not an error.
  statuses: StatusCount[]
  // How many jobs were counted in total: the sum of the counts above, not the
  // number of statuses.
  total: number
}
