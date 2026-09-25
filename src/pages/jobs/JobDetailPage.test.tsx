import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

import JobDetailPage from './JobDetailPage'
<<<<<<< Updated upstream
import { getJobById, startJob } from '../../services/jobService'
import { AuthContext } from '../../auth/authContext'
import type { JobResponse } from '../../types/job'
=======
import { addWorkRecord, getJobById, getWorkRecords, startJob, updateWorkRecord } from '../../services/jobService'
import { AuthContext } from '../../auth/authContext'
import type { JobResponse, ServiceWorkRecordResponse } from '../../types/job'
>>>>>>> Stashed changes

vi.mock('../../services/jobService', () => ({
  getJobById: vi.fn(),
  startJob: vi.fn(),
<<<<<<< Updated upstream
=======
  addWorkRecord: vi.fn(),
  getWorkRecords: vi.fn(),
  updateWorkRecord: vi.fn(),
>>>>>>> Stashed changes
}))

const getJobByIdMock = vi.mocked(getJobById)
const startJobMock = vi.mocked(startJob)
<<<<<<< Updated upstream
=======
const addWorkRecordMock = vi.mocked(addWorkRecord)
const getWorkRecordsMock = vi.mocked(getWorkRecords)
const updateWorkRecordMock = vi.mocked(updateWorkRecord)
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
=======
const inProgressJob: JobResponse = {
  ...assignedJob,
  status: 'IN_PROGRESS',
  startedAt: '2026-09-15T11:00:00Z',
}

const sampleWorkRecord: ServiceWorkRecordResponse = {
  id: 'rec-1',
  jobId: 'job-1',
  jobReference: 'JOB-1ARDN1',
  technicianId,
  technicianReference: 'TEC-032',
  content: 'Checked coolant levels and tightened valves.',
  recordedAt: '2026-09-15T11:30:00Z',
  createdAt: '2026-09-15T11:30:00Z',
}

>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
  const error = new AxiosError(
=======
  return new AxiosError(
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
  return error
=======
>>>>>>> Stashed changes
}

describe('JobDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
<<<<<<< Updated upstream
=======
    getWorkRecordsMock.mockResolvedValue([])
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  it('does not display the Start Job button if job is already IN_PROGRESS', async () => {
    const inProgressJob: JobResponse = {
      ...assignedJob,
      status: 'IN_PROGRESS',
      startedAt: '2026-09-15T11:00:00Z',
    }
    getJobByIdMock.mockResolvedValue(inProgressJob)
=======
  it('does not display Start Job button when job is IN_PROGRESS, but shows Service Work Records', async () => {
    getJobByIdMock.mockResolvedValue(inProgressJob)
    getWorkRecordsMock.mockResolvedValue([sampleWorkRecord])
>>>>>>> Stashed changes

    renderWithRouter()

    expect(await screen.findByText('JOB-1ARDN1')).toBeInTheDocument()
    expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start Job' })).not.toBeInTheDocument()
    expect(screen.getByText('Started at')).toBeInTheDocument()
<<<<<<< Updated upstream
  })

  it('successfully starts the job on click, moving it to IN_PROGRESS and showing Started at', async () => {
    getJobByIdMock.mockResolvedValue(assignedJob)
    const updatedJob: JobResponse = {
      ...assignedJob,
      status: 'IN_PROGRESS',
      startedAt: '2026-09-15T11:00:00Z',
    }
    startJobMock.mockResolvedValue(updatedJob)
=======

    // Service work records section
    expect(await screen.findByText('Service Work Records')).toBeInTheDocument()
    expect(screen.getByText('Checked coolant levels and tightened valves.')).toBeInTheDocument()
  })

  it('successfully starts the job and switches to IN_PROGRESS', async () => {
    getJobByIdMock.mockResolvedValue(assignedJob)
    startJobMock.mockResolvedValue(inProgressJob)
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
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
=======
  })

  it('allows active technician to add a service work record on in-progress job', async () => {
    getJobByIdMock.mockResolvedValue(inProgressJob)
    getWorkRecordsMock.mockResolvedValue([])
    addWorkRecordMock.mockResolvedValue(sampleWorkRecord)

    renderWithRouter()

    expect(await screen.findByText('Service Work Records')).toBeInTheDocument()

    const textarea = screen.getByLabelText('Record Work Performed')
    fireEvent.change(textarea, { target: { value: 'Checked coolant levels and tightened valves.' } })

    const submitBtn = screen.getByRole('button', { name: 'Add Work Record' })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(addWorkRecordMock).toHaveBeenCalledWith('job-1', {
        technicianId,
        content: 'Checked coolant levels and tightened valves.',
      })
    })

    expect(await screen.findByText('Work record added successfully.')).toBeInTheDocument()
    expect(screen.getByText('Checked coolant levels and tightened valves.')).toBeInTheDocument()
  })

  it('rejects submitting empty work record content with validation error', async () => {
    getJobByIdMock.mockResolvedValue(inProgressJob)
    getWorkRecordsMock.mockResolvedValue([])

    renderWithRouter()

    expect(await screen.findByText('Service Work Records')).toBeInTheDocument()

    const submitBtn = screen.getByRole('button', { name: 'Add Work Record' })
    fireEvent.click(submitBtn)

    expect(await screen.findByText('Work record content is required.')).toBeInTheDocument()
    expect(addWorkRecordMock).not.toHaveBeenCalled()
  })

  it('displays forbidden error when non-assignee attempts to add work record', async () => {
    getJobByIdMock.mockResolvedValue(inProgressJob)
    getWorkRecordsMock.mockResolvedValue([])
    addWorkRecordMock.mockRejectedValue(createAxiosError(403))

    renderWithRouter()

    const textarea = await screen.findByLabelText('Record Work Performed')
    fireEvent.change(textarea, { target: { value: 'Some work' } })

    const submitBtn = screen.getByRole('button', { name: 'Add Work Record' })
    fireEvent.click(submitBtn)

    expect(
      await screen.findByText(/Only the active assignee can add work records to this job/),
>>>>>>> Stashed changes
    ).toBeInTheDocument()
  })

  it('allows active technician to edit a service work record', async () => {
    getJobByIdMock.mockResolvedValue(inProgressJob)
    getWorkRecordsMock.mockResolvedValue([sampleWorkRecord])
    
    const updatedRecord = { ...sampleWorkRecord, content: 'Updated content' }
    updateWorkRecordMock.mockResolvedValue(updatedRecord)

    renderWithRouter()

    const editBtn = await screen.findByRole('button', { name: 'Edit' })
    fireEvent.click(editBtn)

    const textarea = await screen.findByLabelText('Edit Work Performed')
    expect(textarea).toHaveValue(sampleWorkRecord.content)
    
    fireEvent.change(textarea, { target: { value: 'Updated content' } })
    
    const saveBtn = screen.getByRole('button', { name: 'Save' })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(updateWorkRecordMock).toHaveBeenCalledWith('job-1', 'rec-1', {
        technicianId,
        content: 'Updated content',
      })
    })

    expect(await screen.findByText('Work record updated successfully.')).toBeInTheDocument()
    expect(screen.getByText('Updated content')).toBeInTheDocument()
  })
})
