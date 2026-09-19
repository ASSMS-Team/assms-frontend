import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'

import TechnicianDetailPage from './TechnicianDetailPage'
import TechnicianListPage from './TechnicianListPage'
import { deactivateTechnician, getAllTechnicians, getTechnicianById } from '../../services/dispatchService'

vi.mock('../../services/dispatchService', () => ({
  getAllTechnicians: vi.fn(),
  getTechnicianById: vi.fn(),
  deactivateTechnician: vi.fn(),
}))

const getAllTechniciansMock = vi.mocked(getAllTechnicians)
const getTechnicianByIdMock = vi.mocked(getTechnicianById)
const deactivateTechnicianMock = vi.mocked(deactivateTechnician)

const technician = {
  id: 'technician-1', reference: 'TEC-001', fullName: 'Amal Perera', region: 'WESTERN' as const,
  status: 'ACTIVE' as const, skills: ['Electrical', 'AC'], phone: '0771234567', email: 'amal@assms.lk',
  createdAt: '2026-09-09T00:00:00Z', updatedAt: '2026-09-09T00:00:00Z',
}

describe('Technician views', () => {
  beforeEach(() => {
    getAllTechniciansMock.mockReset()
    getTechnicianByIdMock.mockReset()
    deactivateTechnicianMock.mockReset()
    vi.restoreAllMocks()
  })
  afterEach(() => cleanup())

  it('shows technician reference, region, skills and state in the list', async () => {
    getAllTechniciansMock.mockResolvedValue([technician])
    render(<MemoryRouter><TechnicianListPage /></MemoryRouter>)

    await waitFor(() => expect(screen.getByRole('link', { name: 'Amal Perera' })).toBeInTheDocument())
    expect(screen.getByText('TEC-001')).toBeInTheDocument()
    expect(screen.getByText('Western')).toBeInTheDocument()
    expect(screen.getByText('Electrical, AC')).toBeInTheDocument()
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
  })

  it('filters technician capability records by state and preserves the selected filter in the route', async () => {
    getAllTechniciansMock.mockResolvedValue([
      technician,
      { ...technician, id: 'technician-2', reference: 'TEC-002', fullName: 'Saman Silva', status: 'INACTIVE' as const },
    ])
    render(<MemoryRouter initialEntries={['/technicians?status=ACTIVE']}><TechnicianListPage /></MemoryRouter>)

    expect(await screen.findByRole('link', { name: 'Amal Perera' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Saman Silva' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filter by state'), { target: { value: 'INACTIVE' } })

    expect(await screen.findByRole('link', { name: 'Saman Silva' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Amal Perera' })).not.toBeInTheDocument()
  })

  it('explains an empty list', async () => {
    getAllTechniciansMock.mockResolvedValue([])
    render(<MemoryRouter><TechnicianListPage /></MemoryRouter>)

    expect(await screen.findByText('No technicians yet')).toBeInTheDocument()
  })

  it('explains a technician-list service error', async () => {
    getAllTechniciansMock.mockRejectedValue(new Error('service unavailable'))
    render(<MemoryRouter><TechnicianListPage /></MemoryRouter>)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load technicians')
  })

  it('shows the stored technician details accurately', async () => {
    getTechnicianByIdMock.mockResolvedValue(technician)
    render(<MemoryRouter initialEntries={['/technicians/technician-1']}><Routes><Route path="/technicians/:id" element={<TechnicianDetailPage />} /></Routes></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: 'Amal Perera' })).toBeInTheDocument()
    expect(screen.getByText('Electrical, AC')).toBeInTheDocument()
    expect(screen.getByText('amal@assms.lk')).toBeInTheDocument()
    expect(getTechnicianByIdMock).toHaveBeenCalledWith('technician-1')
  })

  it('shows a clear unknown-technician state for a 404 response', async () => {
    getTechnicianByIdMock.mockRejectedValue(new AxiosError('Not found', undefined, undefined, undefined, { status: 404, statusText: 'Not Found', headers: {}, config: {} as never, data: {} }))
    render(<MemoryRouter initialEntries={['/technicians/unknown-id']}><Routes><Route path="/technicians/:id" element={<TechnicianDetailPage />} /></Routes></MemoryRouter>)

    expect(await screen.findByText('Technician not found')).toBeInTheDocument()
    expect(screen.getByText('unknown-id')).toBeInTheDocument()
  })

  it('confirms and soft-deactivates an active technician', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    getTechnicianByIdMock.mockResolvedValue(technician)
    deactivateTechnicianMock.mockResolvedValue({ ...technician, status: 'INACTIVE' })
    render(<MemoryRouter initialEntries={['/technicians/technician-1']}><Routes><Route path="/technicians/:id" element={<TechnicianDetailPage />} /></Routes></MemoryRouter>)

    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }))

    await waitFor(() => expect(deactivateTechnicianMock).toHaveBeenCalledWith('technician-1'))
    expect(screen.getAllByText('INACTIVE')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument()
  })

  it('explains when open assignments block deactivation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    getTechnicianByIdMock.mockResolvedValue(technician)
    deactivateTechnicianMock.mockRejectedValue(new AxiosError('Conflict', undefined, undefined, undefined, { status: 409, statusText: 'Conflict', headers: {}, config: {} as never, data: {} }))
    render(<MemoryRouter initialEntries={['/technicians/technician-1']}><Routes><Route path="/technicians/:id" element={<TechnicianDetailPage />} /></Routes></MemoryRouter>)

    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Reassign or close those jobs')
  })
})
