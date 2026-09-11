// Browser traffic enters ASSMS through Azure API Management. The trailing-slash
// trim means either form of the configured origin produces one separator before
// the service prefix.
const gatewayBaseUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')

export type GatewayService = 'customer' | 'jobs' | 'dispatch' | 'reports'

export function gatewayServiceUrl(service: GatewayService): string {
  return `${gatewayBaseUrl}/${service}`
}
