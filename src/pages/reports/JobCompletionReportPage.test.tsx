import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

import JobCompletionReportPage from './JobCompletionReportPage'
import { getJobCompletions } from '../../services/reportService'

vi.mock('../../services/reportService', () => ({ getJobCompletions: vi.fn() }))

const getJobCompletionsMock = vi.mocked(getJobCompletions)

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <JobCompletionReportPage />
    </MemoryRouter>,
  )
}

function createAxiosError(status: number, errors: Record<string, string[]>) {
  return new AxiosError(
    `Request failed with status code ${status}`,
    String(status),
    {} as InternalAxiosRequestConfig,
    {},
    {
      status,
      statusText: String(status),
      data: { status, errors, title: 'One or more validation errors occurred.' },
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    } as AxiosResponse,
  )
}

describe('Job completion dynamic report', () => {
  beforeEach(() => getJobCompletionsMock.mockReset())
  afterEach(() => cleanup())

  it('shows completed jobs list and total volume', async () => {
    getJobCompletionsMock.mockResolvedValue({
      jobs: [
        {
          jobId: 'job-101',
          jobReference: 'JOB-COMP101',
          region: 'WESTERN',
          serviceCategory: 'REPAIR',
          technicianId: 'tech-1',
          technicianReference: 'TEC-032',
          completedAt: '2026-09-22T08:00:00Z',
        },
      ],
      total: 1,
    })

    renderWithRouter()

    expect(await screen.findByText('JOB-COMP101')).toBeInTheDocument()
    expect(screen.getAllByText('Western')).toHaveLength(2)
    expect(screen.getByText('REPAIR')).toBeInTheDocument()
    expect(screen.getByText('TEC-032')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('sends UTC range and region filters together', async () => {
    getJobCompletionsMock.mockResolvedValue({ jobs: [], total: 0 })
    renderWithRouter()

    await screen.findByText('No completed jobs match these filters')
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-09-15' } })
    fireEvent.change(screen.getByLabelText('From time'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-09-15' } })
    fireEvent.change(screen.getByLabelText('To time'), { target: { value: '11:00' } })
    fireEvent.change(screen.getByLabelText('Region'), { target: { value: 'WESTERN' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() =>
      expect(getJobCompletionsMock).toHaveBeenLastCalledWith({
        from: new Date('2026-09-15T10:00').toISOString(),
        to: new Date('2026-09-15T11:00').toISOString(),
        region: 'WESTERN',
      }),
    )
  })

  it('explains a valid no-data response', async () => {
    getJobCompletionsMock.mockResolvedValue({ jobs: [], total: 0 })
    renderWithRouter()

    expect(await screen.findByText('No completed jobs match these filters')).toBeInTheDocument()
  })

  it('displays validation feedback when backend returns 400 on apply', async () => {
    getJobCompletionsMock.mockResolvedValueOnce({ jobs: [], total: 0 })
    renderWithRouter()
    await screen.findByText('No completed jobs match these filters')

    getJobCompletionsMock.mockRejectedValueOnce(
      createAxiosError(400, {
        from: ['from must be earlier than to.'],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByText('from must be earlier than to.')).toBeInTheDocument()
    expect(screen.getByText('The report was not run')).toBeInTheDocument()
  })

  it('displays service unavailable error on server failure on apply', async () => {
    getJobCompletionsMock.mockResolvedValueOnce({ jobs: [], total: 0 })
    renderWithRouter()
    await screen.findByText('No completed jobs match these filters')

    getJobCompletionsMock.mockRejectedValueOnce(new Error('Network error'))

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(
      await screen.findByText('Could not load the report. Check that the Reporting Service is running.'),
    ).toBeInTheDocument()
  })
})
