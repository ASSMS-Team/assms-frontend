import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import TechnicianForm from './TechnicianForm'
import { createTechnician } from '../../services/dispatchService'

vi.mock('../../services/dispatchService', () => ({
  createTechnician: vi.fn(),
}))

const createTechnicianMock = vi.mocked(createTechnician)

describe('TechnicianForm', () => {
  beforeEach(() => createTechnicianMock.mockReset())
  afterEach(() => cleanup())

  it('submits the Dispatch technician contract and shows the created record', async () => {
    createTechnicianMock.mockResolvedValue({
      id: 'technician-1', reference: 'TEC-032', fullName: 'Tharindu Jayasena', region: 'WESTERN',
      status: 'ACTIVE', skills: ['Electrical'], phone: null, email: null,
      createdAt: '2026-09-09T00:00:00Z', updatedAt: '2026-09-09T00:00:00Z',
    })

    render(<TechnicianForm />)
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
})
