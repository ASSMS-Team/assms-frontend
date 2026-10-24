import { AxiosError } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createStaffAccount,
  deactivateStaffAccount,
  getStaffAccounts,
  staffAccountError,
  staffApi,
} from './staffAccountService'

describe('staffAccountService', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('getStaffAccounts resolves with accounts on success', async () => {
    const mockData = [
      {
        id: 'acc-1',
        fullName: 'Kasun Bandara',
        username: 'kasun.manager',
        email: 'kasun@assms.com',
        role: 'Manager',
        status: 'ACTIVE',
        technicianId: null,
        createdAt: '2026-10-12T00:00:00Z',
        createdBy: null,
      },
    ]
    vi.spyOn(staffApi, 'get').mockResolvedValueOnce({ data: mockData })

    const result = await getStaffAccounts()
    expect(result).toEqual(mockData)
  })

  it('getStaffAccounts throws on network or server error without substituting fake accounts', async () => {
    const networkError = new AxiosError('Network Error', 'ERR_NETWORK')
    vi.spyOn(staffApi, 'get').mockRejectedValueOnce(networkError)

    await expect(getStaffAccounts()).rejects.toThrow('Network Error')
  })

  it('createStaffAccount throws when API returns 409 conflict and does not fabricate a created account', async () => {
    const conflictError = new AxiosError(
      'Request failed with status code 409',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 409,
        statusText: 'Conflict',
        data: { title: 'Username or email already in use.' },
        headers: {},
        config: {} as never,
      }
    )
    vi.spyOn(staffApi, 'post').mockRejectedValueOnce(conflictError)

    await expect(
      createStaffAccount({
        fullName: 'Duplicate User',
        username: 'dup.user',
        email: 'dup@assms.com',
        role: 'Agent',
        password: 'Password123!',
      })
    ).rejects.toThrow('Request failed with status code 409')
  })

  it('deactivateStaffAccount throws when API fails without fallback', async () => {
    const serverError = new AxiosError('Server error', 'ERR_BAD_RESPONSE')
    vi.spyOn(staffApi, 'post').mockRejectedValueOnce(serverError)

    await expect(deactivateStaffAccount('acc-1')).rejects.toThrow('Server error')
  })

  it('staffAccountError extracts message from detail or title or status', () => {
    const detailError = new AxiosError('Error', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 409,
      statusText: 'Conflict',
      data: { detail: 'Custom detail message' },
      headers: {},
      config: {} as never,
    })
    expect(staffAccountError(detailError)).toBe('Custom detail message')

    const networkError = new AxiosError('Network failure', 'ERR_NETWORK')
    expect(staffAccountError(networkError)).toContain('check your network connection')
  })
})
