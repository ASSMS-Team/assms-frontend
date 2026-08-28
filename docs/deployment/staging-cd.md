# Frontend Staging CD

## Scope and Trigger

`.github/workflows/staging-cd.yml` deploys only the `dev` branch after
`Frontend CI` completes successfully. It checks out the successful workflow's
head SHA, builds that exact revision, and serializes staging deployments with
`frontend-staging-deployment`. Manual dispatch is permitted only from `dev`.

## Required GitHub Configuration

Create these GitHub **Actions variables** in this repository:

| Variable | Value / purpose |
|---|---|
| `AZURE_CLIENT_ID` | Client ID of the dedicated ASSMS GitHub OIDC application. |
| `AZURE_TENANT_ID` | Azure tenant ID. |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID. |
| `AZURE_RESOURCE_GROUP` | `rg-assms-staging`. |
| `FRONTEND_APP_NAME` | `app-assms-frontend-staging-45ff260826`. |
| `FRONTEND_URL` | `https://app-assms-frontend-staging-45ff260826.azurewebsites.net` |
| `VITE_CUSTOMER_API_URL` | `https://assms-customer-staging-45ff260826.southeastasia.cloudapp.azure.com` |

This workflow needs no application secret. Do not store MySQL credentials,
customer VM environment files, TLS private keys, or deployment SSH keys in
this repository.

## Azure OIDC Setup

No ASSMS OIDC application registration currently exists. An Azure administrator
must create one application/service principal and configure a federated
credential for this repository:

```text
issuer: https://token.actions.githubusercontent.com
audience: api://AzureADTokenExchange
subject: repo:ASSMS-Team/assms-frontend:ref:refs/heads/dev
```

Assign only `Website Contributor` on this Web App scope:

```text
/subscriptions/45ff51f1-702e-4ba3-98ff-435d3b08a04b/resourceGroups/rg-assms-staging/providers/Microsoft.Web/sites/app-assms-frontend-staging-45ff260826
```

The OIDC application client ID, tenant ID, and subscription ID are non-secret
GitHub variables. No Azure client secret is used.

## Deployment Flow

1. Set `VITE_CUSTOMER_API_URL` only for the staging build; `.env.example` is
   unchanged.
2. Run `npm ci`, `npm run lint`, and `npm run build` on Node.js 22.
3. Require `dist/index.html`, ZIP the compiled `dist` contents, and deploy with
   `az webapp deploy` rather than FTP or basic publishing.
4. Confirm the App Service startup command remains
   `pm2 serve /home/site/wwwroot --no-daemon --spa`.
5. Confirm `/` and `/assets/new` return the React SPA shell and the Customer
   HTTPS health endpoint is reachable.

## Rollback and Emergency Procedure

To roll back, run the workflow again from a known-good `dev` SHA after
reviewing CI, or manually build that exact revision with the staging API URL and
ZIP-deploy only the resulting `dist` contents. Verify `/` and `/assets/new`
before declaring the rollback complete. Do not change the App Service startup
command during a content rollback.

## Known Limitations

This workflow is staging-only. It does not run Terraform, change the App
Service startup command, deploy production, alter Customer CORS, or create
GitHub/Azure configuration automatically. OIDC federation and the scoped Azure
role assignment must be completed manually before the workflow can run.
