/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Declared as string, not string | undefined: the value is required for the
  // app to talk to the customer service, and typing it as optional means a
  // null check at every call site.
  readonly VITE_CUSTOMER_API_URL: string
  // Same rule for the job service. It is a second process on a second port, so
  // it needs its own base URL rather than sharing the customer one.
  readonly VITE_JOB_API_URL: string
  // Dispatch owns technicians and assignments. The value is intentionally a
  // separate base URL because it is a separate service and database.
  readonly VITE_DISPATCH_API_URL: string
  // And a third, for the reporting service. It is the read side of the system -
  // the reports it serves are built from events, not from either of the two
  // above - so it is a separate process on a separate port again.
  readonly VITE_REPORTING_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
