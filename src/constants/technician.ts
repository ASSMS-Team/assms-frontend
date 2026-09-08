// Technician coverage uses the same province values as jobs. Keeping the
// frontend values shared avoids a technician being created for a region that
// Dispatch can never match against a job.
export { REGIONS, REGION_LABELS } from './job'

// The initial UI catalogue mirrors the approved ASSMS-28 wireframe. Dispatch
// accepts labelled skills so the catalogue can grow without a frontend deploy.
export const TECHNICIAN_SKILLS = [
  'Electrical',
  'Plumbing',
  'AC',
  'Appliance',
  'Solar',
  'Pumps',
] as const
