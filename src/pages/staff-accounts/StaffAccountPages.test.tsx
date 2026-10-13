import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import StaffAccountListPage from './StaffAccountListPage'
import CreateStaffAccountPage from './CreateStaffAccountPage'
import { createStaffAccount, getStaffAccounts } from '../../services/staffAccountService'
import { getAllTechnicians } from '../../services/dispatchService'

vi.mock('../../services/staffAccountService', () => ({
  getStaffAccounts: vi.fn(),
  createStaffAccount: vi.fn(),
  staffAccountError: vi.fn((err: unknown) => (err instanceof Error ? err.message : 'Staff account creation failed.')),
}))

vi.mock('../../services/dispatchService', () => ({
  getAllTechnicians: vi.fn(),
}))

const getStaffAccountsMock = vi.mocked(getStaffAccounts)
const createStaffAccountMock = vi.mocked(createStaffAccount)
const getAllTechniciansMock = vi.mocked(getAllTechnicians)

const sampleActiveAccount = {
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

const sampleInactiveAccount = {
  id: 'acc-2',
  fullName: 'Kamal Jayawardena',
  username: 'kamal.j',
  email: 'kamal@assms.com',
  role: 'Dispatcher',
  status: 'INACTIVE',
  technicianId: null,
  createdAt: '2026-09-01T10:00:00Z',
  createdBy: null,
}

const sampleTechAccount = {
  id: 'acc-3',
  fullName: 'Amal Silva',
  username: 'amal.tech',
  email: 'amal@assms.com',
  role: 'Technician',
  status: 'ACTIVE',
  technicianId: 'tech-uuid-1',
  createdAt: '2026-10-10T10:00:00Z',
  createdBy: 'mgr-1',
}

const mockTechnicians = [
  {
    id: 'tech-uuid-1',
    reference: 'TEC-001',
    fullName: 'Amal Silva',
    region: 'WESTERN' as const,
    status: 'ACTIVE' as const,
    skills: ['Electrical'],
    phone: '0771112233',
    email: 'amal@assms.com',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
]

describe('Staff Account Pages', () => {
  beforeEach(() => {
    getStaffAccountsMock.mockReset()
    createStaffAccountMock.mockReset()
    getAllTechniciansMock.mockReset()
    getAllTechniciansMock.mockResolvedValue(mockTechnicians)
  })
  afterEach(() => cleanup())

  it('renders staff accounts table with role and status badges, and metadata', async () => {
    getStaffAccountsMock.mockResolvedValue([sampleActiveAccount, sampleInactiveAccount, sampleTechAccount])
    render(
      <MemoryRouter>
        <StaffAccountListPage />
      </MemoryRouter>
    )

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Kasun Bandara')).toBeInTheDocument()
    expect(within(table).getByText('kasun.b')).toBeInTheDocument()
    expect(within(table).getByText('Agent')).toBeInTheDocument()
    expect(within(table).getAllByText('ACTIVE')).toHaveLength(2)

    expect(within(table).getByText('Kamal Jayawardena')).toBeInTheDocument()
    expect(within(table).getByText('Dispatcher')).toBeInTheDocument()
    expect(within(table).getByText('INACTIVE')).toBeInTheDocument()

    // Verifies linked technician reference display
    expect(within(table).getByText('TEC-001')).toBeInTheDocument()
  })

  it('filters staff accounts by status', async () => {
    getStaffAccountsMock.mockResolvedValue([sampleActiveAccount, sampleInactiveAccount])
    render(
      <MemoryRouter>
        <StaffAccountListPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Kasun Bandara')).toBeInTheDocument()
    expect(screen.getByText('Kamal Jayawardena')).toBeInTheDocument()

    // Filter to INACTIVE
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'INACTIVE' } })
    expect(screen.queryByText('Kasun Bandara')).not.toBeInTheDocument()
    expect(screen.getByText('Kamal Jayawardena')).toBeInTheDocument()

    // Filter to ACTIVE
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'ACTIVE' } })
    expect(screen.getByText('Kasun Bandara')).toBeInTheDocument()
    expect(screen.queryByText('Kamal Jayawardena')).not.toBeInTheDocument()
  })

  it('filters staff accounts by search query', async () => {
    getStaffAccountsMock.mockResolvedValue([sampleActiveAccount, sampleInactiveAccount])
    render(
      <MemoryRouter>
        <StaffAccountListPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Kasun Bandara')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Search name, username or email'), {
      target: { value: 'kamal' },
    })
    expect(screen.queryByText('Kasun Bandara')).not.toBeInTheDocument()
    expect(screen.getByText('Kamal Jayawardena')).toBeInTheDocument()
  })

  it('displays empty state and allows clearing filters', async () => {
    getStaffAccountsMock.mockResolvedValue([sampleActiveAccount])
    render(
      <MemoryRouter>
        <StaffAccountListPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Kasun Bandara')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Search name, username or email'), {
      target: { value: 'nonexistent' },
    })
    expect(await screen.findByText('No staff accounts match these filters')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByText('Kasun Bandara')).toBeInTheDocument()
  })

  it('displays empty state when no accounts exist at all', async () => {
    getStaffAccountsMock.mockResolvedValue([])
    render(
      <MemoryRouter>
        <StaffAccountListPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('No staff accounts found')).toBeInTheDocument()
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
      ...sampleActiveAccount,
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
