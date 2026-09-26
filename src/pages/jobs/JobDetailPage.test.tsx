import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthContext } from '../../auth/authContext'
import {
  addWorkRecord,
  getJobById,
  getWorkRecords,
  startJob,
  updateWorkRecord,
} from '../../services/jobService'
import type { JobResponse, ServiceWorkRecordResponse } from '../../types/job'
import JobDetailPage from './JobDetailPage'

vi.mock('../../services/jobService', () => ({
  addWorkRecord: vi.fn(),
  getJobById: vi.fn(),
  getWorkRecords: vi.fn(),
  startJob: vi.fn(),
  updateWorkRecord: vi.fn(),
}))

const getJobByIdMock = vi.mocked(getJobById)
const getWorkRecordsMock = vi.mocked(getWorkRecords)
const startJobMock = vi.mocked(startJob)
const addWorkRecordMock = vi.mocked(addWorkRecord)
const updateWorkRecordMock = vi.mocked(updateWorkRecord)

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

const inProgressJob: JobResponse = {
  ...assignedJob,
  status: 'IN_PROGRESS',
  startedAt: '2026-09-15T11:00:00Z',
}

const completedJob: JobResponse = {
  ...inProgressJob,
  status: 'COMPLETED',
}

const sampleWorkRecord: ServiceWorkRecordResponse = {
  id: 'record-1',
  jobId: 'job-1',
  jobReference: 'JOB-1ARDN1',
  technicianId,
  technicianReference: 'TEC-032',
  content: 'Checked coolant levels and tightened valves.',
  recordedAt: '2026-09-15T11:30:00Z',
  createdAt: '2026-09-15T11:30:00Z',
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

function renderWithRouter(auth = authContextValue) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/jobs/job-1']}>
        <Routes>
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/jobs" element={<div>Jobs page</div>} />
          <Route path="/my-jobs" element={<div>My jobs page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

function createAxiosError(status: number) {
  return new AxiosError(
    `Request failed with status code ${status}`,
    String(status),
    {} as InternalAxiosRequestConfig,
    {},
    {
      status,
      statusText: String(status),
      data: {},
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    } as AxiosResponse,
  )
}

describe('JobDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getWorkRecordsMock.mockResolvedValue([])
  })

  afterEach(() => cleanup())

  it('renders assigned job details and allows the technician to start the job', async () => {
    getJobByIdMock.mockResolvedValue(assignedJob)

    renderWithRouter()

    expect(await screen.findByText('JOB-1ARDN1')).toBeInTheDocument()
    expect(screen.getByText('ASSIGNED')).toBeInTheDocument()
    expect(screen.getByText(/TEC-032/)).toBeInTheDocument()
    expect(screen.getByText('Air conditioner is not cooling.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Job' })).toBeInTheDocument()
  })

  it('shows existing work records and hides Start Job while a job is in progress', async () => {
    getJobByIdMock.mockResolvedValue(inProgressJob)
    getWorkRecordsMock.mockResolvedValue([sampleWorkRecord])

    renderWithRouter()

    expect(await screen.findByText('Service Work Records')).toBeInTheDocument()
    expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start Job' })).not.toBeInTheDocument()
    expect(screen.getByText('Started at')).toBeInTheDocument()
    expect(screen.getByText(sampleWorkRecord.content)).toBeInTheDocument()
  })

  it('shows completed job work records without edit controls', async () => {
    getJobByIdMock.mockResolvedValue(completedJob)
    getWorkRecordsMock.mockResolvedValue([sampleWorkRecord])

    renderWithRouter()

    expect(await screen.findByText('Service Work Records')).toBeInTheDocument()
    expect(screen.getByText(sampleWorkRecord.content)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add Work Record' })).not.toBeInTheDocument()
  })

  it('starts the assigned job and displays the updated state', async () => {
    getJobByIdMock.mockResolvedValue(assignedJob)
    startJobMock.mockResolvedValue(inProgressJob)

    renderWithRouter()
    fireEvent.click(await screen.findByRole('button', { name: 'Start Job' }))

    await waitFor(() => expect(startJobMock).toHaveBeenCalledWith('job-1', technicianId))
    expect(await screen.findByText('Job started successfully and is now in progress.')).toBeInTheDocument()
    expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument()
  })

  it('shows a forbidden error when a non-assignee starts the job', async () => {
    getJobByIdMock.mockResolvedValue(assignedJob)
    startJobMock.mockRejectedValue(createAxiosError(403))

    renderWithRouter()
    fireEvent.click(await screen.findByRole('button', { name: 'Start Job' }))

    expect(await screen.findByText(/Only the assigned technician can start this job/)).toBeInTheDocument()
  })

  it('shows a conflict error when the job cannot be started', async () => {
    getJobByIdMock.mockResolvedValue(assignedJob)
    startJobMock.mockRejectedValue(createAxiosError(409))

    renderWithRouter()
    fireEvent.click(await screen.findByRole('button', { name: 'Start Job' }))

    expect(await screen.findByText(/Job cannot be started because it is not in ASSIGNED status/)).toBeInTheDocument()
  })

  it('adds a work record and displays it in the list', async () => {
    getJobByIdMock.mockResolvedValue(inProgressJob)
    addWorkRecordMock.mockResolvedValue(sampleWorkRecord)

    renderWithRouter()
    fireEvent.change(await screen.findByLabelText('Record Work Performed'), {
      target: { value: sampleWorkRecord.content },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Work Record' }))

    await waitFor(() => {
      expect(addWorkRecordMock).toHaveBeenCalledWith('job-1', {
        technicianId,
        content: sampleWorkRecord.content,
      })
    })
    expect(await screen.findByText('Work record added successfully.')).toBeInTheDocument()
    expect(screen.getByText(sampleWorkRecord.content)).toBeInTheDocument()
  })

  it('rejects an empty work record', async () => {
    getJobByIdMock.mockResolvedValue(inProgressJob)

    renderWithRouter()
    fireEvent.click(await screen.findByRole('button', { name: 'Add Work Record' }))

    expect(await screen.findByText('Work record content is required.')).toBeInTheDocument()
    expect(addWorkRecordMock).not.toHaveBeenCalled()
  })

  it('shows a forbidden error if the technician cannot add a work record', async () => {
    getJobByIdMock.mockResolvedValue(inProgressJob)
    addWorkRecordMock.mockRejectedValue(createAxiosError(403))

    renderWithRouter()
    fireEvent.change(await screen.findByLabelText('Record Work Performed'), {
      target: { value: 'Inspected the unit.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Work Record' }))

    expect(await screen.findByText(/Only the active assignee can add work records/)).toBeInTheDocument()
  })

  it('edits a work record and updates the displayed content', async () => {
    getJobByIdMock.mockResolvedValue(inProgressJob)
    getWorkRecordsMock.mockResolvedValue([sampleWorkRecord])
    const updatedRecord = { ...sampleWorkRecord, content: 'Updated work notes.' }
    updateWorkRecordMock.mockResolvedValue(updatedRecord)

    renderWithRouter()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Edit Work Performed'), {
      target: { value: updatedRecord.content },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(updateWorkRecordMock).toHaveBeenCalledWith('job-1', sampleWorkRecord.id, {
        technicianId,
        content: updatedRecord.content,
      })
    })
    expect(await screen.findByText('Work record updated successfully.')).toBeInTheDocument()
    expect(screen.getByText(updatedRecord.content)).toBeInTheDocument()
  })

  it('allows cancelling a work record edit without submitting', async () => {
    getJobByIdMock.mockResolvedValue(inProgressJob)
    getWorkRecordsMock.mockResolvedValue([sampleWorkRecord])

    renderWithRouter()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Edit Work Performed'), {
      target: { value: 'Discard this change.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(updateWorkRecordMock).not.toHaveBeenCalled()
    expect(screen.getByText(sampleWorkRecord.content)).toBeInTheDocument()
    expect(screen.queryByLabelText('Edit Work Performed')).not.toBeInTheDocument()
  })

  it('shows a forbidden error when updating a work record is not allowed', async () => {
    getJobByIdMock.mockResolvedValue(inProgressJob)
    getWorkRecordsMock.mockResolvedValue([sampleWorkRecord])
    updateWorkRecordMock.mockRejectedValue(createAxiosError(403))

    renderWithRouter()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Edit Work Performed'), {
      target: { value: 'Updated notes.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/Only the active assignee can update work records/)).toBeInTheDocument()
  })
})
