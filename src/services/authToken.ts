import type { AxiosInstance } from 'axios'

const tokenKey = 'assms.staff.access-token'

export function getAccessToken() {
  return sessionStorage.getItem(tokenKey)
}

export function setAccessToken(token: string) {
  sessionStorage.setItem(tokenKey, token)
  window.dispatchEvent(new Event('assms-auth-changed'))
}

export function clearAccessToken() {
  if (!sessionStorage.getItem(tokenKey)) return
  sessionStorage.removeItem(tokenKey)
  window.dispatchEvent(new Event('assms-auth-changed'))
}

export function attachAuth(instance: AxiosInstance) {
  instance.interceptors.request.use((config) => {
    const token = getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  instance.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      const status = typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined
      if (status === 401 && getAccessToken()) clearAccessToken()
      return Promise.reject(error)
    },
  )
}
