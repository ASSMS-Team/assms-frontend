import axios from 'axios'

export interface ParsedApiError {
  status?: number
  message: string
  fieldErrors?: Record<string, string[]>
}

/**
 * Parses any caught error (AxiosError, Error, or unknown) into an accurate,
 * user-friendly error message aligned with HTTP status codes:
 * - 400: field-level validation errors or validation summary
 * - 401: session expired / unauthenticated
 * - 403: action not permitted for role
 * - 404: requested record not found
 * - 409: state conflict
 * - 5xx: service unavailable / server problem
 * - Network errors (no response): service connection failure
 */
export function parseApiError(error: unknown, fallbackMessage = 'An unexpected error occurred. Please try again.'): ParsedApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const data = error.response?.data as {
      title?: string
      detail?: string
      message?: string
      errors?: Record<string, string[]>
    } | undefined

    if (status === 400) {
      if (data?.errors && Object.keys(data.errors).length > 0) {
        const errorDetails = Object.entries(data.errors)
          .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
          .join('; ')
        return {
          status,
          message: data.detail ? `${data.detail} (${errorDetails})` : `Validation failed: ${errorDetails}`,
          fieldErrors: data.errors,
        }
      }
      return {
        status,
        message: data?.detail || data?.title || 'Validation failed: please verify the submitted data.',
      }
    }

    if (status === 401) {
      return {
        status,
        message: 'Your session has expired. Please sign in again.',
      }
    }

    if (status === 403) {
      return {
        status,
        message: 'Action not permitted: your staff role does not have permission for this action.',
      }
    }

    if (status === 404) {
      return {
        status,
        message: data?.detail || 'The requested record was not found.',
      }
    }

    if (status === 409) {
      return {
        status,
        message: data?.detail || data?.title || 'Conflict: the operation cannot be completed due to the record’s current state.',
      }
    }

    if (status && status >= 500) {
      return {
        status,
        message: 'Service is temporarily unavailable. Please try again later.',
      }
    }

    // Network failures where request was sent but no response arrived
    if (error.request && !error.response) {
      return {
        message: 'Could not connect to the service. Please check your network connection or verify the service is running.',
      }
    }

    if (data?.detail || data?.message || data?.title) {
      return {
        status,
        message: [data.title, data.detail || data.message].filter(Boolean).join(' - '),
      }
    }
  }

  if (error instanceof Error && error.message) {
    if (fallbackMessage && !error.message.toLowerCase().includes('could not')) {
      const prefix = fallbackMessage.replace(/\.[^.]*$/, '')
      return { message: `${prefix}: ${error.message}` }
    }
    return { message: error.message }
  }

  return { message: fallbackMessage }
}
