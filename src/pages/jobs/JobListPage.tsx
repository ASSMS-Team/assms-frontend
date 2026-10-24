import { useEffect, useState, useMemo } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import LoadingState from '../../components/feedback/LoadingState'
import ErrorState from '../../components/feedback/ErrorState'
import { getJobs } from '../../services/jobService'
import { getAllTechnicians } from '../../services/dispatchService'
import type { JobResponse } from '../../types/job'
import { useAuth } from '../../auth/useAuth'
import { parseApiError } from '../../utils/formatApiError'
import './JobListPage.css'

// Development fallback data matching the prototype when backend is offline
const DEV_FALLBACK_JOBS: JobResponse[] = [
  {
    id: 'job-vhnxjj',
    jobReference: 'JOB-VHNXJJ',
    customerId: 'cust-1',
    assetId: 'asset-1',
    serviceCategory: 'REPAIR',
    problemDescription: 'Compressor replacement needed',
    priority: 'URGENT',
    region: 'WESTERN',
    scheduledDate: null,
    createdBy: '00000000-0000-0000-0000-000000000000',
    status: 'Completed',
    assignment: {
      id: 'asg-1',
      technicianId: 'tec-034',
      technicianReference: 'TEC-034',
      assignedAt: '2026-09-10T10:00:00Z',
    },
    createdAt: '2026-09-10T08:00:00Z',
    updatedAt: '2026-09-10T14:00:00Z',
  },
  {
    id: 'job-0n5krx',
    jobReference: 'JOB-0N5KRX',
    customerId: 'cust-2',
    assetId: 'asset-2',
    serviceCategory: 'REPAIR',
    problemDescription: 'Power circuit failure',
    priority: 'URGENT',
    region: 'WESTERN',
    scheduledDate: null,
    createdBy: '00000000-0000-0000-0000-000000000000',
    status: 'Completed',
    assignment: {
      id: 'asg-2',
      technicianId: 'tec-034',
      technicianReference: 'TEC-034',
      assignedAt: '2026-09-11T09:00:00Z',
    },
    createdAt: '2026-09-11T08:30:00Z',
    updatedAt: '2026-09-11T12:00:00Z',
  },
  {
    id: 'job-efgh3t',
    jobReference: 'JOB-EFGH3T',
    customerId: 'cust-3',
    assetId: 'asset-3',
    serviceCategory: 'REPAIR',
    problemDescription: 'Refrigerant leak detection',
    priority: 'HIGH',
    region: 'WESTERN',
    scheduledDate: null,
    createdBy: '00000000-0000-0000-0000-000000000000',
    status: 'Completed',
    assignment: {
      id: 'asg-3',
      technicianId: 'tec-033',
      technicianReference: 'TEC-033',
      assignedAt: '2026-09-12T11:00:00Z',
    },
    createdAt: '2026-09-12T10:00:00Z',
    updatedAt: '2026-09-12T15:00:00Z',
  },
  {
    id: 'job-1ardn1',
    jobReference: 'JOB-1ARDN1',
    customerId: 'cust-4',
    assetId: 'asset-4',
    serviceCategory: 'REPAIR',
    problemDescription: 'Overheating components',
    priority: 'MEDIUM',
    region: 'WESTERN',
    scheduledDate: null,
    createdBy: '00000000-0000-0000-0000-000000000000',
    status: 'Completed',
    assignment: {
      id: 'asg-4',
      technicianId: 'tec-032',
      technicianReference: 'TEC-032',
      assignedAt: '2026-09-13T09:00:00Z',
    },
    createdAt: '2026-09-13T08:00:00Z',
    updatedAt: '2026-09-13T16:00:00Z',
  },
  {
    id: 'job-faytjt',
    jobReference: 'JOB-FAYTJT',
    customerId: 'cust-5',
    assetId: 'asset-5',
    serviceCategory: 'MAINTENANCE',
    problemDescription: 'Regular quarterly maintenance',
    priority: 'MEDIUM',
    region: 'WESTERN',
    scheduledDate: null,
    createdBy: '00000000-0000-0000-0000-000000000000',
    status: 'Created',
    assignment: null,
    createdAt: '2026-09-14T10:00:00Z',
    updatedAt: '2026-09-14T10:00:00Z',
  },
  {
    id: 'job-qgjw6c',
    jobReference: 'JOB-QGJW6C',
    customerId: 'cust-6',
    assetId: 'asset-6',
    serviceCategory: 'REPAIR',
    problemDescription: 'Fan motor squeaking',
    priority: 'MEDIUM',
    region: 'NORTHERN',
    scheduledDate: null,
    createdBy: '00000000-0000-0000-0000-000000000000',
    status: 'Created',
    assignment: null,
    createdAt: '2026-09-14T11:00:00Z',
    updatedAt: '2026-09-14T11:00:00Z',
  },
  {
    id: 'job-w42km3',
    jobReference: 'JOB-W42KM3',
    customerId: 'cust-7',
    assetId: 'asset-7',
    serviceCategory: 'INSTALLATION',
    problemDescription: 'Air purifier system setup',
    priority: 'MEDIUM',
    region: 'WESTERN',
    scheduledDate: null,
    createdBy: '00000000-0000-0000-0000-000000000000',
    status: 'Created',
    assignment: null,
    createdAt: '2026-09-14T12:00:00Z',
    updatedAt: '2026-09-14T12:00:00Z',
  },
  {
    id: 'job-k7qz57',
    jobReference: 'JOB-K7QZ57',
    customerId: 'cust-8',
    assetId: 'asset-8',
    serviceCategory: 'REPAIR',
    problemDescription: 'Control panel touchscreen dead',
    priority: 'HIGH',
    region: 'SOUTHERN',
    scheduledDate: null,
    createdBy: '00000000-0000-0000-0000-000000000000',
    status: 'Created',
    assignment: null,
    createdAt: '2026-09-15T08:00:00Z',
    updatedAt: '2026-09-15T08:00:00Z',
  },
  {
    id: 'job-gyg1xb',
    jobReference: 'JOB-GYG1XB',
    customerId: 'cust-9',
    assetId: 'asset-9',
    serviceCategory: 'REPAIR',
    problemDescription: 'Short circuit on auxiliary pump',
    priority: 'MEDIUM',
    region: 'WESTERN',
    scheduledDate: null,
    createdBy: '00000000-0000-0000-0000-000000000000',
    status: 'Created',
    assignment: null,
    createdAt: '2026-09-15T09:00:00Z',
    updatedAt: '2026-09-15T09:00:00Z',
  },
]

function JobListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [knownTechnicians, setKnownTechnicians] = useState<Array<{ id: string; reference: string }>>([
    { id: 'TEC-032', reference: 'TEC-032' },
    { id: 'TEC-033', reference: 'TEC-033' },
    { id: 'TEC-034', reference: 'TEC-034' },
  ])

  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const canCreateJob = hasRole('Agent', 'Dispatcher', 'Manager')

  const status = searchParams.get('status') ?? ''
  const assignedTechnicianId = searchParams.get('assignedTechnicianId') ?? ''
  const [draftStatus, setDraftStatus] = useState(status)
  const [draftTechnicianId, setDraftTechnicianId] = useState(assignedTechnicianId)

  // Load technicians from dispatch service if available
  useEffect(() => {
    getAllTechnicians()
      .then((techs) => {
        if (Array.isArray(techs) && techs.length > 0) {
          setKnownTechnicians((prev) => {
            const map = new Map<string, string>()
            prev.forEach((t) => map.set(t.id, t.reference))
            techs.forEach((t) => map.set(t.id, t.reference || t.id))
            return Array.from(map.entries()).map(([id, reference]) => ({ id, reference }))
          })
        }
      })
      .catch(() => {
        // Silently ignore if dispatch service is not accessible
      })
  }, [])


  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const fetched = await getJobs({
          status: status || undefined,
          assignedTechnicianId: assignedTechnicianId || undefined,
        })
        setJobs(fetched)
      } catch (cause: unknown) {
        const parsed = parseApiError(cause, 'Could not load jobs. Check the filters and Job Service connection.')
        setError(parsed.message)
        if (import.meta.env.DEV) {
          setJobs(DEV_FALLBACK_JOBS)
        }
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [status, assignedTechnicianId])

  // Combine known technicians and any assigned technicians in jobs
  const technicianOptions = useMemo(() => {
    const map = new Map<string, string>()
    knownTechnicians.forEach((t) => map.set(t.id, t.reference))
    jobs.forEach((j) => {
      if (j.assignment?.technicianId) {
        map.set(j.assignment.technicianId, j.assignment.technicianReference || j.assignment.technicianId)
      }
      if (j.assignment?.technicianReference) {
        map.set(j.assignment.technicianReference, j.assignment.technicianReference)
      }
    })
    return Array.from(map.entries()).map(([id, reference]) => ({ id, reference }))
  }, [knownTechnicians, jobs])

  function applyFilters(event?: FormEvent) {
    if (event) event.preventDefault()
    const next = new URLSearchParams()
    if (draftStatus && draftStatus !== 'All') next.set('status', draftStatus)
    if (draftTechnicianId.trim() && draftTechnicianId !== 'All') {
      next.set('assignedTechnicianId', draftTechnicianId.trim())
    }
    setSearchParams(next)
  }

  function clearFilters() {
    setSearchTerm('')
    setDraftStatus('')
    setDraftTechnicianId('')
    setSearchParams(new URLSearchParams())
  }

  // Filter jobs based on active search term and draft filters
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const q = searchTerm.toLowerCase().trim()
      if (q && !job.jobReference.toLowerCase().includes(q)) {
        return false
      }

      if (draftStatus && draftStatus !== 'All') {
        if (job.status.toUpperCase() !== draftStatus.toUpperCase()) {
          return false
        }
      }

      if (draftTechnicianId && draftTechnicianId !== 'All') {
        if (draftTechnicianId === 'None') {
          if (job.assignment?.technicianReference || job.assignment?.technicianId) return false
        } else {
          const matchRef = job.assignment?.technicianReference?.toLowerCase() === draftTechnicianId.toLowerCase()
          const matchId = job.assignment?.technicianId?.toLowerCase() === draftTechnicianId.toLowerCase()
          if (!matchRef && !matchId) return false
        }
      }

      return true
    })
  }, [jobs, searchTerm, draftStatus, draftTechnicianId])

  // Stat summary counts
  const totalCount = jobs.length
  const completedCount = jobs.filter((j) => j.status?.toUpperCase() === 'COMPLETED').length
  const awaitingCount = jobs.filter((j) => !j.assignment?.technicianReference && !j.assignment?.technicianId).length
  const hotCount = jobs.filter((j) => {
    const p = j.priority?.toUpperCase()
    return p === 'URGENT' || p === 'HIGH'
  }).length

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    (draftStatus && draftStatus !== 'All') ||
    (draftTechnicianId && draftTechnicianId !== 'All')
  )

  return (
    <div className="jobs-container">
      <div className="head">
        <div>
          <h1>Jobs</h1>
          <p>Find current service work by status or the technician currently assigned.</p>
        </div>
        {canCreateJob && (
          <Link className="btn btn-create" id="newJob" to="/jobs/new">
            + New service job
          </Link>
        )}
      </div>

      <section className="stats" id="stats" aria-label="Summary">
        <div className="stat">
          <span>Total jobs</span>
          <b>{totalCount}</b>
          <small>All service work</small>
        </div>
        <div className="stat">
          <span>Completed</span>
          <b>{completedCount}</b>
          <small>Finished jobs</small>
        </div>
        <div className="stat">
          <span>Awaiting assignment</span>
          <b>{awaitingCount}</b>
          <small>No technician yet</small>
        </div>
        <div className="stat">
          <span>Urgent &amp; high</span>
          <b>{hotCount}</b>
          <small>Need attention first</small>
        </div>
      </section>

      <section className="panel">
        <form className="tools" onSubmit={applyFilters}>
          <label className="search" htmlFor="q">
            <span className="fl">Search</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              className="field"
              id="q"
              type="search"
              placeholder="Job reference, e.g. JOB-VHNXJJ"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>

          <label htmlFor="job-status">
            <span className="fl">Status</span>
            <select
              className="field"
              id="job-status"
              aria-label="Status"
              value={draftStatus}
              onChange={(e) => setDraftStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="CREATED">Created</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>

          <label htmlFor="assigned-technician-id">
            <span className="fl">Assigned technician</span>
            <input
              className="field"
              id="assigned-technician-id"
              aria-label="Assigned technician ID"
              list="technicians-list"
              placeholder="Anyone"
              value={draftTechnicianId}
              onChange={(e) => setDraftTechnicianId(e.target.value)}
            />
            <datalist id="technicians-list">
              {technicianOptions.map((t) => (
                <option key={t.id} value={t.reference || t.id} />
              ))}
            </datalist>
          </label>

          <button
            className="clear"
            id="clear"
            type="button"
            onClick={clearFilters}
            hidden={!hasActiveFilters}
          >
            Clear filters
          </button>

          <button type="submit" className="visually-hidden">
            Apply filters
          </button>
        </form>

        <div className="tr th">
          <div>Reference</div>
          <div>Status</div>
          <div>Priority</div>
          <div>Assignment</div>
        </div>

        <div id="list">
          {loading ? (
            <div className="empty">
              <LoadingState message="Loading jobs..." />
            </div>
          ) : error && (!import.meta.env.DEV || jobs.length === 0) ? (
            <div className="empty">
              <ErrorState message={error} />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="empty">
              <b>No jobs match these filters</b>
              <p>Try a different status or clear the assigned technician filter.</p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div
                className="tr row row-item"
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <div className="ref">
                  <b>
                    <Link to={`/jobs/${job.id}`}>{job.jobReference}</Link>
                  </b>
                  <small>
                    {job.serviceCategory.toLowerCase()} · {job.region.charAt(0).toUpperCase() + job.region.slice(1).toLowerCase()}
                  </small>
                </div>
                <div data-l="Status">
                  <span className={`badge s-${job.status.toLowerCase().replace(/_/g, '-')}`}>
                    {job.status}
                  </span>
                </div>
                <div data-l="Priority">
                  <span className={`badge p-${job.priority.toLowerCase()}`}>
                    {job.priority}
                  </span>
                </div>
                <div
                  className={`asg${job.assignment ? '' : ' none'}`}
                  data-l="Assignment"
                >
                  {job.assignment ? (
                    <>
                      <b>{job.assignment.technicianReference || job.assignment.technicianId}</b>
                      <small>Assigned</small>
                    </>
                  ) : (
                    <b>Unassigned</b>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="foot">
          <span id="count" aria-live="polite">
            Showing {filteredJobs.length} of {jobs.length} jobs
          </span>
          <span>Filters combine, so a job must match all of them.</span>
        </div>
      </section>
    </div>
  )
}

export default JobListPage
