/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Staging uses Azure API Management as a unified gateway. If defined, all
  // service endpoints are resolved via subpaths (/customer, /jobs, /dispatch, /reports).
  readonly VITE_API_BASE_URL?: string

  // Local development service addresses (fallback when VITE_API_BASE_URL is omitted).
  readonly VITE_CUSTOMER_API_URL?: string
  readonly VITE_JOB_API_URL?: string
  readonly VITE_DISPATCH_API_URL?: string
  readonly VITE_REPORTING_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

