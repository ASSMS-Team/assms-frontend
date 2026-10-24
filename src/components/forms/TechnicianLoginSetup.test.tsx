import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TechnicianLoginSetup from './TechnicianLoginSetup'
import { createTechnicianAccount, getTechnicianAccount, linkTechnicianAccount } from '../../services/technicianAccounts'

vi.mock('../../services/technicianAccounts', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/technicianAccounts')>(),
  getTechnicianAccount: vi.fn(), createTechnicianAccount: vi.fn(), linkTechnicianAccount: vi.fn(),
}))
const linked = { id: 'staff-id', username: 'different.login', email: 't@example.com', technicianId: 'tech-id' }
describe('Technician login setup', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(getTechnicianAccount).mockResolvedValue(null) })
  afterEach(cleanup)
  it('shows a linked account without password fields', async () => {
    vi.mocked(getTechnicianAccount).mockResolvedValue(linked)
    render(<TechnicianLoginSetup technicianId="tech-id" />)
    expect(await screen.findByText('different.login')).toBeInTheDocument()
    expect(screen.queryByLabelText('Initial password')).not.toBeInTheDocument()
  })
  it('links an existing login to the selected existing technician ID', async () => {
    vi.mocked(linkTechnicianAccount).mockResolvedValue(linked)
    render(<TechnicianLoginSetup technicianId="tech-id" />)
    fireEvent.change(await screen.findByLabelText('Login setup'), { target: { value: 'link' } })
    fireEvent.change(screen.getByLabelText('Existing Technician username or email'), { target: { value: 'different.login' } })
    fireEvent.click(screen.getByRole('button', { name: 'Link login' }))
    expect(await screen.findByText('different.login')).toBeInTheDocument()
    expect(linkTechnicianAccount).toHaveBeenCalledWith('tech-id', 'different.login')
    expect(createTechnicianAccount).not.toHaveBeenCalled()
  })
  it('creates login with Technician identity then removes password fields', async () => {
    vi.mocked(createTechnicianAccount).mockResolvedValue(linked)
    render(<TechnicianLoginSetup technicianId="tech-id" />)
    fireEvent.change(await screen.findByLabelText('Login username'), { target: { value: 'different.login' } })
    fireEvent.change(screen.getByLabelText('Login email'), { target: { value: 't@example.com' } })
    fireEvent.change(screen.getByLabelText('Initial password'), { target: { value: 'ExamplePassword42!' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'ExamplePassword42!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create login' }))
    expect(await screen.findByText('different.login')).toBeInTheDocument()
    expect(createTechnicianAccount).toHaveBeenCalledWith('tech-id', { username: 'different.login', email: 't@example.com', password: 'ExamplePassword42!' })
    expect(screen.queryByLabelText('Initial password')).not.toBeInTheDocument()
  })
  it('reconciles a lost response without issuing another create request', async () => {
    vi.mocked(getTechnicianAccount).mockResolvedValueOnce(null).mockResolvedValueOnce(linked)
    vi.mocked(createTechnicianAccount).mockRejectedValueOnce(new Error('response lost'))
    render(<TechnicianLoginSetup technicianId="tech-id" />)
    fireEvent.change(await screen.findByLabelText('Login username'), { target: { value: 'different.login' } })
    fireEvent.change(screen.getByLabelText('Login email'), { target: { value: 't@example.com' } })
    fireEvent.change(screen.getByLabelText('Initial password'), { target: { value: 'ExamplePassword42!' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'ExamplePassword42!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create login' }))
    expect(await screen.findByText('different.login')).toBeInTheDocument()
    expect(createTechnicianAccount).toHaveBeenCalledTimes(1)
  })
})
