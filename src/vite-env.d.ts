/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Required Azure API Management origin. Clients append their fixed service
  // prefix, giving the browser one backend entry point.
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
