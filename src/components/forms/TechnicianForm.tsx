import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import axios from 'axios'

import { REGIONS, REGION_LABELS, TECHNICIAN_SKILLS } from '../../constants/technician'
import { createTechnician, updateTechnician } from '../../services/dispatchService'
import type { ValidationProblemDetails } from '../../types/customer'
import type { CreateTechnicianRequest, TechnicianResponse, UpdateTechnicianRequest } from '../../types/technician'
import TechnicianLoginFields from './TechnicianLoginFields'
import { EMPTY_LOGIN, validateLogin } from './technicianLoginDraft'
import { createTechnicianAccount, getTechnicianAccount, loginSetupError } from '../../services/technicianAccounts'
import { Link } from 'react-router-dom'

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
  const [values, setValues] = useState<FormValues>(() => existing ? {
    reference: existing.reference, fullName: existing.fullName, region: existing.region, skills: [...existing.skills],
    status: existing.status, phone: existing.phone ?? '', email: existing.email ?? '',
  } : EMPTY_FORM)
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setFormError(null)
    if (isEdit) setCreated(null)
    setLoginError('')
    if (!isEdit && loginEnabled) {
      const validation = validateLogin(loginDraft)
      if (validation) { setLoginError(validation); return }
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
        : created ?? await createTechnician(request)
      setCreated(technician)
      if (!isEdit && loginEnabled) {
        try {
          await createTechnicianAccount(technician.id, { username: loginDraft.username.trim(), email: loginDraft.email.trim(), password: loginDraft.password })
          setLoginComplete(true)
          setLoginDraft({ ...EMPTY_LOGIN })
        } catch (cause) {
          try {
            if (await getTechnicianAccount(technician.id)) {
              setLoginComplete(true); setLoginDraft({ ...EMPTY_LOGIN }); return
            }
          } catch { /* Keep the provisioning error and saved technician. */ }
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

  function errorsFor(field: string) {
    const errors = fieldErrors[field]
    return errors?.length ? <ul className="invalid-feedback list-unstyled mb-0">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : null
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && <p className="alert alert-danger" role="alert">{formError}</p>}
      {created && <p className="alert alert-success" role="status">{isEdit ? 'Updated' : 'Created'} {created.fullName} ({created.reference}).</p>}

      <fieldset disabled={submitting || (!isEdit && Boolean(created))}>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor="reference">Technician reference</label>
          <input id="reference" name="reference" className={`form-control${fieldErrors.reference ? ' is-invalid' : ''}`} maxLength={30} placeholder="TEC-032 or technician.local" value={values.reference} onChange={handleChange} aria-invalid={Boolean(fieldErrors.reference)} aria-describedby="reference-help" disabled={isEdit} />
          <p id="reference-help" className="form-text">Business reference for this technician. Login access is linked by technician ID, so the username can be different.</p>
          {errorsFor('reference')}
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="fullName">Full name</label>
          <input id="fullName" name="fullName" className={`form-control${fieldErrors.fullName ? ' is-invalid' : ''}`} maxLength={150} value={values.fullName} onChange={handleChange} aria-invalid={Boolean(fieldErrors.fullName)} />
          {errorsFor('fullName')}
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="region">Region</label>
          <select id="region" name="region" className={`form-select${fieldErrors.region ? ' is-invalid' : ''}`} value={values.region} onChange={handleChange} aria-invalid={Boolean(fieldErrors.region)}>
            <option value="">Select a province</option>
            {REGIONS.map((region) => <option key={region} value={region}>{REGION_LABELS[region]}</option>)}
          </select>
          {errorsFor('region')}
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="status">Status</label>
          <select id="status" name="status" className={`form-select${fieldErrors.status ? ' is-invalid' : ''}`} value={values.status} onChange={handleChange} aria-invalid={Boolean(fieldErrors.status)}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <p className="form-text mb-0">Only active technicians can be considered for future assignment.</p>
          {errorsFor('status')}
        </div>
        <fieldset className="col-12">
          <legend className="form-label">Skills</legend>
          <div className={`d-flex flex-wrap gap-2${fieldErrors.skills ? ' is-invalid' : ''}`}>
            {TECHNICIAN_SKILLS.map((skill) => (
              <div className="form-check" key={skill}>
                <input className="form-check-input" id={`skill-${skill}`} type="checkbox" checked={values.skills.includes(skill)} onChange={() => toggleSkill(skill)} />
                <label className="form-check-label" htmlFor={`skill-${skill}`}>{skill}</label>
              </div>
            ))}
          </div>
          {errorsFor('skills')}
        </fieldset>
        <div className="col-md-6">
          <label className="form-label" htmlFor="phone">Phone <span className="text-muted">(optional)</span></label>
          <input id="phone" name="phone" type="tel" className={`form-control${fieldErrors.phone ? ' is-invalid' : ''}`} maxLength={30} value={values.phone} onChange={handleChange} aria-invalid={Boolean(fieldErrors.phone)} />
          {errorsFor('phone')}
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="email">Email <span className="text-muted">(optional)</span></label>
          <input id="email" name="email" type="email" className={`form-control${fieldErrors.email ? ' is-invalid' : ''}`} maxLength={254} value={values.email} onChange={handleChange} aria-invalid={Boolean(fieldErrors.email)} />
          {errorsFor('email')}
        </div>
      </div>
      </fieldset>

      <div className="alert alert-light border mt-4 mb-3" role="note">
        {isEdit ? 'This updates the technician record. Manage login access from technician details.' : 'Optionally create login access below. Only the Technician role is assigned.'}
      </div>
      {!isEdit && <div className="mb-4">
        <div className="form-check mb-3"><input id="create-login" type="checkbox" className="form-check-input" checked={loginEnabled} disabled={submitting || Boolean(created)} onChange={(e) => setLoginEnabled(e.target.checked)} />
          <label className="form-check-label" htmlFor="create-login">Create login access for this technician</label></div>
        {loginEnabled && !loginComplete && <fieldset disabled={submitting}><TechnicianLoginFields value={loginDraft} onChange={setLoginDraft} /></fieldset>}
        {loginError && <p className="alert alert-warning mt-3" role="alert">{created ? 'Technician created; login setup pending. ' : ''}{loginError}</p>}
        {loginComplete && <p role="status" className="alert alert-success">Technician login created and linked. Share the initial password privately.</p>}
      </div>}
      <button type="submit" className="btn btn-primary" disabled={submitting || (!isEdit && Boolean(created) && (!loginEnabled || loginComplete))}>{submitting ? (isEdit ? 'Saving...' : 'Creating...') : isEdit ? 'Save changes' : created ? 'Retry login setup' : loginEnabled ? 'Create technician and login' : 'Create technician'}</button>
      {created && <Link className="btn btn-outline-primary ms-2" to={`/technicians/${created.id}`}>View technician / login setup</Link>}
    </form>
  )
}

export default TechnicianForm
