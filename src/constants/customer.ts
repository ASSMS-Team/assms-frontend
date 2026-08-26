// The customer type values the API accepts. This array is the single source of
// truth for them: the CustomerType union in types/customer.ts is derived from
// it, so the select options below and the union cannot drift apart.
export const CUSTOMER_TYPES = ['INDIVIDUAL', 'BUSINESS'] as const

// What the select shows. The API only ever sees the values above.
export const CUSTOMER_TYPE_LABELS: Record<(typeof CUSTOMER_TYPES)[number], string> = {
  INDIVIDUAL: 'Individual',
  BUSINESS: 'Business',
}
