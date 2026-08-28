// `import type` rather than a plain import: ASSET_TYPES is only used in a type
// position here, and verbatimModuleSyntax would otherwise emit a real runtime
// import of the constants module from a file that has no runtime code.
import type { ASSET_TYPES } from '../constants/asset'

// Derived from the constant so the two stay in sync - see constants/asset.ts.
export type AssetType = (typeof ASSET_TYPES)[number]

// What POST /api/assets accepts. Id and the timestamps are absent on purpose:
// the server owns them and rejects them from the body.
export interface CreateAssetRequest {
  customerId: string
  assetType: AssetType
  model: string
  serialNumber: string
  // A plain 'YYYY-MM-DD' string, which is exactly what <input type="date">
  // produces and what the server's DateOnly parses. Deliberately not a Date:
  // JSON has no date type, and a Date would serialize with a time and a zone
  // that the day a unit was installed does not have.
  //
  // Null when the field is blank, never '': an empty string fails the server's
  // JSON conversion to DateOnly, which aborts model binding and takes every
  // other field's validation error down with it. Null is what [Required]
  // reports cleanly, keyed on this field.
  installationDate: string | null
  location: string
  // Optional on the server. Send null rather than '' when the field is blank,
  // so a skipped note is stored as NULL rather than as an empty string.
  notes: string | null
}

// What PUT /api/assets/{id} accepts. The id travels in the URL, and customerId
// is absent on purpose rather than merely optional: an asset does not change
// hands, so the server does not read an owner from the update body at all.
export interface UpdateAssetRequest {
  assetType: AssetType
  model: string
  serialNumber: string
  // Same rule as on create: 'YYYY-MM-DD', and null rather than '' when blank,
  // so a missing date is reported as a field error instead of aborting the
  // whole model binding.
  installationDate: string | null
  location: string
  // Optional on the server. Send null rather than '' when the field is blank,
  // so a cleared note is stored as NULL rather than as an empty string.
  notes: string | null
}

// What the API returns for an asset. The serial number comes back exactly as it
// was submitted, not in the server's normalized form.
export interface AssetResponse {
  id: string
  customerId: string
  assetType: AssetType
  model: string
  serialNumber: string
  // 'YYYY-MM-DD', the same shape it was sent in.
  installationDate: string
  location: string
  notes: string | null
  // ACTIVE or INACTIVE. Typed as a plain string, exactly like
  // CustomerResponse.status and for the same reason: StatusBadge decides its
  // colour by comparing against 'ACTIVE', so a value the frontend has not heard
  // of renders grey rather than failing to type-check against a stale union.
  // Absent from both request types above - the server owns it.
  status: string
  // ISO 8601 UTC strings, not Date objects - JSON has no date type.
  createdAt: string
  updatedAt: string
}
