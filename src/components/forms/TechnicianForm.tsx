import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

import { REGIONS, REGION_LABELS, TECHNICIAN_SKILLS } from '../../constants/technician'
import { createTechnician, updateTechnician } from '../../services/dispatchService'
import type { ValidationProblemDetails } from '../../types/customer'
import type { CreateTechnicianRequest, TechnicianResponse, UpdateTechnicianRequest } from '../../types/technician'
import { EMPTY_LOGIN, validateLogin } from './technicianLoginDraft'
import { createTechnicianAccount, getTechnicianAccount, loginSetupError } from '../../services/technicianAccounts'
import '../../pages/technicians/CreateTechnicianPage.css'

type FormValues = Omit<CreateTechnicianRequest, 'phone' | 'email'> & { phone: string; email: string }

const EMPTY_FORM: FormValues = {
  reference: '',
  fullName: '',
  region: '',
  skills: [],
  status: 'ACTIVE',
  phone: '',
  email: '',
}

type TechnicianFormProps = { technician?: TechnicianResponse }

function TechnicianForm({ technician: existing }: TechnicianFormProps) {
  const isEdit = Boolean(existing)
  const navigate = useNavigate()

  const [values, setValues] = useState<FormValues>(() =>
    existing
      ? {
          reference: existing.reference,
          fullName: existing.fullName,
          region: existing.region,
          skills: [...existing.skills],
          status: existing.status,
          phone: existing.phone ?? '',
          email: existing.email ?? '',
        }
      : EMPTY_FORM
  )

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [created, setCreated] = useState<TechnicianResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loginEnabled, setLoginEnabled] = useState(false)
  const [loginDraft, setLoginDraft] = useState({ ...EMPTY_LOGIN })
  const [loginComplete, setLoginComplete] = useState(false)
  const [loginError, setLoginError] = useState('')

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
  }

  function toggleSkill(skill: string) {
    setValues((current) => ({
      ...current,
      skills: current.skills.includes(skill)
        ? current.skills.filter((selected) => selected !== skill)
        : [...current.skills, skill],
    }))
  }

  async function handleRetryLogin() {
    if (!created) return
    setSubmitting(true)
    setLoginError('')
    try {
      await createTechnicianAccount(created.id, {
        username: loginDraft.username.trim(),
        email: loginDraft.email.trim(),
        password: loginDraft.password,
      })
      setLoginComplete(true)
      setLoginDraft({ ...EMPTY_LOGIN })
    } catch (cause) {
      try {
        if (await getTechnicianAccount(created.id)) {
          setLoginComplete(true)
          setLoginDraft({ ...EMPTY_LOGIN })
          return
        }
      } catch {
        /* Keep error state */
      }
      setLoginError(loginSetupError(cause))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // If retrying login on an already created technician
    if (!isEdit && created && loginEnabled && !loginComplete) {
      await handleRetryLogin()
      return
    }

    setFieldErrors({})
    setFormError(null)
    if (isEdit) setCreated(null)
    setLoginError('')

    if (!isEdit && loginEnabled) {
      const validation = validateLogin(loginDraft)
      if (validation) {
        setLoginError(validation)
        return
      }
    }

    setSubmitting(true)

    try {
      const request = {
        ...values,
        phone: values.phone.trim() || null,
        email: values.email.trim() || null,
      }

      const technician = isEdit
        ? await updateTechnician(existing!.id, {
            fullName: request.fullName,
            region: request.region,
            skills: request.skills,
            status: request.status,
            phone: request.phone,
            email: request.email,
          } as UpdateTechnicianRequest)
        : created ?? (await createTechnician(request))

      setCreated(technician)

      if (!isEdit && loginEnabled) {
        try {
          await createTechnicianAccount(technician.id, {
            username: loginDraft.username.trim(),
            email: loginDraft.email.trim(),
            password: loginDraft.password,
          })
          setLoginComplete(true)
          setLoginDraft({ ...EMPTY_LOGIN })
        } catch (cause) {
          try {
            if (await getTechnicianAccount(technician.id)) {
              setLoginComplete(true)
              setLoginDraft({ ...EMPTY_LOGIN })
              return
            }
          } catch {
            /* Keep the provisioning error and saved technician. */
          }
          setLoginError(loginSetupError(cause))
        }
      }
    } catch (error) {
      if (axios.isAxiosError<ValidationProblemDetails>(error) && error.response?.data.errors) {
        setFieldErrors(error.response.data.errors)
      } else {
        setFormError('Could not create the technician. Check that the Dispatch Service is running and try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleResetForm() {
    setValues(EMPTY_FORM)
    setFieldErrors({})
    setFormError(null)
    setCreated(null)
    setLoginEnabled(false)
    setLoginDraft({ ...EMPTY_LOGIN })
    setLoginComplete(false)
    setLoginError('')
    setTimeout(() => {
      document.getElementById('reference')?.focus()
    }, 50)
  }

  function handleCancel() {
    if (isEdit && existing) {
      navigate(`/technicians/${existing.id}`)
    } else {
      navigate('/technicians')
    }
  }

  function errorsFor(field: string) {
    const errors = fieldErrors[field]
    return errors?.length ? (
      <em className="err" style={{ display: 'block' }}>
        {errors.join(' ')}
      </em>
    ) : null
  }

  return (
    <div className="new-technician-container">
      {!isEdit && (
        <>
          <Link className="back" to="/technicians">
            &larr; Back to technicians
          </Link>
          <h1>New technician</h1>
          <p className="sub">Create the Dispatch record used for service-job assignment.</p>
        </>
      )}

      {/* Status message for notifications and test assertions */}
      {created && (
        <p className={`alert alert-success mx-4 my-3${!isEdit ? ' visually-hidden' : ''}`} role="status">
          {isEdit ? 'Updated' : 'Created'} {created.fullName} ({created.reference}).
        </p>
      )}

      <div className="stage">
        <div className="layout">
          <div className="card">
            {created && !isEdit && (!loginError || loginComplete) ? (
              <div className="done show" id="done">
                <div className="tick">&#10003;</div>
                <h2 id="dt">{created.fullName} added</h2>
                <p>They’re now available in Dispatch.</p>
                {loginComplete && (
                  <p role="status" className="alert alert-success mx-4 mb-4">
                    Technician login created and linked. Share the initial password privately.
                  </p>
                )}
                <div className="btns">
                  <button className="btn" id="again" type="button" onClick={handleResetForm}>
                    Add another
                  </button>
                  <Link className="ghost" to="/technicians">
                    View technicians
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="legend">
                  Fields marked with <span className="star">*</span> are required.
                </div>

                {formError && (
                  <p className="alert alert-danger mx-4 my-3" role="alert">
                    {formError}
                  </p>
                )}



                <form id="form" onSubmit={handleSubmit} noValidate>
                  {/* Section 1: Technician details */}
                  <div className="sec">
                    <h2>Technician details</h2>
                    <p>Who is joining the dispatch team?</p>
                    <div className="grid2">
                      <label className="f" htmlFor="reference">
                        <span>
                          Technician reference<b className="star" aria-hidden="true">*</b>
                        </span>
                        <input
                          className={`inp${fieldErrors.reference ? ' bad' : ''}`}
                          id="reference"
                          name="reference"
                          aria-label="Technician reference"
                          maxLength={30}
                          autoComplete="off"
                          aria-required="true"
                          placeholder="TEC-032 or technician.local"
                          value={values.reference}
                          onChange={handleChange}
                          disabled={isEdit || submitting || (!isEdit && Boolean(created))}
                        />
                        <small className="hint">
                          Login access is linked by technician ID, so the username can be different.
                        </small>
                        {errorsFor('reference')}
                      </label>

                      <label className="f" htmlFor="fullName">
                        <span>
                          Full name<b className="star" aria-hidden="true">*</b>
                        </span>
                        <input
                          className={`inp${fieldErrors.fullName ? ' bad' : ''}`}
                          id="fullName"
                          name="fullName"
                          aria-label="Full name"
                          maxLength={150}
                          autoComplete="off"
                          aria-required="true"
                          placeholder="e.g. Hirusha Sipara"
                          value={values.fullName}
                          onChange={handleChange}
                          disabled={submitting || (!isEdit && Boolean(created))}
                        />
                        {errorsFor('fullName')}
                      </label>

                      <label className="f" htmlFor="region">
                        <span>
                          Region<b className="star" aria-hidden="true">*</b>
                        </span>
                        <select
                          className={`inp${fieldErrors.region ? ' bad' : ''}`}
                          id="region"
                          name="region"
                          aria-label="Region"
                          aria-required="true"
                          value={values.region}
                          onChange={handleChange}
                          disabled={submitting || (!isEdit && Boolean(created))}
                        >
                          <option value="">Select a province</option>
                          {REGIONS.map((r) => (
                            <option key={r} value={r}>
                              {REGION_LABELS[r]}
                            </option>
                          ))}
                        </select>
                        {errorsFor('region')}
                      </label>

                      <div className="f">
                        <span>Status</span>
                        <div className="seg" role="radiogroup" aria-label="Status">
                          <label>
                            <input
                              type="radio"
                              name="status"
                              value="ACTIVE"
                              checked={values.status === 'ACTIVE'}
                              onChange={() => setValues((c) => ({ ...c, status: 'ACTIVE' }))}
                              disabled={submitting || (!isEdit && Boolean(created))}
                            />
                            <span>Active</span>
                          </label>
                          <label>
                            <input
                              type="radio"
                              name="status"
                              value="INACTIVE"
                              checked={values.status === 'INACTIVE'}
                              onChange={() => setValues((c) => ({ ...c, status: 'INACTIVE' }))}
                              disabled={submitting || (!isEdit && Boolean(created))}
                            />
                            <span>Inactive</span>
                          </label>
                        </div>
                        <small className="hint">
                          Only active technicians can be considered for future assignment.
                        </small>
                        {errorsFor('status')}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Skills */}
                  <div className="sec">
                    <h2>Skills</h2>
                    <p>Pick everything this technician can handle.</p>
                    <div className="skills" id="skills">
                      {TECHNICIAN_SKILLS.map((skill) => (
                        <label className="sk" key={skill} htmlFor={`skill-${skill}`}>
                          <input
                            id={`skill-${skill}`}
                            type="checkbox"
                            aria-label={skill}
                            checked={values.skills.includes(skill)}
                            onChange={() => toggleSkill(skill)}
                            disabled={submitting || (!isEdit && Boolean(created))}
                          />
                          <span>{skill}</span>
                        </label>
                      ))}
                    </div>
                    {errorsFor('skills')}
                  </div>

                  {/* Section 3: Contact */}
                  <div className="sec">
                    <h2>Contact</h2>
                    <p>How can the team reach them?</p>
                    <div className="grid2">
                      <label className="f" htmlFor="phone">
                        <span>
                          Phone<i className="opt">(optional)</i>
                        </span>
                        <input
                          className={`inp${fieldErrors.phone ? ' bad' : ''}`}
                          id="phone"
                          name="phone"
                          aria-label="Phone"
                          type="tel"
                          autoComplete="off"
                          placeholder="e.g. 0762001635"
                          value={values.phone}
                          onChange={handleChange}
                          disabled={submitting || (!isEdit && Boolean(created))}
                        />
                        {errorsFor('phone')}
                      </label>
                      <label className="f" htmlFor="email">
                        <span>
                          Email<i className="opt">(optional)</i>
                        </span>
                        <input
                          className={`inp${fieldErrors.email ? ' bad' : ''}`}
                          id="email"
                          name="email"
                          aria-label="Email"
                          type="email"
                          autoComplete="off"
                          placeholder="name@company.com"
                          value={values.email}
                          onChange={handleChange}
                          disabled={submitting || (!isEdit && Boolean(created))}
                        />
                        {errorsFor('email')}
                      </label>
                    </div>
                  </div>

                  {/* Section 4: Login access */}
                  {!isEdit && (
                    <div className="sec" style={{ borderBottom: 0 }}>
                      <h2>Login access</h2>
                      <p>Optional. Only the Technician role is assigned.</p>
                      <label className="toggle" htmlFor="loginOn">
                        <input
                          type="checkbox"
                          id="loginOn"
                          aria-label="Create login access for this technician"
                          checked={loginEnabled}
                          disabled={submitting || Boolean(created)}
                          onChange={(e) => setLoginEnabled(e.target.checked)}
                        />
                        <span className="sw" aria-hidden="true" />
                        <span>
                          <b>Create login access for this technician</b>
                          <small>They’ll be able to sign in and see their assigned jobs.</small>
                        </span>
                      </label>

                      {loginEnabled && !loginComplete && (
                        <div id="login" className="show">
                          <div className="grid2">
                            <label className="f" htmlFor="login-username">
                              <span>
                                Login username<b className="star" aria-hidden="true">*</b>
                              </span>
                              <input
                                className="inp"
                                id="login-username"
                                aria-label="Login username"
                                maxLength={100}
                                autoComplete="off"
                                placeholder="e.g. hirusha.s"
                                value={loginDraft.username}
                                onChange={(e) =>
                                  setLoginDraft((curr) => ({ ...curr, username: e.target.value }))
                                }
                                disabled={submitting}
                              />
                              <small className="hint">Can differ from the technician reference.</small>
                            </label>

                            <label className="f" htmlFor="login-email">
                              <span>
                                Login email<b className="star" aria-hidden="true">*</b>
                              </span>
                              <input
                                className="inp"
                                id="login-email"
                                aria-label="Login email"
                                type="email"
                                maxLength={254}
                                autoComplete="off"
                                placeholder="name@company.com"
                                value={loginDraft.email}
                                onChange={(e) =>
                                  setLoginDraft((curr) => ({ ...curr, email: e.target.value }))
                                }
                                disabled={submitting}
                              />
                            </label>

                            <label className="f" htmlFor="login-password">
                              <span>
                                Initial password<b className="star" aria-hidden="true">*</b>
                              </span>
                              <input
                                className="inp"
                                id="login-password"
                                aria-label="Initial password"
                                type="password"
                                minLength={12}
                                maxLength={128}
                                autoComplete="new-password"
                                value={loginDraft.password}
                                onChange={(e) =>
                                  setLoginDraft((curr) => ({ ...curr, password: e.target.value }))
                                }
                                disabled={submitting}
                              />
                              <small className="hint">12–128 characters. Share privately with the technician.</small>
                            </label>

                            <label className="f" htmlFor="login-confirm">
                              <span>
                                Confirm password<b className="star" aria-hidden="true">*</b>
                              </span>
                              <input
                                className="inp"
                                id="login-confirm"
                                aria-label="Confirm password"
                                type="password"
                                autoComplete="new-password"
                                value={loginDraft.confirmation}
                                onChange={(e) =>
                                  setLoginDraft((curr) => ({ ...curr, confirmation: e.target.value }))
                                }
                                disabled={submitting}
                              />
                            </label>
                          </div>
                        </div>
                      )}

                      {loginError && (
                        <p className="alert alert-warning mt-3" role="alert">
                          {created ? 'Technician created; login setup pending. ' : ''}
                          {loginError}
                        </p>
                      )}
                      {loginComplete && (
                        <p role="status" className="alert alert-success mt-3">
                          Technician login created and linked. Share the initial password privately.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="actions">
                    <button type="button" className="ghost" id="cancel" onClick={handleCancel}>
                      Cancel
                    </button>
                    <button
                      className="btn"
                      id="go"
                      type="submit"
                      disabled={submitting || (!isEdit && Boolean(created) && (!loginEnabled || loginComplete))}
                    >
                      {submitting
                        ? isEdit
                          ? 'Saving...'
                          : 'Creating...'
                        : isEdit
                        ? 'Save changes'
                        : created
                        ? 'Retry login setup'
                        : loginEnabled
                        ? 'Create technician and login'
                        : 'Create technician'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          {/* Right Sticky Aside Checklist */}
          <aside className="card aside" aria-label="Checklist">
            <h3>Before you create</h3>
            <ul className="chk" id="chk">
              <li className={values.reference.trim().length > 1 ? 'ok' : ''}>Reference added</li>
              <li className={values.fullName.trim().length > 1 ? 'ok' : ''}>Full name added</li>
              <li className={values.region ? 'ok' : ''}>Region selected</li>
              <li className={`optl${values.skills.length > 0 ? ' ok' : ''}`}>At least one skill</li>
              <li
                className={`optl${
                  !loginEnabled || (loginDraft.username.trim().length > 0 && loginDraft.password.length >= 12)
                    ? ' ok'
                    : ''
                }`}
              >
                Login access (optional)
              </li>
            </ul>
            <div className="tip">
              Inactive technicians stay on record but are excluded from new assignments.
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default TechnicianForm
