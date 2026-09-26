export interface StatusCount {
  status: string
  count: number
}

export interface JobsByStatusReport {
  statuses: StatusCount[]
  total: number
}

// A locally projected assignment group. Reporting knows this only through
// JobAssigned events; it does not read Dispatch or Job databases directly.
export interface TechnicianJobCount {
  technicianId: string
  technicianReference: string
  jobCount: number
}

export interface JobsByTechnicianReport {
  technicians: TechnicianJobCount[]
  total: number
}

export interface JobsByTechnicianFilters {
  from?: string
  to?: string
  region?: string
}

export interface CompletedJobItem {
  jobId: string
  jobReference: string
  region: string
  serviceCategory?: string | null
  technicianId?: string | null
  technicianReference?: string | null
  completedAt: string
}

export interface JobCompletionReport {
  jobs: CompletedJobItem[]
  total: number
}

export interface JobCompletionFilters {
  from?: string
  to?: string
  region?: string
}
