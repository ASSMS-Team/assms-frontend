// `import type` rather than a plain import: CUSTOMER_TYPES is only used in a
// type position here, and verbatimModuleSyntax would otherwise emit a real
// runtime import of the constants module from a file that has no runtime code.
import type { CUSTOMER_TYPES } from '../constants/customer'

// Derived from the constant so the two stay in sync - see constants/customer.ts.
export type CustomerType = (typeof CUSTOMER_TYPES)[number]

// What POST /api/customers accepts. Id, status and the timestamps are absent on
// purpose: the server owns them and rejects them from the body.
export interface CreateCustomerRequest {
  name: string
  phone: string
  address: string
  customerType: CustomerType
  // Optional on the server. Send null rather than '' when the field is blank -
  // an empty string fails the server's email validation, a null does not.
  email: string | null
}

// What the API returns for a customer. Phone comes back exactly as it was
// submitted, not in the server's normalized form.
export interface CustomerResponse {
  id: string
  name: string
  phone: string
  address: string
  customerType: CustomerType
  email: string | null
  status: string
  // ISO 8601 UTC strings, not Date objects - JSON has no date type.
  createdAt: string
  updatedAt: string
}

// RFC 7807 problem response. The API returns this for 400 (field validation)
// and for 409 (duplicate active phone), keyed on the offending field in both
// cases so the same rendering path handles them.
export interface ValidationProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  traceId?: string
  // Optional because a plain ProblemDetails - a 404, for instance - carries no
  // errors object, and reading it blind would throw.
  errors?: Record<string, string[]>
}
