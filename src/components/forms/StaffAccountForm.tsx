import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

import { createStaffAccount, staffAccountError } from '../../services/staffAccountService'
import type { StaffAccountResponse } from '../../services/staffAccountService'

const ROLES = ['Agent', 'Dispatcher', 'Technician', 'Manager'] as const

interface FormValues {
  fullName: string
  username: string
  email: string
  role: string
  password: string
  confirmation: string
  technicianId: string
}

const EMPTY_FORM: FormValues = {
  fullName: '',
  username: '',
  email: '',
  role: 'Agent',
  password: '',
  confirmation: '',
  technicianId: '',
}

export default function StaffAccountForm() {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<StaffAccountResponse | null>(null)

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setCreated(null)

    if (values.password !== values.confirmation) {
      setFormError('Passwords do not match.')
      return
    }
    if (values.password.length < 12) {
      setFormError('Password must be at least 12 characters.')
      return
    }
    if (values.role === 'Technician' && !values.technicianId.trim()) {
      setFormError('A Dispatch technician UUID is required for the Technician role.')
      return
    }

    setSubmitting(true)
    try {
      const account = await createStaffAccount({
        fullName: values.fullName.trim(),
        username: values.username.trim(),
        email: values.email.trim(),
        role: values.role,
        password: values.password,
        technicianId: values.role === 'Technician' ? values.technicianId.trim() : null,
      })
      setCreated(account)
      setValues(EMPTY_FORM)
    } catch (error) {
      setFormError(staffAccountError(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate id="staff-account-form">
      {formError && (
        <p className="alert alert-danger" role="alert">
          {formError}
        </p>
      )}

      {created && (
        <p className="alert alert-success" role="status">
          Created <strong>{created.fullName}</strong> as {created.role} ({created.username}).
        </p>
      )}

      <div className="mb-3">
        <label className="form-label" htmlFor="staff-fullName">Full name</label>
        <input
          id="staff-fullName"
          name="fullName"
          className="form-control"
          required
          maxLength={100}
          autoComplete="name"
          value={values.fullName}
          onChange={handleChange}
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="staff-username">Username</label>
        <input
          id="staff-username"
          name="username"
          className="form-control"
          required
          maxLength={100}
          autoComplete="off"
          pattern="^[A-Za-z0-9._-]{3,100}$"
          value={values.username}
          onChange={handleChange}
        />
        <p className="form-text">3–100 characters: letters, digits, dots, hyphens or underscores.</p>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="staff-email">Email</label>
        <input
          id="staff-email"
          name="email"
          className="form-control"
          type="email"
          required
          maxLength={254}
          autoComplete="off"
          value={values.email}
          onChange={handleChange}
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="staff-role">Role</label>
        <select
          id="staff-role"
          name="role"
          className="form-control"
          required
          value={values.role}
          onChange={handleChange}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {values.role === 'Technician' && (
        <div className="mb-3">
          <label className="form-label" htmlFor="staff-technicianId">Dispatch technician UUID</label>
          <input
            id="staff-technicianId"
            name="technicianId"
            className="form-control"
            required
            maxLength={36}
            autoComplete="off"
            placeholder="e.g. 783a9fae-a2da-4acb-906a-74cbfa5fbc6e"
            value={values.technicianId}
            onChange={handleChange}
          />
          <p className="form-text">Select an existing Dispatch technician. This links their field assignments to this login.</p>
        </div>
      )}

      <div className="mb-3">
        <label className="form-label" htmlFor="staff-password">Initial password</label>
        <input
          id="staff-password"
          name="password"
          className="form-control"
          type="password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          value={values.password}
          onChange={handleChange}
        />
        <p className="form-text">12–128 characters. Share the password privately with the staff member.</p>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="staff-confirmation">Confirm password</label>
        <input
          id="staff-confirmation"
          name="confirmation"
          className="form-control"
          type="password"
          required
          autoComplete="new-password"
          value={values.confirmation}
          onChange={handleChange}
        />
      </div>

      <button className="btn btn-primary" type="submit" id="staff-submit" disabled={submitting}>
        {submitting ? 'Creating…' : 'Create staff account'}
      </button>
    </form>
  )
}
