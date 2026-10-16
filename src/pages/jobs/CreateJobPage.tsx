import { useEffect, useState, useRef } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

import { ASSET_TYPE_LABELS } from '../../constants/asset'
import {
  PRIORITY_LABELS,
  REGIONS,
  REGION_LABELS,
  SERVICE_CATEGORY_LABELS,
} from '../../constants/job'
import { getAssetsByCustomerId } from '../../services/assetService'
import { getAllCustomers } from '../../services/customerService'
import { createJob } from '../../services/jobService'
import type { AssetResponse } from '../../types/asset'
import type { CustomerResponse, ValidationProblemDetails } from '../../types/customer'
import type { JobResponse, Priority, Region, ServiceCategory } from '../../types/job'
import './CreateJobPage.css'

// Development fallback data matching prototype when backend is offline
const DEV_FALLBACK_CUSTOMERS: CustomerResponse[] = [
  { id: 'cust-ben-dover', name: 'Ben Dover', phone: '0797834567', address: '456 Hill Rd', customerType: 'INDIVIDUAL', email: null, status: 'ACTIVE', createdAt: '', updatedAt: '' },
  { id: 'cust-hirusha', name: 'Hirusha', phone: '0762001635', address: '202 Corporate Blvd', customerType: 'BUSINESS', email: null, status: 'ACTIVE', createdAt: '', updatedAt: '' },
  { id: 'cust-bean', name: 'Bean', phone: '0787644996', address: '123 Park Ave', customerType: 'INDIVIDUAL', email: null, status: 'INACTIVE', createdAt: '', updatedAt: '' },
  { id: 'cust-staging-mismatch', name: 'Staging Mismatch 1788095477', phone: '0768095477', address: '789 Lake Way', customerType: 'INDIVIDUAL', email: null, status: 'INACTIVE', createdAt: '', updatedAt: '' },
  { id: 'cust-staging-job-smoke', name: 'Staging Job Smoke 1788095442', phone: '0778095442', address: '101 Pine St', customerType: 'INDIVIDUAL', email: null, status: 'INACTIVE', createdAt: '', updatedAt: '' },
  { id: 'cust-assms-asset-staging', name: 'ASSMS Asset Staging 20260828073805', phone: '+94762001631', address: '303 Oak St', customerType: 'INDIVIDUAL', email: null, status: 'INACTIVE', createdAt: '', updatedAt: '' },
  { id: 'cust-assms-staging-smoke', name: 'ASSMS Staging Smoke 20260827121742', phone: '+947720260827121742', address: '404 Elm St', customerType: 'INDIVIDUAL', email: null, status: 'INACTIVE', createdAt: '', updatedAt: '' },
]

const DEV_FALLBACK_ASSETS: Record<string, AssetResponse[]> = {
  'cust-ben-dover': [
    { id: 'ast-1', customerId: 'cust-ben-dover', assetType: 'AIR_CONDITIONER', model: 'Inverter 12000 BTU', serialNumber: 'AC-12345', installationDate: '2026-01-01', location: 'Living room', notes: '', status: 'ACTIVE', createdAt: '', updatedAt: '' },
    { id: 'ast-2', customerId: 'cust-ben-dover', assetType: 'REFRIGERATOR', model: 'Double door', serialNumber: 'RF-67890', installationDate: '2026-02-01', location: 'Kitchen', notes: '', status: 'ACTIVE', createdAt: '', updatedAt: '' },
  ],
  'cust-hirusha': [
    { id: 'ast-3', customerId: 'cust-hirusha', assetType: 'WATER_HEATER', model: 'Instant 3.5 kW', serialNumber: 'WH-54321', installationDate: '2026-03-01', location: 'Bathroom', notes: '', status: 'ACTIVE', createdAt: '', updatedAt: '' },
  ],
  'cust-assms-asset-staging': [
    { id: 'ast-4', customerId: 'cust-assms-asset-staging', assetType: 'AIR_CONDITIONER', model: 'Staging unit', serialNumber: 'AC-99999', installationDate: '2026-04-01', location: 'Office', notes: '', status: 'ACTIVE', createdAt: '', updatedAt: '' },
  ],
}

function CreateJobPage() {
  const navigate = useNavigate()

  // Form field states
  const [customerId, setCustomerId] = useState('')
  const [assetId, setAssetId] = useState('')
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>('INSTALLATION')
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [region, setRegion] = useState<Region | ''>('')
  const [problemDescription, setProblemDescription] = useState('')

  // Customer options state
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [customersLoading, setCustomersLoading] = useState(true)
  const [customersError, setCustomersError] = useState<string | null>(null)

  // Asset options state
  const [assets, setAssets] = useState<AssetResponse[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [assetsError, setAssetsError] = useState<string | null>(null)
  const [assetHint, setAssetHint] = useState<string | null>(null)

  // Validation & status states
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<JobResponse | null>(null)

  // Toast state
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

  // Set page document title
  useEffect(() => {
    document.title = 'ASSMS · New service job'
  }, [])

  // Load active customers
  useEffect(() => {
    async function load() {
      try {
        const data = await getAllCustomers('ACTIVE')
        setCustomers(data)
      } catch {
        setCustomersError('Could not load customers. Check that the customer service is running.')
        if (import.meta.env.DEV) {
          setCustomers(DEV_FALLBACK_CUSTOMERS)
        }
      } finally {
        setCustomersLoading(false)
      }
    }

    void load()
  }, [])

  // Load assets when customerId changes
  useEffect(() => {
    if (!customerId) return

    let cancelled = false

    async function loadAssets() {
      setAssetsLoading(true)
      setAssetsError(null)
      try {
        const owned = await getAssetsByCustomerId(customerId)
        if (cancelled) return

        const activeAssets = owned.filter((a) => a.status === 'ACTIVE')
        setAssets(activeAssets)
        if (activeAssets.length === 1) {
          setAssetId(activeAssets[0].id)
        } else if (activeAssets.length === 0) {
          setAssetHint('This customer has no active assets. Register an asset first.')
        }
      } catch {
        if (cancelled) return
        if (import.meta.env.DEV && DEV_FALLBACK_ASSETS[customerId]) {
          const fallback = DEV_FALLBACK_ASSETS[customerId]
          setAssets(fallback)
          if (fallback.length === 1) {
            setAssetId(fallback[0].id)
          }
        } else {
          setAssets([])
          setAssetsError('Could not load this customer’s assets.')
          setAssetHint('This customer has no assets. Register an asset first.')
        }
      } finally {
        if (!cancelled) {
          setAssetsLoading(false)
        }
      }
    }

    void loadAssets()

    return () => {
      cancelled = true
    }
  }, [customerId])

  function handleCustomerChange(e: ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setCustomerId(val)
    setAssetId('')
    setAssets([])
    setAssetHint(null)
    if (errors.customerId) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.customerId
        return next
      })
    }
  }

  function handleAssetChange(e: ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setAssetId(val)
    if (errors.assetId) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.assetId
        return next
      })
    }
  }

  function handleRegionChange(e: ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as Region | ''
    setRegion(val)
    if (errors.region) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.region
        return next
      })
    }
  }

  function handleProblemChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setProblemDescription(val)
    if (errors.problemDescription && val.trim().length >= 5) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.problemDescription
        return next
      })
    }
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {}
    if (!customerId) {
      nextErrors.customerId = 'Choose a customer.'
    }
    if (!assetId) {
      nextErrors.assetId = 'Choose the asset that needs service.'
    }
    if (!region) {
      nextErrors.region = 'Select the province the work is in.'
    }
    if (!problemDescription.trim() || problemDescription.trim().length < 5) {
      nextErrors.problemDescription = 'Describe the problem (at least a few words).'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      showToast('Please fix the highlighted fields')
      // Focus first error element
      if (nextErrors.customerId) {
        document.getElementById('cust')?.focus()
      } else if (nextErrors.assetId) {
        document.getElementById('asset')?.focus()
      } else if (nextErrors.region) {
        document.getElementById('region')?.focus()
      } else if (nextErrors.problemDescription) {
        document.getElementById('desc')?.focus()
      }
      return false
    }

    return true
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    if (!validate()) {
      return
    }

    setSubmitting(true)

    try {
      const job = await createJob({
        customerId,
        assetId,
        serviceCategory,
        problemDescription: problemDescription.trim(),
        priority,
        region: region as Region,
      })

      setCreated(job)
    } catch (err) {
      if (axios.isAxiosError<ValidationProblemDetails>(err)) {
        const problem = err.response?.data
        if (problem?.errors) {
          const mapped: Record<string, string> = {}
          for (const [key, msgs] of Object.entries(problem.errors)) {
            mapped[key] = msgs.join(' ')
          }
          setErrors(mapped)
          showToast('Please fix the highlighted fields')
        } else {
          setFormError(
            [problem?.title, problem?.detail].filter(Boolean).join(' ') ||
              'Could not reach the job service. Try again.'
          )
          showToast('Could not create job. Try again.')
        }
      } else if (import.meta.env.DEV) {
        // Dev fallback mock response
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
        let ref = 'JOB-'
        for (let i = 0; i < 6; i++) {
          ref += chars[Math.floor(Math.random() * chars.length)]
        }
        setCreated({
          id: 'mock-' + Date.now(),
          jobReference: ref,
          customerId,
          assetId,
          serviceCategory,
          problemDescription: problemDescription.trim(),
          priority,
          region: region as Region,
          scheduledDate: null,
          createdBy: '00000000-0000-0000-0000-000000000000',
          status: 'CREATED',
          assignment: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      } else {
        setFormError('Something went wrong while creating the job.')
        showToast('Something went wrong while creating the job.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleCreateAnother() {
    setCustomerId('')
    setAssetId('')
    setServiceCategory('INSTALLATION')
    setPriority('MEDIUM')
    setRegion('')
    setProblemDescription('')
    setErrors({})
    setFormError(null)
    setCreated(null)
    setAssetHint(null)
    setTimeout(() => {
      document.getElementById('cust')?.focus()
    }, 50)
  }

  function handleCancel() {
    navigate('/jobs')
  }

  function assetPlaceholder(): string {
    if (!customerId) return 'Select a customer first'
    if (assetsLoading) return 'Loading assets...'
    if (assets.length === 0) return 'No assets registered yet'
    return 'Select an asset'
  }

  const selectedCustomer = customers.find((c) => c.id === customerId)
  const selectedCustomerName = selectedCustomer ? selectedCustomer.name : 'customer'

  return (
    <div className="new-job-container">
      <Link className="back" to="/jobs">
        &larr; Back to jobs
      </Link>
      <h1>New service job</h1>
      <p className="sub">Raise a service job against a customer’s unit.</p>

      <div className="stage">
        <div className="layout">
          <div className="card">
            {created ? (
              <div className="done show" id="done">
                <div className="tick">&#10003;</div>
                <h2>Job created</h2>
                <p>
                  <span className="ref" id="ref">
                    {created.jobReference}
                  </span>
                </p>
                <p id="dp">
                  {SERVICE_CATEGORY_LABELS[created.serviceCategory]} &middot;{' '}
                  {PRIORITY_LABELS[created.priority]} priority &middot;{' '}
                  {REGION_LABELS[created.region]} for {selectedCustomerName}.
                </p>
                <div className="btns">
                  <button className="btn" id="again" type="button" onClick={handleCreateAnother}>
                    Create another
                  </button>
                  <Link className="ghost" to="/jobs">
                    Back to jobs
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="legend">
                  Fields marked with <span className="star">*</span> are required.
                </div>

                {formError && (
                  <div className="alert alert-danger mx-4 my-3" role="alert">
                    {formError}
                  </div>
                )}
                {customersError && !import.meta.env.DEV && (
                  <div className="alert alert-danger mx-4 my-3" role="alert">
                    {customersError}
                  </div>
                )}
                {assetsError && !import.meta.env.DEV && (
                  <div className="alert alert-danger mx-4 my-3" role="alert">
                    {assetsError}
                  </div>
                )}

                <form id="form" onSubmit={handleSubmit} noValidate>
                  {/* Section 1: Customer and unit */}
                  <div className="sec">
                    <h2>Customer and unit</h2>
                    <p>Which customer and which piece of equipment?</p>
                    <div className="grid2">
                      <label className="f">
                        <span>
                          Customer<b className="star" aria-hidden="true">*</b>
                        </span>
                        <select
                          className={`inp${errors.customerId ? ' bad' : ''}`}
                          id="cust"
                          aria-required="true"
                          value={customerId}
                          onChange={handleCustomerChange}
                          disabled={customersLoading || (Boolean(customersError) && !import.meta.env.DEV)}
                        >
                          <option value="">
                            {customersLoading ? 'Loading customers…' : 'Select a customer'}
                          </option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {errors.customerId && <em className="err">{errors.customerId}</em>}
                      </label>

                      <label className="f">
                        <span>
                          Asset<b className="star" aria-hidden="true">*</b>
                        </span>
                        <select
                          className={`inp${errors.assetId ? ' bad' : ''}`}
                          id="asset"
                          aria-required="true"
                          value={assetId}
                          onChange={handleAssetChange}
                          disabled={!customerId || assetsLoading || assets.length === 0}
                        >
                          <option value="">{assetPlaceholder()}</option>
                          {assets.map((a) => (
                            <option key={a.id} value={a.id}>
                              {ASSET_TYPE_LABELS[a.assetType] || a.assetType} &middot; {a.model}
                            </option>
                          ))}
                        </select>
                        {errors.assetId && <em className="err">{errors.assetId}</em>}
                        {assetHint && (
                          <small className="hint" id="assetHint">
                            {assetHint}{' '}
                            <Link to="/assets/new">Register an asset</Link> first.
                          </small>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Section 2: Service */}
                  <div className="sec">
                    <h2>Service</h2>
                    <p>What kind of work is it, and how urgent?</p>

                    <span className="sublabel">
                      Service category<b className="star" aria-hidden="true"> *</b>
                    </span>
                    <div className="chips" role="radiogroup" aria-label="Service category">
                      <label className="pill">
                        <input
                          type="radio"
                          name="cat"
                          value="INSTALLATION"
                          checked={serviceCategory === 'INSTALLATION'}
                          onChange={() => setServiceCategory('INSTALLATION')}
                        />
                        <span>Installation</span>
                      </label>
                      <label className="pill">
                        <input
                          type="radio"
                          name="cat"
                          value="REPAIR"
                          checked={serviceCategory === 'REPAIR'}
                          onChange={() => setServiceCategory('REPAIR')}
                        />
                        <span>Repair</span>
                      </label>
                      <label className="pill">
                        <input
                          type="radio"
                          name="cat"
                          value="MAINTENANCE"
                          checked={serviceCategory === 'MAINTENANCE'}
                          onChange={() => setServiceCategory('MAINTENANCE')}
                        />
                        <span>Maintenance</span>
                      </label>
                    </div>

                    <span className="sublabel gap">
                      Priority<b className="star" aria-hidden="true"> *</b>
                    </span>
                    <div className="chips" role="radiogroup" aria-label="Priority">
                      <label className="pill pr" style={{ '--c': '#8aa196' } as React.CSSProperties}>
                        <input
                          type="radio"
                          name="pri"
                          value="LOW"
                          checked={priority === 'LOW'}
                          onChange={() => setPriority('LOW')}
                        />
                        <span>Low</span>
                      </label>
                      <label className="pill pr" style={{ '--c': '#3b82c4' } as React.CSSProperties}>
                        <input
                          type="radio"
                          name="pri"
                          value="MEDIUM"
                          checked={priority === 'MEDIUM'}
                          onChange={() => setPriority('MEDIUM')}
                        />
                        <span>Medium</span>
                      </label>
                      <label className="pill pr" style={{ '--c': '#e8892b' } as React.CSSProperties}>
                        <input
                          type="radio"
                          name="pri"
                          value="HIGH"
                          checked={priority === 'HIGH'}
                          onChange={() => setPriority('HIGH')}
                        />
                        <span>High</span>
                      </label>
                      <label className="pill pr" style={{ '--c': '#d92d20' } as React.CSSProperties}>
                        <input
                          type="radio"
                          name="pri"
                          value="URGENT"
                          checked={priority === 'URGENT'}
                          onChange={() => setPriority('URGENT')}
                        />
                        <span>Urgent</span>
                      </label>
                    </div>
                  </div>

                  {/* Section 3: Location */}
                  <div className="sec">
                    <h2>Location</h2>
                    <p>Where is the work?</p>
                    <label className="f">
                      <span>
                        Region<b className="star" aria-hidden="true">*</b>
                      </span>
                      <select
                        className={`inp${errors.region ? ' bad' : ''}`}
                        id="region"
                        aria-required="true"
                        value={region}
                        onChange={handleRegionChange}
                      >
                        <option value="">Select a province</option>
                        {REGIONS.map((r) => (
                          <option key={r} value={r}>
                            {REGION_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      {errors.region && <em className="err">{errors.region}</em>}
                      <small className="hint">
                        The province the work is in. Dispatch uses it to find a technician who covers the area.
                      </small>
                    </label>
                  </div>

                  {/* Section 4: Problem */}
                  <div className="sec" style={{ borderBottom: 0 }}>
                    <h2>Problem</h2>
                    <p>Describe what’s wrong so the technician comes prepared.</p>
                    <label className="f">
                      <span>
                        Problem description<b className="star" aria-hidden="true">*</b>
                      </span>
                      <textarea
                        className={`inp${errors.problemDescription ? ' bad' : ''}`}
                        id="desc"
                        maxLength={500}
                        aria-required="true"
                        placeholder="e.g. Unit is not cooling and makes a rattling noise"
                        value={problemDescription}
                        onChange={handleProblemChange}
                      />
                      {errors.problemDescription && (
                        <em className="err">{errors.problemDescription}</em>
                      )}
                      <small className="count" id="cnt">
                        {problemDescription.length} / 500
                      </small>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="actions">
                    <button type="button" className="ghost" id="cancel" onClick={handleCancel}>
                      Cancel
                    </button>
                    <button className="btn" type="submit" disabled={submitting}>
                      {submitting ? 'Creating...' : 'Create job'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          {/* Right sticky aside checklist */}
          <aside className="card aside" aria-label="Checklist">
            <h3>Before you create</h3>
            <ul className="chk" id="chk">
              <li className={customerId ? 'ok' : ''}>Customer selected</li>
              <li className={assetId ? 'ok' : ''}>Asset selected</li>
              <li className="ok">Category and priority set</li>
              <li className={region ? 'ok' : ''}>Region selected</li>
              <li className={problemDescription.trim().length >= 5 ? 'ok' : ''}>Problem described</li>
            </ul>
            <div className="tip">
              A clear description and the right region help dispatch assign the job to a technician faster.
            </div>
          </aside>
        </div>
      </div>

      <div className={`toast${toastMessage ? ' show' : ''}`} id="toast" role="status">
        {toastMessage}
      </div>
    </div>
  )
}

export default CreateJobPage
