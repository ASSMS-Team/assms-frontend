import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import MyJobsPage from './MyJobsPage'
import { getMyAssignments } from '../../services/dispatchService'
import type { MyAssignmentResponse } from '../../types/assignment'

vi.mock('../../services/dispatchService', () => ({ getMyAssignments: vi.fn() }))

const getMyAssignmentsMock = vi.mocked(getMyAssignments)

const assignment: MyAssignmentResponse = {
  assignmentId: 'assign-1',
  jobId: 'job-abc',
  jobReference: 'JOB-ABC123',
  jobStatus: 'ASSIGNED',
  assignedAt: '2026-09-15T10:30:00Z',
}

describe('My jobs page', () => {
  beforeEach(() => getMyAssignmentsMock.mockReset())
  afterEach(() => cleanup())

  it('shows the assigned job list when assignments are returned', async () => {
    getMyAssignmentsMock.mockResolvedValue([assignment])
    render(<MemoryRouter><MyJobsPage /></MemoryRouter>)

    expect(await screen.findByRole('link', { name: 'JOB-ABC123' })).toBeInTheDocument()
    expect(screen.getByText('ASSIGNED')).toBeInTheDocument()
  })

  it('shows empty state when no assignments are returned', async () => {
    getMyAssignmentsMock.mockResolvedValue([])
    render(<MemoryRouter><MyJobsPage /></MemoryRouter>)

    expect(await screen.findByText('No jobs assigned')).toBeInTheDocument()
    expect(screen.getByText('You have no active assignments right now. Check back later.')).toBeInTheDocument()
  })

  it('shows an error message when the service call fails', async () => {
    getMyAssignmentsMock.mockRejectedValueOnce(new Error('service unavailable'))
    render(<MemoryRouter><MyJobsPage /></MemoryRouter>)

    const alert = await screen.findByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Could not load your assignments. Please try again.')
  })

  it('explains missing technician provisioning instead of reporting a connection failure', async () => {
    getMyAssignmentsMock.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
    render(<MemoryRouter><MyJobsPage /></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('not linked to a Dispatch technician record')
    expect(screen.getByText('Technician profile setup required')).toBeInTheDocument()
    expect(screen.queryByText('No jobs assigned')).not.toBeInTheDocument()
  })

  it('distinguishes permission failures from missing profiles', async () => {
    getMyAssignmentsMock.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } })
    render(<MemoryRouter><MyJobsPage /></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('does not have permission')
    expect(screen.queryByText('Technician profile setup required')).not.toBeInTheDocument()
  })

  it('explains an expired session', async () => {
    getMyAssignmentsMock.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
    render(<MemoryRouter><MyJobsPage /></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('session has expired')
  })

  it('can reload assignments after a failure without reloading the page', async () => {
    getMyAssignmentsMock.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce([assignment])
    render(<MemoryRouter><MyJobsPage /></MemoryRouter>)
    const retry = await screen.findByRole('button', { name: 'Try again' })
    retry.click()
    expect(await screen.findByRole('link', { name: 'JOB-ABC123' })).toBeInTheDocument()
    expect(getMyAssignmentsMock).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('links each row to the correct job detail page', async () => {
    getMyAssignmentsMock.mockResolvedValue([assignment])
    render(<MemoryRouter><MyJobsPage /></MemoryRouter>)

    const link = await screen.findByRole('link', { name: 'JOB-ABC123' })
    expect(link).toHaveAttribute('href', '/jobs/job-abc')
  })

  it('calls getMyAssignments exactly once on mount', async () => {
    getMyAssignmentsMock.mockResolvedValue([])
    render(<MemoryRouter><MyJobsPage /></MemoryRouter>)

    await waitFor(() => expect(getMyAssignmentsMock).toHaveBeenCalledTimes(1))
  })
})
