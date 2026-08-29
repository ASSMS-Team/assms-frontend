// The service category values the API accepts. This array is the single source
// of truth for them: the ServiceCategory union in types/job.ts is derived from
// it, so the select options below and the union cannot drift apart. The values
// mirror the CHECK constraint on the jobs table.
export const SERVICE_CATEGORIES = [
  'INSTALLATION',
  'REPAIR',
  'MAINTENANCE',
  'INSPECTION',
  'WARRANTY_CLAIM',
] as const

// What the select shows. The API only ever sees the values above.
export const SERVICE_CATEGORY_LABELS: Record<
  (typeof SERVICE_CATEGORIES)[number],
  string
> = {
  INSTALLATION: 'Installation',
  REPAIR: 'Repair',
  MAINTENANCE: 'Maintenance',
  INSPECTION: 'Inspection',
  WARRANTY_CLAIM: 'Warranty claim',
}

// Ordered least to most urgent, which is the order the select shows them in.
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

export const PRIORITY_LABELS: Record<(typeof PRIORITIES)[number], string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

// The nine Sri Lankan provinces, which is what the API accepts for region.
// Dispatch matches this against technician coverage, so the value has to be one
// of these exactly - a free-text address belongs on the asset, not here.
export const REGIONS = [
  'WESTERN',
  'CENTRAL',
  'SOUTHERN',
  'NORTHERN',
  'EASTERN',
  'NORTH_WESTERN',
  'NORTH_CENTRAL',
  'UVA',
  'SABARAGAMUWA',
] as const

export const REGION_LABELS: Record<(typeof REGIONS)[number], string> = {
  WESTERN: 'Western',
  CENTRAL: 'Central',
  SOUTHERN: 'Southern',
  NORTHERN: 'Northern',
  EASTERN: 'Eastern',
  NORTH_WESTERN: 'North Western',
  NORTH_CENTRAL: 'North Central',
  UVA: 'Uva',
  SABARAGAMUWA: 'Sabaragamuwa',
}
