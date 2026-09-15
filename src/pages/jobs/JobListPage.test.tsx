import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import JobListPage from './JobListPage'
import { getJobs } from '../../services/jobService'

vi.mock('../../services/jobService', () => ({ getJobs: vi.fn() }))

const getJobsMock = vi.mocked(getJobs)
const technicianId = 'af5d2057-6646-4322-afce-b4b026a90aba'
const assignedJob = {
  id: 'job-1',
  jobReference: 'JOB-1ARDN1',
  customerId: 'customer-1',
  assetId: 'asset-1',
  serviceCategory: 'REPAIR' as const,
  problemDescription: 'Air conditioner is not cooling.',
  priority: 'MEDIUM' as const,
  region: 'WESTERN' as const,
  scheduledDate: null,
  createdBy: '00000000-0000-0000-0000-000000000000',
  status: 'ASSIGNED',
  assignment: {
    id: 'assignment-1',
    technicianId,
    technicianReference: 'TEC-032',
    assignedAt: '2026-09-15T10:30:00Z',
  },
  createdAt: '2026-09-15T10:00:00Z',
  updatedAt: '2026-09-15T10:30:00Z',
}

describe('Job list', () => {
  beforeEach(() => getJobsMock.mockReset())
  afterEach(() => cleanup())

  it('shows the locally synchronized assignment context', async () => {
    getJobsMock.mockResolvedValue([assignedJob])
    render(<MemoryRouter><JobListPage /></MemoryRouter>)

    expect(await screen.findByRole('link', { name: 'JOB-1ARDN1' })).toBeInTheDocument()
    expect(screen.getByText('ASSIGNED')).toBeInTheDocument()
    expect(screen.getByText('TEC-032')).toBeInTheDocument()
  })

  it('applies status and technician filters together', async () => {
    getJobsMock.mockResolvedValue([])
    render(<MemoryRouter><JobListPage /></MemoryRouter>)

    await screen.findByText('No jobs match these filters')
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'ASSIGNED' } })
    fireEvent.change(screen.getByLabelText('Assigned technician ID'), { target: { value: technicianId } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }))

    await waitFor(() => expect(getJobsMock).toHaveBeenLastCalledWith({
      status: 'ASSIGNED',
      assignedTechnicianId: technicianId,
    }))
  })

  it('explains an empty valid-filter result', async () => {
    getJobsMock.mockResolvedValue([])
    render(<MemoryRouter initialEntries={['/jobs?status=CREATED']}><JobListPage /></MemoryRouter>)

    expect(await screen.findByText('No jobs match these filters')).toBeInTheDocument()
    expect(screen.getByText('Try a different status or clear the assigned technician filter.')).toBeInTheDocument()
  })
})
