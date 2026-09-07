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

Frontend infrastructure is complete. The React build has now been deployed to the staging Web App. The frontend does not connect directly to MySQL or Kafka.

## Asset UI Staging Deployment Verification

| Check | Result |
|---|---|
| Frontend source SHA | `1fdf64fe42cdfffce17d9585a4f226c5d95bc72b` |
| CI | PASS (manually verified) |
| Production build | PASS — `npm ci` followed by `npm run build` produced `dist/` |
| Deployment target | `app-assms-frontend-staging-45ff260826` |
| Root page | PASS — HTTPS `GET /` returned `200` |
| Customer API URL embedded at build time | `https://assms-customer-staging-45ff260826.southeastasia.cloudapp.azure.com` |
| Customer API CORS | PASS — staging frontend origin allowed; unrelated origin received no CORS permission |
| US-02A Register Asset | PASS — manually verified in staging. |
| US-02B View Customer Assets | PASS — manually verified in staging. |
| US-02C Update Asset | PASS — manually verified in staging. |
| US-02D Deactivate Asset | PASS — manually verified in staging. |

### Known staging routing issue

The direct-route `404` was resolved with an in-place App Service configuration update. The staging Linux App Service now uses Node.js `22-lts` and this startup command:

```text
pm2 serve /home/site/wwwroot --no-daemon --spa
```

`/home/site/wwwroot` is the Linux App Service ZIP-deployment root. PM2 serves the compiled Vite output and returns `index.html` for unknown client-side routes, allowing React Router to process them. External verification confirmed that `/`, `/assets/new`, a synthetic `/assets/{id}`, `/assets/{id}/edit`, and a synthetic `/customers/{id}` each return `200` and the SPA shell. No React business code, API URL, CORS policy, or backend configuration changed.

Manual staging UI testing subsequently confirmed the four Asset stories. No
unexpected browser-console, CORS, mixed-content, routing, or runtime errors
were observed. Customer API HTTPS and the staging frontend-origin CORS policy
remained functional during verification.

## F1 Limitations

F1 is a staging choice with shared compute, 60 CPU minutes/day, 1 GB RAM, 1 GB storage, and no production SLA. The app can be temporarily stopped if the free-tier quota is exhausted. A reviewed upgrade to B1 is possible if a demonstration needs more capacity.

## Deployment and CD Status

The staging Customer API URL and reviewed ZIP deployment method are now in use.
GitHub Actions staging CD is implemented on `dev` through
`.github/workflows/staging-cd.yml`. It runs after Terraform validation, lint and
the production build succeed, deploys the exact tested commit through Azure
OIDC, and verifies the SPA routes and Customer API health endpoint. Retain a
successful private Actions run screenshot before describing the CD path as
runtime verified in the Sprint 1 evaluation.
