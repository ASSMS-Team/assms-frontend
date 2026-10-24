import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

import { createStaffAccount, staffAccountError } from '../../services/staffAccountService'
import type { StaffAccountResponse } from '../../services/staffAccountService'

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

const ROLES = ['Agent', 'Dispatcher', 'Technician', 'Manager'] as const

function generateStrongPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const array = new Uint32Array(16)
  crypto.getRandomValues(array)
  let generated = ''
  for (let i = 0; i < 16; i++) {
    generated += chars[array[i] % chars.length]
  }
  return generated
}

function getPasswordStrength(p: string): number {
  if (!p) return 0
  let n = 0
  if (p.length >= 12) n++
  if (p.length >= 16) n++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) n++
  return n
}

export default function StaffAccountForm() {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<StaffAccountResponse | null>(null)
  const [touchedUser, setTouchedUser] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2200)
  }

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    const val = event.target.value
    setValues((curr) => {
      const next = { ...curr, fullName: val }
      if (!touchedUser) {
        next.username = val
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '.')
          .replace(/^\.|\.$/g, '')
      }
      return next
    })
  }

  function handleUsernameChange(event: ChangeEvent<HTMLInputElement>) {
    setTouchedUser(true)
    setValues((curr) => ({ ...curr, username: event.target.value }))
  }

  function handleRoleChange(newRole: string) {
    setValues((curr) => ({ ...curr, role: newRole }))
  }

  function handleGeneratePassword() {
    const generated = generateStrongPassword()
    setValues((curr) => ({
      ...curr,
      password: generated,
      confirmation: generated,
    }))
    setShowPw(true)
    showToast('Password generated. Copy it before you continue.')
  }

  function handleCancel() {
    showToast('Cancelled. Nothing was saved.')
  }

  function handleCreateAnother() {
    setCreated(null)
    setValues(EMPTY_FORM)
    setTouchedUser(false)
    setShowPw(false)
    setTouched({})
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setCreated(null)

    if (values.password !== values.confirmation) {
      setFormError('Passwords do not match.')
      setTouched((prev) => ({ ...prev, confirmation: true }))
      return
    }
    if (values.password.length < 12) {
      setFormError('Password must be at least 12 characters.')
      setTouched((prev) => ({ ...prev, password: true }))
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
      setTouchedUser(false)
      setShowPw(false)
    } catch (err) {
      setFormError(staffAccountError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const isNameBad = Boolean(touched.fullName && values.fullName.trim().length <= 1)
  const isUserBad = Boolean(
    touched.username && !/^[A-Za-z0-9._-]{3,100}$/.test(values.username),
  )
  const isEmailBad = Boolean(
    touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email),
  )
  const isPwBad = Boolean(touched.password && values.password.length < 12)
  const isPw2Bad = Boolean(
    touched.confirmation &&
      (values.confirmation !== values.password || values.confirmation.length === 0),
  )

  const strength = getPasswordStrength(values.password)

  // Checklist status flags
  const chkName = values.fullName.trim().length > 1
  const chkUser = /^[A-Za-z0-9._-]{3,100}$/.test(values.username)
  const chkEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)
  const chkLen = values.password.length >= 12 && values.password.length <= 128
  const chkMatch = values.password.length > 0 && values.password === values.confirmation

  return (
    <div className="stage">
      <div className="layout">
        <div className="card">
          {formError && (
            <p className="alert alert-danger" role="alert">
              {formError}
            </p>
          )}

          {created ? (
            <div className="done show" id="done">
              <div className="tick">✓</div>
              <h2 id="dt">{created.fullName} can now sign in</h2>
              <p className="alert-success" role="status">
                Created <strong>{created.fullName}</strong> as {created.role} ({created.username}).
              </p>
              <p>Share the initial password privately with them. They can sign in right away.</p>
              <button
                className="btn"
                id="again"
                type="button"
                onClick={handleCreateAnother}
              >
                Create another
              </button>
            </div>
          ) : (
            <form id="staff-account-form" onSubmit={handleSubmit} noValidate>
              <div className="sec">
                <h2>Account details</h2>
                <p>Who is this account for?</p>
                <div className="grid2">
                  <label className="f" style={{ gridColumn: '1 / -1' }} htmlFor="staff-fullName">
                    <span>Full name</span>
                    <input
                      className={`inp${isNameBad ? ' bad' : ''}`}
                      id="staff-fullName"
                      name="fullName"
                      autoComplete="name"
                      placeholder="e.g. Hirusha Sipara"
                      value={values.fullName}
                      onChange={handleNameChange}
                      onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
                      aria-label="Full name"
                    />
                    <em className="err">Enter the person’s full name.</em>
                  </label>

                  <label className="f" htmlFor="staff-username">
                    <span>Username</span>
                    <input
                      className={`inp${isUserBad ? ' bad' : ''}`}
                      id="staff-username"
                      name="username"
                      autoComplete="off"
                      placeholder="e.g. hirusha.sipara"
                      value={values.username}
                      onChange={handleUsernameChange}
                      onBlur={() => setTouched((p) => ({ ...p, username: true }))}
                      aria-label="Username"
                    />
                    <em className="err">Use 3–100 letters, digits, dots, hyphens or underscores.</em>
                    <small className="hint">
                      3–100 characters: letters, digits, dots, hyphens or underscores.
                    </small>
                  </label>

                  <label className="f" htmlFor="staff-email">
                    <span>Email</span>
                    <input
                      className={`inp${isEmailBad ? ' bad' : ''}`}
                      id="staff-email"
                      name="email"
                      type="email"
                      autoComplete="off"
                      placeholder="name@company.com"
                      value={values.email}
                      onChange={(e) =>
                        setValues((c) => ({ ...c, email: e.target.value }))
                      }
                      onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                      aria-label="Email"
                    />
                    <em className="err">Enter a valid email address.</em>
                  </label>
                </div>
              </div>

              <div className="sec">
                <h2>Role</h2>
                <p>Choose what this person can do in ASSMS.</p>

                {/* Accessible select control for testing & assistive tech */}
                <select
                  id="staff-role"
                  name="role"
                  className="visually-hidden"
                  aria-label="Role"
                  value={values.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <div
                  className="roles"
                  role="radiogroup"
                  aria-label="Role selection"
                >
                  <label className="role">
                    <input
                      type="radio"
                      name="role-radio"
                      value="Agent"
                      checked={values.role === 'Agent'}
                      onChange={() => handleRoleChange('Agent')}
                    />
                    <div>
                      <b>Agent</b>
                      <small>Registers customers and assets, and raises service jobs.</small>
                    </div>
                  </label>
                  <label className="role">
                    <input
                      type="radio"
                      name="role-radio"
                      value="Dispatcher"
                      checked={values.role === 'Dispatcher'}
                      onChange={() => handleRoleChange('Dispatcher')}
                    />
                    <div>
                      <b>Dispatcher</b>
                      <small>Assigns jobs to technicians and tracks progress.</small>
                    </div>
                  </label>
                  <label className="role">
                    <input
                      type="radio"
                      name="role-radio"
                      value="Technician"
                      checked={values.role === 'Technician'}
                      onChange={() => handleRoleChange('Technician')}
                    />
                    <div>
                      <b>Technician</b>
                      <small>Works on assigned jobs. Linked to a technician profile.</small>
                    </div>
                  </label>
                  <label className="role">
                    <input
                      type="radio"
                      name="role-radio"
                      value="Manager"
                      checked={values.role === 'Manager'}
                      onChange={() => handleRoleChange('Manager')}
                    />
                    <div>
                      <b>Manager</b>
                      <small>Full access, including staff accounts.</small>
                    </div>
                  </label>
                </div>

                {values.role === 'Technician' && (
                  <div style={{ marginTop: 16 }}>
                    <label className="f" htmlFor="staff-technicianId">
                      <span>Dispatch technician UUID</span>
                      <input
                        className="inp"
                        id="staff-technicianId"
                        name="technicianId"
                        autoComplete="off"
                        placeholder="e.g. 783a9fae-a2da-4acb-906a-74cbfa5fbc6e"
                        value={values.technicianId}
                        onChange={(e) =>
                          setValues((c) => ({ ...c, technicianId: e.target.value }))
                        }
                        aria-label="Dispatch technician UUID"
                      />
                      <small className="hint">
                        Select an existing Dispatch technician. This links their field assignments to this login.
                      </small>
                    </label>
                  </div>
                )}
              </div>

              <div className="sec">
                <h2>Password</h2>
                <p>Set a temporary password and share it privately with the staff member.</p>
                <div className="grid2">
                  <label className="f" htmlFor="staff-password">
                    <span>Initial password</span>
                    <div className="pw">
                      <input
                        className={`inp${isPwBad ? ' bad' : ''}`}
                        id="staff-password"
                        name="password"
                        type={showPw ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="At least 12 characters"
                        value={values.password}
                        onChange={(e) =>
                          setValues((c) => ({ ...c, password: e.target.value }))
                        }
                        onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                        aria-label="Initial password"
                      />
                      <button
                        type="button"
                        className="eye"
                        id="eye"
                        aria-label="Show or hide passwords"
                        onClick={() => setShowPw((v) => !v)}
                      >
                        {showPw ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <em className="err">Use 12–128 characters.</em>
                    <small className="hint">12–128 characters.</small>
                  </label>

                  <label className="f" htmlFor="staff-confirmation">
                    <span>Confirm password</span>
                    <input
                      className={`inp${isPw2Bad ? ' bad' : ''}`}
                      id="staff-confirmation"
                      name="confirmation"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      value={values.confirmation}
                      onChange={(e) =>
                        setValues((c) => ({ ...c, confirmation: e.target.value }))
                      }
                      onBlur={() => setTouched((p) => ({ ...p, confirmation: true }))}
                      aria-label="Confirm password"
                    />
                    <em className="err">Passwords don’t match.</em>
                  </label>
                </div>

                <div className={`bar s${strength}`} id="bar" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>

                <button
                  type="button"
                  className="gen"
                  id="gen"
                  onClick={handleGeneratePassword}
                >
                  Generate a strong password
                </button>
              </div>

              <div className="actions">
                <button
                  type="button"
                  className="ghost"
                  id="cancel"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  type="submit"
                  id="staff-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Creating…' : 'Create staff account'}
                </button>
              </div>
            </form>
          )}
        </div>

        <aside className="card aside" aria-label="Checklist">
          <h3>Before you create</h3>
          <ul className="chk" id="chk">
            <li className={chkName ? 'ok' : ''} data-k="name">
              Full name added
            </li>
            <li className={chkUser ? 'ok' : ''} data-k="user">
              Valid username
            </li>
            <li className={chkEmail ? 'ok' : ''} data-k="email">
              Valid email
            </li>
            <li className={chkLen ? 'ok' : ''} data-k="len">
              Password is 12–128 characters
            </li>
            <li className={chkMatch ? 'ok' : ''} data-k="match">
              Passwords match
            </li>
          </ul>
          <div className="tip">
            <b>Tip:</b> never send the password in a shared chat. Tell them in person or by phone.
          </div>
        </aside>
      </div>

      {toastMessage && (
        <div className="toast show" id="toast" role="status">
          {toastMessage}
        </div>
      )}
    </div>
  )
}
