import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import JobsByStatusPage from './JobsByStatusPage'
import { getJobsByStatus } from '../../services/reportService'

vi.mock('../../services/reportService', () => ({
  getJobsByStatus: vi.fn(),
}))

const getJobsByStatusMock = vi.mocked(getJobsByStatus)

describe('JobsByStatusPage', () => {
  beforeEach(() => {
    getJobsByStatusMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders page layout, loads default report, and displays summary and status rows', async () => {
    getJobsByStatusMock.mockResolvedValue({
      statuses: [{ status: 'CREATED', count: 7 }],
      total: 7,
    })

    render(<JobsByStatusPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Jobs by status' })).toBeInTheDocument()
    expect(
      screen.getByText('How many jobs sit at each stage, counted from the date each job was raised.'),
    ).toBeInTheDocument()

    // Wait for the total count to display
    const sevens = await screen.findAllByText('7')
    expect(sevens.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('jobs in total')).toBeInTheDocument()
    expect(screen.getByText('All jobs')).toBeInTheDocument()

    // Verify status rows
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Raised, not yet assigned')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()

    expect(screen.getByText('Assigned')).toBeInTheDocument()
    expect(screen.getByText('Waiting for a technician to start')).toBeInTheDocument()

    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })

  it('applies quick preset ranges and calls getJobsByStatus with updated dates', async () => {
    getJobsByStatusMock.mockResolvedValue({
      statuses: [],
      total: 0,
    })

    render(<JobsByStatusPage />)

    await screen.findByText('jobs in total')

    const last7Btn = screen.getByRole('button', { name: 'Last 7 days' })
    fireEvent.click(last7Btn)

    await waitFor(() => {
      expect(getJobsByStatusMock).toHaveBeenCalledTimes(2)
      expect(last7Btn).toHaveAttribute('aria-pressed', 'true')
    })
  })

  it('validates reversed date range on submit and shows error note', async () => {
    getJobsByStatusMock.mockResolvedValue({
      statuses: [],
      total: 0,
    })

    render(<JobsByStatusPage />)

    await screen.findByText('jobs in total')

    const fromInput = screen.getByLabelText('From')
    const toInput = screen.getByLabelText('To')

    fireEvent.change(fromInput, { target: { value: '2026-10-20' } })
    fireEvent.change(toInput, { target: { value: '2026-10-10' } })

    const applyBtn = screen.getByRole('button', { name: 'Apply' })
    fireEvent.click(applyBtn)

    expect(
      screen.getByText('The start date is after the end date. Swap them or clear one.'),
    ).toBeInTheDocument()
  })

  it('displays service error message when report fails to load', async () => {
    getJobsByStatusMock.mockRejectedValue(new Error('Network error'))

    render(<JobsByStatusPage />)

    expect(
      await screen.findByText('Something went wrong while loading the report.'),
    ).toBeInTheDocument()
  })
})
