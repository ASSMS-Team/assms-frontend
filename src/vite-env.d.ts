/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Declared as string, not string | undefined: the value is required for the
  // app to talk to the customer service, and typing it as optional means a
  // null check at every call site.
  readonly VITE_CUSTOMER_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
