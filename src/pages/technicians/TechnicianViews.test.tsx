import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'

import TechnicianDetailPage from './TechnicianDetailPage'
import TechnicianListPage from './TechnicianListPage'
import { getAllTechnicians, getTechnicianById } from '../../services/dispatchService'

vi.mock('../../services/dispatchService', () => ({
  getAllTechnicians: vi.fn(),
  getTechnicianById: vi.fn(),
}))

const getAllTechniciansMock = vi.mocked(getAllTechnicians)
const getTechnicianByIdMock = vi.mocked(getTechnicianById)

const technician = {
  id: 'technician-1', reference: 'TEC-001', fullName: 'Amal Perera', region: 'WESTERN' as const,
  status: 'ACTIVE' as const, skills: ['Electrical', 'AC'], phone: '0771234567', email: 'amal@assms.lk',
  createdAt: '2026-09-09T00:00:00Z', updatedAt: '2026-09-09T00:00:00Z',
}

describe('Technician views', () => {
  beforeEach(() => {
    getAllTechniciansMock.mockReset()
    getTechnicianByIdMock.mockReset()
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
})
