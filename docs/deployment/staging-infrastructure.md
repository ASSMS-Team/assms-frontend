# Frontend Staging Infrastructure

## Current Infrastructure

| Item | Value |
|---|---|
| Application | React 19 + Vite 8 client-side SPA |
| Build | `npm run build` produces `dist/` |
| App Service Plan | `asp-assms-frontend-staging` |
| Web App | `app-assms-frontend-staging-45ff260826` |
| Hostname | `app-assms-frontend-staging-45ff260826.azurewebsites.net` |
| Region / OS | Southeast Asia / Linux |
| SKU / tier | F1 / Free |
| State key | `frontend/staging.tfstate` |
| Platform dependency | Reads `platform/staging.tfstate` for the shared resource group |

The Web App has HTTPS-only access, TLS 1.2, HTTP/2, disabled FTPS, disabled FTP/WebDeploy basic publishing, public web access, and Always On disabled. No application settings, Vite API URLs, secrets, MySQL access, or Kafka access are configured.

## Deployment Status

Frontend infrastructure is complete. The React build has **not** been deployed, and no backend API URL is configured. The frontend does not connect directly to MySQL or Kafka.

## F1 Limitations

F1 is a staging choice with shared compute, 60 CPU minutes/day, 1 GB RAM, 1 GB storage, and no production SLA. The app can be temporarily stopped if the free-tier quota is exhausted. A reviewed upgrade to B1 is possible if a demonstration needs more capacity.

## Future Deployment and CD Work

After backend APIs are deployed and stable, define public API URLs, build the SPA, choose a reviewed App Service deployment method, and implement GitHub Actions CD. None of those steps has started.
