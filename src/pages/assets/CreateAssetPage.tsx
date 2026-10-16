import { useEffect, useState, useRef, type FormEvent, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

import { ASSET_TYPES, ASSET_TYPE_LABELS } from '../../constants/asset'
import { createAsset } from '../../services/assetService'
import { getAllCustomers } from '../../services/customerService'
import type { AssetResponse, AssetType } from '../../types/asset'
import type { CustomerResponse, ValidationProblemDetails } from '../../types/customer'
import { parseApiError } from '../../utils/formatApiError'
import './CreateAssetPage.css'

const DEV_FALLBACK_CUSTOMERS: CustomerResponse[] = [
  { id: '1', name: 'Ben Dover', phone: '0797834567', address: '456 Hill Rd', customerType: 'INDIVIDUAL', email: null, status: 'ACTIVE', createdAt: '', updatedAt: '' },
  { id: '2', name: 'Hirusha', phone: '0762001635', address: '202 Corporate Blvd', customerType: 'BUSINESS', email: null, status: 'ACTIVE', createdAt: '', updatedAt: '' },
  { id: '3', name: 'Bean', phone: '0787644996', address: '123 Park Ave', customerType: 'INDIVIDUAL', email: null, status: 'INACTIVE', createdAt: '', updatedAt: '' },
  { id: '4', name: 'Staging Mismatch 1788095477', phone: '0768095477', address: '789 Lake Way', customerType: 'INDIVIDUAL', email: null, status: 'INACTIVE', createdAt: '', updatedAt: '' },
  { id: '5', name: 'Staging Job Smoke 1788095442', phone: '0778095442', address: '101 Pine St', customerType: 'INDIVIDUAL', email: null, status: 'INACTIVE', createdAt: '', updatedAt: '' },
  { id: '6', name: 'ASSMS Asset Staging 20260828073805', phone: '+94762001631', address: '303 Oak St', customerType: 'INDIVIDUAL', email: null, status: 'INACTIVE', createdAt: '', updatedAt: '' },
  { id: '7', name: 'ASSMS Staging Smoke 20260827121742', phone: '+947720260827121742', address: '404 Elm St', customerType: 'INDIVIDUAL', email: null, status: 'INACTIVE', createdAt: '', updatedAt: '' },
]

export default function CreateAssetPage() {
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)

  // Customer options state
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [customersLoading, setCustomersLoading] = useState(true)

  // Form field state
  const [customerId, setCustomerId] = useState('')
  const [assetType, setAssetType] = useState<AssetType>(ASSET_TYPES[0])
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [installationDate, setInstallationDate] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  // Validation & status state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<AssetResponse | null>(null)

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(message: string) {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setToastMessage(message)
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null)
    }, 2200)
  }

  useEffect(() => {
    async function loadCustomers() {
      try {
        const data = await getAllCustomers('ACTIVE')
        setCustomers(data)
      } catch (err) {
        if (import.meta.env.DEV) {
          setCustomers(DEV_FALLBACK_CUSTOMERS)
        } else {
          const parsed = parseApiError(err, 'Could not load active customers.')
          setFormError(parsed.message)
        }
      } finally {
        setCustomersLoading(false)
      }
    }
    void loadCustomers()
  }, [])

  // Live checklist evaluations
  const isCustOk = customerId !== ''
  const isModelOk = model.trim().length > 0
  const isSerialOk = serialNumber.trim().length > 2
  const isDateOk = installationDate !== '' && installationDate <= today
  const isLocOk = location.trim().length > 1
  const isNotesProvided = notes.trim().length > 0

  function clearFieldError(field: string) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  function handleCustomerChange(e: ChangeEvent<HTMLSelectElement>) {
    setCustomerId(e.target.value)
    clearFieldError('cust')
    clearFieldError('customerId')
  }

  function handleModelChange(e: ChangeEvent<HTMLInputElement>) {
    setModel(e.target.value)
    clearFieldError('model')
  }

  function handleSerialChange(e: ChangeEvent<HTMLInputElement>) {
    setSerialNumber(e.target.value)
    clearFieldError('serial')
    clearFieldError('serialNumber')
  }

  function handleDateChange(e: ChangeEvent<HTMLInputElement>) {
    setInstallationDate(e.target.value)
    clearFieldError('date')
    clearFieldError('installationDate')
  }

  function handleLocationChange(e: ChangeEvent<HTMLInputElement>) {
    setLocation(e.target.value)
    clearFieldError('loc')
    clearFieldError('location')
  }

  function handleNotesChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setNotes(e.target.value)
    clearFieldError('notes')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const errors: Record<string, string> = {}
    if (!isCustOk) errors.cust = 'Choose a customer.'
    if (!isModelOk) errors.model = 'Enter the model.'
    if (!isSerialOk) errors.serial = 'Enter the serial number.'
    if (!isDateOk) errors.date = 'Pick a date that isn’t in the future.'
    if (!isLocOk) errors.loc = 'Enter where the asset is installed.'

    setFieldErrors(errors)
    setFormError(null)

    if (Object.keys(errors).length > 0) {
      showToast('Please fix the highlighted fields')
      const firstKey = Object.keys(errors)[0]
      document.getElementById(firstKey)?.focus()
      return
    }

    setSubmitting(true)

    const request = {
      customerId,
      assetType,
      model: model.trim(),
      serialNumber: serialNumber.trim(),
      installationDate: installationDate || null,
      location: location.trim(),
      notes: notes.trim() ? notes.trim() : null,
    }

    try {
      const response = await createAsset(request)
      setCreated(response)
      showToast(`${ASSET_TYPE_LABELS[assetType]} registered`)
    } catch (caught) {
      if (axios.isAxiosError<ValidationProblemDetails>(caught)) {
        const problem = caught.response?.data
        if (problem?.errors) {
          const apiFieldErrors: Record<string, string> = {}
          Object.entries(problem.errors).forEach(([key, messages]) => {
            if (messages && messages.length > 0) {
              const lowerKey = key.toLowerCase()
              const mappedKey = lowerKey === 'customerid' ? 'cust'
                : lowerKey === 'serialnumber' ? 'serial'
                : lowerKey === 'installationdate' ? 'date'
                : lowerKey === 'location' ? 'loc'
                : lowerKey
              apiFieldErrors[mappedKey] = messages[0]
            }
          })
          setFieldErrors(apiFieldErrors)
          showToast('Please fix the highlighted fields')
        } else {
          const detail = [problem?.title, problem?.detail].filter(Boolean).join(' ') ||
            'Could not reach asset service. Please try again.'
          setFormError(detail)
          showToast(detail)
        }
      } else if (import.meta.env.DEV) {
        // Dev fallback when backend is offline
        const fallbackCreated: AssetResponse = {
          id: String(Date.now()),
          customerId,
          assetType,
          model: model.trim(),
          serialNumber: serialNumber.trim(),
          installationDate: installationDate || today,
          location: location.trim(),
          notes: notes.trim() ? notes.trim() : null,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setCreated(fallbackCreated)
        showToast(`${ASSET_TYPE_LABELS[assetType]} registered`)
      } else {
        const message = 'Something went wrong while creating the asset.'
        setFormError(message)
        showToast(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleRegisterAnother() {
    setCustomerId('')
    setAssetType(ASSET_TYPES[0])
    setModel('')
    setSerialNumber('')
    setInstallationDate('')
    setLocation('')
    setNotes('')
    setFieldErrors({})
    setFormError(null)
    setCreated(null)
    setTimeout(() => {
      document.getElementById('cust')?.focus()
    }, 50)
  }

  const selectedCustomerName = customers.find((c) => c.id === customerId)?.name || 'customer'

  return (
    <div className="create-asset-container">
      <Link className="back" to="/customers">
        ← Back to customers
      </Link>
      <h1>New asset</h1>
      <p className="sub">Register equipment against a customer.</p>

      <div className="stage">
        <div className="layout">
          <div className="card">
            <div className="legend">
              Fields marked with <span className="star">*</span> are required.
            </div>

            {formError && (
              <div style={{ padding: '16px 28px 0' }}>
                <p className="alert alert-danger" role="alert" style={{ margin: 0 }}>
                  {formError}
                </p>
              </div>
            )}

            {!created ? (
              <form id="form" onSubmit={handleSubmit} noValidate>
                {/* Section 1: Customer */}
                <div className="sec">
                  <h2>Customer</h2>
                  <p>Who owns this equipment?</p>
                  <label className="f">
                    <span>
                      Customer<b className="star" aria-hidden="true">*</b>
                    </span>
                    <select
                      className={`inp ${fieldErrors.cust ? 'bad' : ''}`}
                      id="cust"
                      aria-required="true"
                      value={customerId}
                      onChange={handleCustomerChange}
                    >
                      <option value="">
                        {customersLoading ? 'Loading customers...' : 'Select a customer'}
                      </option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <em className="err">{fieldErrors.cust || 'Choose a customer.'}</em>
                  </label>
                </div>

                {/* Section 2: Asset Type */}
                <div className="sec">
                  <h2>
                    Asset type<b className="star" aria-hidden="true"> *</b>
                  </h2>
                  <p>What kind of equipment is it?</p>
                  <div
                    className="chips"
                    role="radiogroup"
                    aria-label="Asset type"
                    aria-required="true"
                  >
                    {ASSET_TYPES.map((typeKey) => (
                      <label key={typeKey} className="pill">
                        <input
                          type="radio"
                          name="type"
                          value={typeKey}
                          checked={assetType === typeKey}
                          onChange={() => setAssetType(typeKey)}
                        />
                        <span>{ASSET_TYPE_LABELS[typeKey]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Section 3: Equipment Details */}
                <div className="sec">
                  <h2>Equipment details</h2>
                  <p>Helps technicians identify the exact unit.</p>
                  <div className="grid2">
                    <label className="f">
                      <span>
                        Model<b className="star" aria-hidden="true">*</b>
                      </span>
                      <input
                        className={`inp ${fieldErrors.model ? 'bad' : ''}`}
                        id="model"
                        autoComplete="off"
                        aria-required="true"
                        placeholder="e.g. Inverter 12000 BTU"
                        value={model}
                        onChange={handleModelChange}
                      />
                      <em className="err">{fieldErrors.model || 'Enter the model.'}</em>
                    </label>

                    <label className="f">
                      <span>
                        Serial number<b className="star" aria-hidden="true">*</b>
                      </span>
                      <input
                        className={`inp ${fieldErrors.serial ? 'bad' : ''}`}
                        id="serial"
                        autoComplete="off"
                        aria-required="true"
                        placeholder="e.g. SN-48201937"
                        value={serialNumber}
                        onChange={handleSerialChange}
                      />
                      <em className="err">{fieldErrors.serial || 'Enter the serial number.'}</em>
                    </label>

                    <label className="f">
                      <span>
                        Installation date<b className="star" aria-hidden="true">*</b>
                      </span>
                      <input
                        className={`inp ${fieldErrors.date ? 'bad' : ''}`}
                        id="date"
                        type="date"
                        max={today}
                        aria-required="true"
                        value={installationDate}
                        onChange={handleDateChange}
                      />
                      <em className="err">{fieldErrors.date || 'Pick a date that isn’t in the future.'}</em>
                    </label>

                    <label className="f">
                      <span>
                        Location<b className="star" aria-hidden="true">*</b>
                      </span>
                      <input
                        className={`inp ${fieldErrors.loc ? 'bad' : ''}`}
                        id="loc"
                        autoComplete="off"
                        aria-required="true"
                        placeholder="e.g. Living room, 2nd floor"
                        value={location}
                        onChange={handleLocationChange}
                      />
                      <em className="err">{fieldErrors.loc || 'Enter where the asset is installed.'}</em>
                    </label>
                  </div>
                </div>

                {/* Section 4: Notes */}
                <div className="sec" style={{ borderBottom: 0 }}>
                  <h2>Notes</h2>
                  <p>Anything the team should know.</p>
                  <label className="f">
                    <span>
                      Notes<i className="opt">(optional)</i>
                    </span>
                    <textarea
                      className="inp"
                      id="notes"
                      placeholder="e.g. Access through the side gate"
                      value={notes}
                      onChange={handleNotesChange}
                    />
                  </label>
                </div>

                {/* Section 5: Actions */}
                <div className="actions">
                  <button
                    type="button"
                    className="ghost"
                    id="cancel"
                    onClick={() => navigate('/customers')}
                  >
                    Cancel
                  </button>
                  <button className="btn" type="submit" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create asset'}
                  </button>
                </div>
              </form>
            ) : (
              /* Success Confirmation Card */
              <div className="done show" id="done">
                <div className="tick">✓</div>
                <h2 id="dt">{ASSET_TYPE_LABELS[created.assetType]} registered</h2>
                <p id="dp">
                  Added for {selectedCustomerName} at {created.location}.
                </p>
                <div className="btns">
                  <button
                    type="button"
                    className="btn"
                    id="again"
                    onClick={handleRegisterAnother}
                  >
                    Register another
                  </button>
                  <Link className="ghost" to="/customers">
                    Back to customers
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right Checklist Sidebar */}
          <aside className="card aside" aria-label="Checklist">
            <h3>Before you create</h3>
            <ul className="chk" id="chk">
              <li className={isCustOk ? 'ok' : ''} data-k="cust">
                Customer selected
              </li>
              <li className="ok">Asset type chosen</li>
              <li className={isModelOk ? 'ok' : ''} data-k="model">
                Model added
              </li>
              <li className={isSerialOk ? 'ok' : ''} data-k="serial">
                Serial number added
              </li>
              <li className={isDateOk ? 'ok' : ''} data-k="date">
                Installation date set
              </li>
              <li className={isLocOk ? 'ok' : ''} data-k="loc">
                Location added
              </li>
              <li className={`optl ${isNotesProvided ? 'ok' : ''}`}>
                Notes (optional)
              </li>
            </ul>
            <div className="tip">
              The serial number is usually on a sticker at the back or side of the unit.
            </div>
          </aside>
        </div>
      </div>

      {/* Floating Toast Notification */}
      <div
        className={`create-asset-toast ${toastMessage ? 'show' : ''}`}
        id="toast"
        role="status"
      >
        {toastMessage}
      </div>
    </div>
  )
}
