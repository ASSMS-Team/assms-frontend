// The asset type values the API accepts. This array is the single source of
// truth for them: the AssetType union in types/asset.ts is derived from it, so
// the select options below and the union cannot drift apart. The values mirror
// the CHECK constraint on the assets table.
export const ASSET_TYPES = [
  'AIR_CONDITIONER',
  'REFRIGERATOR',
  'WASHING_MACHINE',
  'WATER_HEATER',
  'OTHER',
] as const

// What the select shows. The API only ever sees the values above.
export const ASSET_TYPE_LABELS: Record<(typeof ASSET_TYPES)[number], string> = {
  AIR_CONDITIONER: 'Air conditioner',
  REFRIGERATOR: 'Refrigerator',
  WASHING_MACHINE: 'Washing machine',
  WATER_HEATER: 'Water heater',
  OTHER: 'Other',
}
