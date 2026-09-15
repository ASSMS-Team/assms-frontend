import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import JobsByTechnicianPage from './JobsByTechnicianPage'
import { getJobsByTechnician } from '../../services/reportService'

vi.mock('../../services/reportService', () => ({ getJobsByTechnician: vi.fn() }))

const getJobsByTechnicianMock = vi.mocked(getJobsByTechnician)

describe('Jobs by technician report', () => {
  beforeEach(() => getJobsByTechnicianMock.mockReset())
  afterEach(() => cleanup())

  it('shows a grouped event-fed assignment count', async () => {
    getJobsByTechnicianMock.mockResolvedValue({
      technicians: [{ technicianId: 'tech-1', technicianReference: 'TEC-032', jobCount: 2 }],
      total: 2,
    })

    render(<JobsByTechnicianPage />)

    expect(await screen.findByText('TEC-032')).toBeInTheDocument()
    expect(screen.getAllByText('2')).toHaveLength(2)
  })

  it('sends UTC range and region filters together', async () => {
    getJobsByTechnicianMock.mockResolvedValue({ technicians: [], total: 0 })
    render(<JobsByTechnicianPage />)

    await screen.findByText('No assignments match these filters')
    fireEvent.change(screen.getByLabelText('From (UTC)'), { target: { value: '2026-09-15T10:00:00Z' } })
    fireEvent.change(screen.getByLabelText('To (UTC)'), { target: { value: '2026-09-15T11:00:00Z' } })
    fireEvent.change(screen.getByLabelText('Region'), { target: { value: 'WESTERN' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => expect(getJobsByTechnicianMock).toHaveBeenLastCalledWith({
      from: '2026-09-15T10:00:00Z',
      to: '2026-09-15T11:00:00Z',
      region: 'WESTERN',
    }))
  })

  it('explains a valid no-data response', async () => {
    getJobsByTechnicianMock.mockResolvedValue({ technicians: [], total: 0 })
    render(<JobsByTechnicianPage />)

    expect(await screen.findByText('No assignments match these filters')).toBeInTheDocument()
  })
})
