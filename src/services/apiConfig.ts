function trimTrailingSlash(url?: string): string {
  return (url ?? '').trim().replace(/\/+$/, '')
}

const gatewayBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL)

export const CUSTOMER_API_BASE_URL = gatewayBaseUrl
  ? `${gatewayBaseUrl}/customer`
  : trimTrailingSlash(import.meta.env.VITE_CUSTOMER_API_URL)

export const JOB_API_BASE_URL = gatewayBaseUrl
  ? `${gatewayBaseUrl}/jobs`
  : trimTrailingSlash(import.meta.env.VITE_JOB_API_URL)

export const DISPATCH_API_BASE_URL = gatewayBaseUrl
  ? `${gatewayBaseUrl}/dispatch`
  : trimTrailingSlash(import.meta.env.VITE_DISPATCH_API_URL)

export const REPORTING_API_BASE_URL = gatewayBaseUrl
  ? `${gatewayBaseUrl}/reports`
  : trimTrailingSlash(import.meta.env.VITE_REPORTING_API_URL)
