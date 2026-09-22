import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

import JobDetailPage from './JobDetailPage'
import { getJobById, startJob } from '../../services/jobService'
import { AuthContext } from '../../auth/authContext'
import type { JobResponse } from '../../types/job'

vi.mock('../../services/jobService', () => ({
  getJobById: vi.fn(),
  startJob: vi.fn(),
}))

const getJobByIdMock = vi.mocked(getJobById)
const startJobMock = vi.mocked(startJob)

const technicianId = 'af5d2057-6646-4322-afce-b4b026a90aba'

const assignedJob: JobResponse = {
  id: 'job-1',
  jobReference: 'JOB-1ARDN1',
  customerId: 'customer-1',
  assetId: 'asset-1',
  serviceCategory: 'REPAIR',
  problemDescription: 'Air conditioner is not cooling.',
  priority: 'MEDIUM',
  region: 'WESTERN',
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

const authContextValue = {
  staff: {
    id: technicianId,
    username: 'tech1',
    email: 'tech1@example.com',
    role: 'Technician' as const,
  },
  isAuthenticated: true,
  signIn: vi.fn(),
  signOut: vi.fn(),
  hasRole: vi.fn((...roles: string[]) => roles.includes('Technician')),
}

function renderWithRouter(jobId = 'job-1', auth = authContextValue) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[`/jobs/${jobId}`]}>
        <Routes>
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/jobs" element={<div>Jobs page</div>} />
          <Route path="/my-jobs" element={<div>My jobs page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

function createAxiosError(status: number, data: unknown = {}) {
  const error = new AxiosError(
    `Request failed with status code ${status}`,
    String(status),
    {} as InternalAxiosRequestConfig,
    {},
    {
      status,
      statusText: String(status),
      data,
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    } as AxiosResponse,
  )
  return error
}

describe('JobDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders job details and displays the Start Job button for assigned job', async () => {
    getJobByIdMock.mockResolvedValue(assignedJob)

    renderWithRouter()

    expect(await screen.findByText('JOB-1ARDN1')).toBeInTheDocument()
    expect(screen.getByText('ASSIGNED')).toBeInTheDocument()
    expect(screen.getByText(/TEC-032/)).toBeInTheDocument()
    expect(screen.getByText('Air conditioner is not cooling.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Job' })).toBeInTheDocument()
  })

  it('does not display the Start Job button if job is already IN_PROGRESS', async () => {
    const inProgressJob: JobResponse = {
      ...assignedJob,
      status: 'IN_PROGRESS',
      startedAt: '2026-09-15T11:00:00Z',
    }
    getJobByIdMock.mockResolvedValue(inProgressJob)

    renderWithRouter()

    expect(await screen.findByText('JOB-1ARDN1')).toBeInTheDocument()
    expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start Job' })).not.toBeInTheDocument()
    expect(screen.getByText('Started at')).toBeInTheDocument()
  })

  it('successfully starts the job on click, moving it to IN_PROGRESS and showing Started at', async () => {
    getJobByIdMock.mockResolvedValue(assignedJob)
    const updatedJob: JobResponse = {
      ...assignedJob,
      status: 'IN_PROGRESS',
      startedAt: '2026-09-15T11:00:00Z',
    }
    startJobMock.mockResolvedValue(updatedJob)

    renderWithRouter()

    const startButton = await screen.findByRole('button', { name: 'Start Job' })
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(startJobMock).toHaveBeenCalledWith('job-1', technicianId)
    })

    expect(
      await screen.findByText('Job started successfully and is now in progress.'),
    ).toBeInTheDocument()
    expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument()
    expect(screen.getByText('Started at')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start Job' })).not.toBeInTheDocument()
  })

  it('displays forbidden error when non-assignee starts the job (403)', async () => {
    getJobByIdMock.mockResolvedValue(assignedJob)
    startJobMock.mockRejectedValue(createAxiosError(403))

    renderWithRouter()

    const startButton = await screen.findByRole('button', { name: 'Start Job' })
    fireEvent.click(startButton)

    expect(
      await screen.findByText(/Only the assigned technician can start this job/),
    ).toBeInTheDocument()
  })

  it('displays conflict error when transition is invalid (409)', async () => {
    getJobByIdMock.mockResolvedValue(assignedJob)
    startJobMock.mockRejectedValue(createAxiosError(409))

    renderWithRouter()

    const startButton = await screen.findByRole('button', { name: 'Start Job' })
    fireEvent.click(startButton)

    expect(
      await screen.findByText(/Job cannot be started because it is not in ASSIGNED status/),
    ).toBeInTheDocument()
  })
})
