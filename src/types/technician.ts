import type { REGIONS } from '../constants/job'

export type TechnicianRegion = (typeof REGIONS)[number]

export interface CreateTechnicianRequest {
  reference: string
  fullName: string
  region: TechnicianRegion | ''
  skills: string[]
  status: 'ACTIVE' | 'INACTIVE'
  phone: string | null
  email: string | null
}

export type UpdateTechnicianRequest = Omit<CreateTechnicianRequest, 'reference'>

export interface TechnicianResponse {
  id: string
  reference: string
  fullName: string
  region: TechnicianRegion
  status: 'ACTIVE' | 'INACTIVE'
  skills: string[]
  phone: string | null
  email: string | null
  createdAt: string
  updatedAt: string
}
