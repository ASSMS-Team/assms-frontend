import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('API Management client routing', () => {
  it('uses one gateway origin with a stable prefix for every service client', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://gateway.example.test/')

    const [customer, auth, jobs, dispatch, reports] = await Promise.all([
      import('./customerService'),
      import('./authService'),
      import('./jobService'),
      import('./dispatchService'),
      import('./reportService'),
    ])

    expect(customer.customerApi.defaults.baseURL).toBe('https://gateway.example.test/customer')
    expect(auth.authApi.defaults.baseURL).toBe('https://gateway.example.test/customer')
    expect(jobs.jobApi.defaults.baseURL).toBe('https://gateway.example.test/jobs')
    expect(dispatch.dispatchApi.defaults.baseURL).toBe('https://gateway.example.test/dispatch')
    expect(reports.reportingApi.defaults.baseURL).toBe('https://gateway.example.test/reports')
  })
})
