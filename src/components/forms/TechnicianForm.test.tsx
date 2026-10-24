import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import TechnicianForm from './TechnicianForm'
import { createTechnician, updateTechnician } from '../../services/dispatchService'
import { createTechnicianAccount, getTechnicianAccount } from '../../services/technicianAccounts'

vi.mock('../../services/technicianAccounts', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/technicianAccounts')>(),
  createTechnicianAccount: vi.fn(), getTechnicianAccount: vi.fn(),
}))

vi.mock('../../services/dispatchService', () => ({
  createTechnician: vi.fn(),
  updateTechnician: vi.fn(),
}))

const createTechnicianMock = vi.mocked(createTechnician)
const updateTechnicianMock = vi.mocked(updateTechnician)

describe('TechnicianForm', () => {
  beforeEach(() => {
    createTechnicianMock.mockReset()
    updateTechnicianMock.mockReset()
    vi.mocked(createTechnicianAccount).mockReset()
    vi.mocked(getTechnicianAccount).mockReset().mockResolvedValue(null)
  })
  afterEach(() => cleanup())

  it('retries login creation using the saved technician instead of creating a duplicate', async () => {
    const technician = { id: 'tech-id', reference: 'TEC-032', fullName: 'Example Technician', region: 'WESTERN' as const, status: 'ACTIVE' as const, skills: ['AC'], phone: null, email: null, createdAt: '', updatedAt: '' }
    createTechnicianMock.mockResolvedValue(technician)
    vi.mocked(createTechnicianAccount).mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce({ id: 'staff-id', username: 'separate.login', email: 't@example.com', technicianId: 'tech-id' })
    render(<MemoryRouter><TechnicianForm /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Technician reference'), { target: { value: 'TEC-032' } })
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Example Technician' } })
    fireEvent.change(screen.getByLabelText('Region'), { target: { value: 'WESTERN' } })
    fireEvent.click(screen.getByLabelText('AC'))
    fireEvent.click(screen.getByLabelText('Create login access for this technician'))
    fireEvent.change(screen.getByLabelText('Login username'), { target: { value: 'separate.login' } })
    fireEvent.change(screen.getByLabelText('Login email'), { target: { value: 't@example.com' } })
    fireEvent.change(screen.getByLabelText('Initial password'), { target: { value: 'ExamplePassword42!' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'ExamplePassword42!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create technician and login' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Technician created; login setup pending')
    expect(createTechnicianMock.mock.calls[0][0]).not.toHaveProperty('password')
    fireEvent.click(screen.getByRole('button', { name: 'Retry login setup' }))
    expect(await screen.findByText('Technician login created and linked. Share the initial password privately.')).toBeInTheDocument()
    expect(createTechnicianMock).toHaveBeenCalledTimes(1)
    expect(createTechnicianAccount).toHaveBeenCalledTimes(2)
    expect(screen.queryByLabelText('Initial password')).not.toBeInTheDocument()
  })

  it('rejects mismatched passwords before creating any record', async () => {
    render(<MemoryRouter><TechnicianForm /></MemoryRouter>)
    fireEvent.click(screen.getByLabelText('Create login access for this technician'))
    fireEvent.change(screen.getByLabelText('Login username'), { target: { value: 'separate.login' } })
    fireEvent.change(screen.getByLabelText('Login email'), { target: { value: 't@example.com' } })
    fireEvent.change(screen.getByLabelText('Initial password'), { target: { value: 'ExamplePassword42!' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'DifferentPassword42!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create technician and login' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match')
    expect(createTechnicianMock).not.toHaveBeenCalled()
  })

  it('submits the Dispatch technician contract and shows the created record', async () => {
    createTechnicianMock.mockResolvedValue({
      id: 'technician-1', reference: 'TEC-032', fullName: 'Tharindu Jayasena', region: 'WESTERN',
      status: 'ACTIVE', skills: ['Electrical'], phone: null, email: null,
      createdAt: '2026-09-09T00:00:00Z', updatedAt: '2026-09-09T00:00:00Z',
    })

    render(<MemoryRouter><TechnicianForm /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Technician reference'), { target: { value: 'tec-032' } })
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Tharindu Jayasena' } })
    fireEvent.change(screen.getByLabelText('Region'), { target: { value: 'WESTERN' } })
    fireEvent.click(screen.getByLabelText('Electrical'))
    fireEvent.click(screen.getByRole('button', { name: 'Create technician' }))

    await waitFor(() => expect(createTechnicianMock).toHaveBeenCalledWith({
      reference: 'tec-032', fullName: 'Tharindu Jayasena', region: 'WESTERN',
      skills: ['Electrical'], status: 'ACTIVE', phone: null, email: null,
    }))
    expect(screen.getByRole('status')).toHaveTextContent('Created Tharindu Jayasena (TEC-032).')
  })

  it('submits technician with dots in reference to support staff account username linking', async () => {
    createTechnicianMock.mockResolvedValue({
      id: 'technician-2', reference: 'TECHNICIAN.LOCAL', fullName: 'Staff Technician', region: 'WESTERN',
      status: 'ACTIVE', skills: ['Electrical'], phone: null, email: null,
      createdAt: '2026-09-09T00:00:00Z', updatedAt: '2026-09-09T00:00:00Z',
    })

    render(<MemoryRouter><TechnicianForm /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Technician reference'), { target: { value: 'technician.local' } })
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Staff Technician' } })
    fireEvent.change(screen.getByLabelText('Region'), { target: { value: 'WESTERN' } })
    fireEvent.click(screen.getByLabelText('Electrical'))
    fireEvent.click(screen.getByRole('button', { name: 'Create technician' }))

    await waitFor(() => expect(createTechnicianMock).toHaveBeenCalledWith({
      reference: 'technician.local', fullName: 'Staff Technician', region: 'WESTERN',
      skills: ['Electrical'], status: 'ACTIVE', phone: null, email: null,
    }))
    expect(screen.getByRole('status')).toHaveTextContent('Created Staff Technician (TECHNICIAN.LOCAL).')
  })

  it('updates capability data without changing the technician reference', async () => {
    updateTechnicianMock.mockResolvedValue({
      id: 'technician-1', reference: 'TEC-032', fullName: 'Tharindu Jayasena', region: 'CENTRAL',
      status: 'ACTIVE', skills: ['Plumbing'], phone: null, email: null,
      createdAt: '2026-09-09T00:00:00Z', updatedAt: '2026-09-10T00:00:00Z',
    })
    render(<MemoryRouter><TechnicianForm technician={{
      id: 'technician-1', reference: 'TEC-032', fullName: 'Tharindu Jayasena', region: 'WESTERN',
      status: 'ACTIVE', skills: ['Electrical'], phone: null, email: null,
      createdAt: '2026-09-09T00:00:00Z', updatedAt: '2026-09-09T00:00:00Z',
    }} /></MemoryRouter>)

    expect(screen.getByLabelText('Technician reference')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Region'), { target: { value: 'CENTRAL' } })
    fireEvent.click(screen.getByLabelText('Electrical'))
    fireEvent.click(screen.getByLabelText('Plumbing'))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(updateTechnicianMock).toHaveBeenCalledWith('technician-1', {
      fullName: 'Tharindu Jayasena', region: 'CENTRAL', skills: ['Plumbing'], status: 'ACTIVE', phone: null, email: null,
    }))
    expect(screen.getByRole('status')).toHaveTextContent('Updated Tharindu Jayasena (TEC-032).')
  })
})
