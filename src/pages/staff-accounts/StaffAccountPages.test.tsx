import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import StaffAccountListPage from './StaffAccountListPage'
import CreateStaffAccountPage from './CreateStaffAccountPage'
import { createStaffAccount, getStaffAccounts } from '../../services/staffAccountService'

vi.mock('../../services/staffAccountService', () => ({
  getStaffAccounts: vi.fn(),
  createStaffAccount: vi.fn(),
  staffAccountError: vi.fn((err: unknown) => (err instanceof Error ? err.message : 'Staff account creation failed.')),
}))

const getStaffAccountsMock = vi.mocked(getStaffAccounts)
const createStaffAccountMock = vi.mocked(createStaffAccount)

const sampleAccount = {
  id: 'acc-1',
  fullName: 'Kasun Bandara',
  username: 'kasun.b',
  email: 'kasun@assms.com',
  role: 'Agent',
  status: 'ACTIVE',
  technicianId: null,
  createdAt: '2026-10-12T10:00:00Z',
  createdBy: 'mgr-1',
}

describe('Staff Account Pages', () => {
  beforeEach(() => {
    getStaffAccountsMock.mockReset()
    createStaffAccountMock.mockReset()
  })
  afterEach(() => cleanup())

  it('renders staff accounts table with role and status badges', async () => {
    getStaffAccountsMock.mockResolvedValue([sampleAccount])
    render(
      <MemoryRouter>
        <StaffAccountListPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Kasun Bandara')).toBeInTheDocument()
    expect(screen.getByText('kasun.b')).toBeInTheDocument()
    expect(screen.getByText('kasun@assms.com')).toBeInTheDocument()
    expect(screen.getByText('Agent')).toBeInTheDocument()
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
  })

  it('displays empty state when no accounts exist', async () => {
    getStaffAccountsMock.mockResolvedValue([])
    render(
      <MemoryRouter>
        <StaffAccountListPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('No staff accounts found.')).toBeInTheDocument()
  })

  it('rejects passwords that do not match in CreateStaffAccountPage', async () => {
    render(
      <MemoryRouter>
        <CreateStaffAccountPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Nimal Perera' } })
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'nimal.p' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nimal@assms.com' } })
    fireEvent.change(screen.getByLabelText('Initial password'), { target: { value: 'SecretPassword123!' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'DifferentPassword123!' } })

    fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(createStaffAccountMock).not.toHaveBeenCalled()
  })

  it('rejects passwords shorter than 12 characters', async () => {
    render(
      <MemoryRouter>
        <CreateStaffAccountPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Nimal Perera' } })
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'nimal.p' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nimal@assms.com' } })
    fireEvent.change(screen.getByLabelText('Initial password'), { target: { value: 'Short1!' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Short1!' } })

    fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    expect(await screen.findByText('Password must be at least 12 characters.')).toBeInTheDocument()
    expect(createStaffAccountMock).not.toHaveBeenCalled()
  })

  it('shows and requires technician UUID when role is Technician', async () => {
    render(
      <MemoryRouter>
        <CreateStaffAccountPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Technician' } })
    expect(screen.getByLabelText('Dispatch technician UUID')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Tech Silva' } })
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'tech.silva' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'silva@assms.com' } })
    fireEvent.change(screen.getByLabelText('Initial password'), { target: { value: 'SecurePass12345!' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'SecurePass12345!' } })

    fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    expect(await screen.findByText('A Dispatch technician UUID is required for the Technician role.')).toBeInTheDocument()
    expect(createStaffAccountMock).not.toHaveBeenCalled()
  })

  it('successfully submits valid staff account request and resets form', async () => {
    createStaffAccountMock.mockResolvedValue({
      ...sampleAccount,
      fullName: 'Sunil Dias',
      username: 'sunil.d',
      role: 'Manager',
    })

    render(
      <MemoryRouter>
        <CreateStaffAccountPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Sunil Dias' } })
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'sunil.d' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sunil@assms.com' } })
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Manager' } })
    fireEvent.change(screen.getByLabelText('Initial password'), { target: { value: 'SecurePass12345!' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'SecurePass12345!' } })

    fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    await waitFor(() => {
      expect(createStaffAccountMock).toHaveBeenCalledWith({
        fullName: 'Sunil Dias',
        username: 'sunil.d',
        email: 'sunil@assms.com',
        role: 'Manager',
        password: 'SecurePass12345!',
        technicianId: null,
      })
    })

    expect(await screen.findByText(/Created/i)).toHaveTextContent('Sunil Dias as Manager (sunil.d)')
  })
})
