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
