# Frontend API Management configuration

The React application sends all backend requests to the single
`VITE_API_BASE_URL` origin. It appends a fixed service prefix before the
existing service-owned `/api/...` path:

| Client | Gateway base URL |
|---|---|
| Authentication, Customer and Asset | `${VITE_API_BASE_URL}/customer` |
| Job | `${VITE_API_BASE_URL}/jobs` |
| Dispatch | `${VITE_API_BASE_URL}/dispatch` |
| Reporting | `${VITE_API_BASE_URL}/reports` |

The browser still sends its `Authorization: Bearer` token. APIM forwards it and
each backend remains responsible for JWT validation and role-based access.

For staging, obtain `api_management_gateway_url` from the Platform
Infrastructure Terraform output and set it as the GitHub Actions build
variable. Do not put backend VM URLs, APIM subscription keys or JWT signing
keys in the frontend repository.
