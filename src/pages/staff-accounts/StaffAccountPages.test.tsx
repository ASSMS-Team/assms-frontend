import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import StaffAccountListPage from './StaffAccountListPage'
import CreateStaffAccountPage from './CreateStaffAccountPage'
import { createStaffAccount, deactivateStaffAccount, getStaffAccounts, type StaffAccountResponse } from '../../services/staffAccountService'
import { getAllTechnicians } from '../../services/dispatchService'

vi.mock('../../auth/useAuth', () => ({
  useAuth: vi.fn(() => ({
    staff: {
      id: 'mgr-current',
      username: 'manager.john',
      email: 'manager@assms.com',
      role: 'Manager' as const,
    },
    isAuthenticated: true,
    signIn: vi.fn(),
    signOut: vi.fn(),
    hasRole: vi.fn(() => true),
  })),
}))

vi.mock('../../services/staffAccountService', () => ({
  getStaffAccounts: vi.fn(),
  createStaffAccount: vi.fn(),
  deactivateStaffAccount: vi.fn(),
  staffAccountError: vi.fn((err: unknown) => (err instanceof Error ? err.message : 'Staff account operation failed.')),
}))

vi.mock('../../services/dispatchService', () => ({
  getAllTechnicians: vi.fn(),
}))

const getStaffAccountsMock = vi.mocked(getStaffAccounts)
const createStaffAccountMock = vi.mocked(createStaffAccount)
const deactivateStaffAccountMock = vi.mocked(deactivateStaffAccount)
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
    deactivateStaffAccountMock.mockReset()
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

    fireEvent.change(screen.getByPlaceholderText('Search by name, username or email'), {
      target: { value: 'kamal' },
    })
    expect(screen.queryByText('Kasun Bandara')).not.toBeInTheDocument()
    expect(screen.getByText('Kamal Jayawardena')).toBeInTheDocument()
  })

  it('preserves complete typed input during rapid character entry without dropping keystrokes', async () => {
    getStaffAccountsMock.mockResolvedValue([sampleActiveAccount, sampleInactiveAccount])
    render(
      <MemoryRouter>
        <StaffAccountListPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Kasun Bandara')).toBeInTheDocument()
    const searchInput = screen.getByPlaceholderText('Search by name, username or email') as HTMLInputElement

    // Simulate rapid keystroke sequence
    const rapidSequence = ['q', 'qa', 'qa.', 'qa.r', 'qa.ra', 'qa.rap', 'qa.rapi', 'qa.rapid', 'qa.rapid.4faf199e']
    for (const val of rapidSequence) {
      fireEvent.change(searchInput, { target: { value: val } })
    }

    expect(searchInput.value).toBe('qa.rapid.4faf199e')
  })

  it('displays empty state and allows clearing filters', async () => {
    getStaffAccountsMock.mockResolvedValue([sampleActiveAccount])
    render(
      <MemoryRouter>
        <StaffAccountListPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Kasun Bandara')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Search by name, username or email'), {
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

  it('renders Deactivate button for active accounts and Deactivated label for inactive accounts', async () => {
    getStaffAccountsMock.mockResolvedValue([sampleActiveAccount, sampleInactiveAccount])
    render(
      <MemoryRouter>
        <StaffAccountListPage />
      </MemoryRouter>
    )

    const table = await screen.findByRole('table')
    const activeRow = within(table).getByText('Kasun Bandara').closest('tr')!
    const inactiveRow = within(table).getByText('Kamal Jayawardena').closest('tr')!

    expect(within(activeRow).getByRole('button', { name: 'Deactivate' })).toBeEnabled()
    expect(within(inactiveRow).getByText('Deactivated')).toBeInTheDocument()
    expect(within(inactiveRow).queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument()
  })

  it('disables Deactivate button for the currently authenticated Manager (self-deactivation safety)', async () => {
    const currentManagerAccount = {
      id: 'mgr-current',
      fullName: 'John Manager',
      username: 'manager.john',
      email: 'manager@assms.com',
      role: 'Manager',
      status: 'ACTIVE',
      technicianId: null,
      createdAt: '2026-09-01T10:00:00Z',
      createdBy: null,
    }

    getStaffAccountsMock.mockResolvedValue([currentManagerAccount, sampleActiveAccount])
    render(
      <MemoryRouter>
        <StaffAccountListPage />
      </MemoryRouter>
    )

    const table = await screen.findByRole('table')
    const managerRow = within(table).getByText('John Manager').closest('tr')!

    expect(within(managerRow).getByText('You')).toBeInTheDocument()
    const deactivateBtn = within(managerRow).getByRole('button', { name: 'Deactivate' })
    expect(deactivateBtn).toBeDisabled()
    expect(deactivateBtn).toHaveAttribute('title', 'You cannot deactivate your own account')
  })

  it('does not deactivate if the confirmation dialog is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    getStaffAccountsMock.mockResolvedValue([sampleActiveAccount])
    render(
      <MemoryRouter>
        <StaffAccountListPage />
      </MemoryRouter>
    )

    const table = await screen.findByRole('table')
    const deactivateBtn = within(table).getByRole('button', { name: 'Deactivate' })
    fireEvent.click(deactivateBtn)

    expect(confirmSpy).toHaveBeenCalled()
    expect(deactivateStaffAccountMock).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('successfully deactivates active account upon confirmation and updates status to INACTIVE', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    getStaffAccountsMock.mockResolvedValue([sampleActiveAccount])
    deactivateStaffAccountMock.mockResolvedValue({
      ...sampleActiveAccount,
      status: 'INACTIVE',
    })

    render(
      <MemoryRouter>
        <StaffAccountListPage />
      </MemoryRouter>
    )

    const table = await screen.findByRole('table')
    const deactivateBtn = within(table).getByRole('button', { name: 'Deactivate' })
    fireEvent.click(deactivateBtn)

    await waitFor(() => {
      expect(deactivateStaffAccountMock).toHaveBeenCalledWith('acc-1')
    })

    expect(await screen.findByRole('status')).toHaveTextContent(/Successfully deactivated "Kasun Bandara"/i)

    // Verify row now shows INACTIVE and "Deactivated" badge instead of button
    const row = within(table).getByText('Kasun Bandara').closest('tr')!
    expect(within(row).getByText('INACTIVE')).toBeInTheDocument()
    expect(within(row).getByText('Deactivated')).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument()

    confirmSpy.mockRestore()
  })

  it('displays error alert when deactivation fails', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    getStaffAccountsMock.mockResolvedValue([sampleActiveAccount])
    deactivateStaffAccountMock.mockRejectedValue(
      new Error('Cannot deactivate the only active Manager account.')
    )

    render(
      <MemoryRouter>
        <StaffAccountListPage />
      </MemoryRouter>
    )

    const table = await screen.findByRole('table')
    const deactivateBtn = within(table).getByRole('button', { name: 'Deactivate' })
    fireEvent.click(deactivateBtn)

    await waitFor(() => {
      expect(deactivateStaffAccountMock).toHaveBeenCalledWith('acc-1')
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot deactivate the only active Manager account.'
    )
    confirmSpy.mockRestore()
  })

  it('shows warning alert and Retry sync button when technician deactivation Dispatch sync is pending retry', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const technicianAccount: StaffAccountResponse = {
      id: 'tech-1',
      fullName: 'Amal Silva',
      username: 'amal.tech',
      email: 'amal@assms.lk',
      role: 'Technician',
      status: 'ACTIVE',
      technicianId: 'tech-uuid-1',
      createdAt: '2026-03-01T10:00:00Z',
      createdBy: 'acc-1',
    }

    getStaffAccountsMock.mockResolvedValue([technicianAccount])
    deactivateStaffAccountMock.mockResolvedValue({
      ...technicianAccount,
      status: 'INACTIVE',
      dispatchSyncStatus: 'PENDING_RETRY',
    })

    render(
      <MemoryRouter>
        <StaffAccountListPage />
      </MemoryRouter>
    )

    const table = await screen.findByRole('table')
    const deactivateBtn = within(table).getByRole('button', { name: 'Deactivate' })
    fireEvent.click(deactivateBtn)

    await waitFor(() => {
      expect(deactivateStaffAccountMock).toHaveBeenCalledWith('tech-1')
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(/Dispatch technician synchronization is pending retry/i)

    // Verify row now shows Sync pending badge and Retry sync button
    const row = within(table).getByText('Amal Silva').closest('tr')!
    expect(within(row).getByText('Sync pending')).toBeInTheDocument()
    const retryBtn = within(row).getByRole('button', { name: 'Retry sync' })
    expect(retryBtn).toBeInTheDocument()

    // Test clicking retry sync calls deactivateStaffAccount again
    deactivateStaffAccountMock.mockResolvedValueOnce({
      ...technicianAccount,
      status: 'INACTIVE',
      dispatchSyncStatus: 'SYNCHRONIZED',
    })
    fireEvent.click(retryBtn)
    await waitFor(() => {
      expect(deactivateStaffAccountMock).toHaveBeenCalledWith('tech-1')
    })
    expect(await screen.findByRole('status')).toHaveTextContent(/linked Dispatch technician has been marked inactive/i)

    confirmSpy.mockRestore()
  })

  it('displays service error and Retry button when loading staff accounts fails, and allows retrying', async () => {
    getStaffAccountsMock.mockRejectedValueOnce(new Error('Could not connect to the service. Please check your network connection and try again.'))
    render(
      <MemoryRouter>
        <StaffAccountListPage />
      </MemoryRouter>
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not connect to the service/i)
    const retryBtn = screen.getByRole('button', { name: 'Retry' })
    expect(retryBtn).toBeInTheDocument()

    // Test clicking Retry
    let resolveRetry!: (accounts: StaffAccountResponse[]) => void
    getStaffAccountsMock.mockReturnValueOnce(new Promise((resolve) => { resolveRetry = resolve }))
    fireEvent.click(retryBtn)

    expect(screen.getByText('Loading staff accounts…')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()

    await act(async () => { resolveRetry([sampleActiveAccount]) })

    expect(await screen.findByText('Kasun Bandara')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('displays duplicate conflict error and never fabricates created success when creation is rejected', async () => {
    createStaffAccountMock.mockRejectedValueOnce(new Error('The username, email or technician link is already in use.'))
    render(
      <MemoryRouter>
        <CreateStaffAccountPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Duplicate User' } })
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'duplicate.user' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'duplicate@assms.com' } })
    fireEvent.change(screen.getByLabelText('Initial password'), { target: { value: 'ValidPassword123!' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'ValidPassword123!' } })

    fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/The username, email or technician link is already in use/i)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText(/Created Duplicate User/i)).not.toBeInTheDocument()
  })
})
