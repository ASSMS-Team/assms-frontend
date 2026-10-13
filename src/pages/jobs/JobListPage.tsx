import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import StatusBadge from '../../components/common/StatusBadge'
import LoadingState from '../../components/feedback/LoadingState'
import EmptyState from '../../components/feedback/EmptyState'
import ErrorState from '../../components/feedback/ErrorState'
import { getJobs } from '../../services/jobService'
import type { JobResponse } from '../../types/job'
import { useAuth } from '../../auth/useAuth'
import { parseApiError } from '../../utils/formatApiError'

function JobListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const canCreateJob = hasRole('Agent', 'Dispatcher', 'Manager')
  const status = searchParams.get('status') ?? ''
  const assignedTechnicianId = searchParams.get('assignedTechnicianId') ?? ''
  const [draftStatus, setDraftStatus] = useState(status)
  const [draftTechnicianId, setDraftTechnicianId] = useState(assignedTechnicianId)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        setJobs(await getJobs({
          status: status || undefined,
          assignedTechnicianId: assignedTechnicianId || undefined,
        }))
      } catch (cause: unknown) {
        const parsed = parseApiError(cause, 'Could not load jobs. Check the filters and Job Service connection.')
        setError(parsed.message)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [status, assignedTechnicianId])

  function applyFilters(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (draftStatus) next.set('status', draftStatus)
    if (draftTechnicianId.trim()) next.set('assignedTechnicianId', draftTechnicianId.trim())
    setSearchParams(next)
  }

  function clearFilters() {
    setDraftStatus('')
    setDraftTechnicianId('')
    setSearchParams(new URLSearchParams())
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Jobs</h1>
          <p className="page-sub">Find current service work by status or the technician currently assigned.</p>
        </div>
        {canCreateJob && (
          <Link className="btn btn-primary" to="/jobs/new">
            New service job
          </Link>
        )}
      </div>

      <form className="card app-card p-3 mb-3" onSubmit={applyFilters}>
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label" htmlFor="job-status">Status</label>
            <select
              className="form-select"
              id="job-status"
              value={draftStatus}
              onChange={(event) => setDraftStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="CREATED">Created</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
            </select>
          </div>
          <div className="col-md-5">
            <label className="form-label" htmlFor="assigned-technician-id">Assigned technician ID</label>
            <input
              className="form-control"
              id="assigned-technician-id"
              value={draftTechnicianId}
              onChange={(event) => setDraftTechnicianId(event.target.value)}
              placeholder="Technician GUID"
            />
          </div>
          <div className="col-md-3 d-flex gap-2">
            <button className="btn btn-primary flex-grow-1" type="submit">Apply filters</button>
            <button className="btn btn-outline-secondary" type="button" onClick={clearFilters}>Clear</button>
          </div>
        </div>
        <p className="form-text mb-0 mt-2">When both filters are selected, the list shows only jobs that satisfy both.</p>
      </form>

      <div className="card app-card">
        {loading ? (
          <LoadingState message="Loading jobs..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No jobs match these filters"
            message="Try a different status or clear the assigned technician filter."
          />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover app-table align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Status</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Assignment</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr className="row-link" key={job.id} onClick={() => navigate(`/jobs/${job.id}`)}>
                    <td>
                      <Link className="row-link-name" to={`/jobs/${job.id}`}>
                        {job.jobReference}
                      </Link>
                      <small className="d-block text-muted">{job.serviceCategory} · {job.region}</small>
                    </td>
                    <td>
                      <StatusBadge status={job.status} />
                    </td>
                    <td>{job.priority}</td>
                    <td>
                      {job.assignment ? (
                        <>
                          <strong>{job.assignment.technicianReference}</strong>
                          <small className="d-block text-muted">Assigned</small>
                        </>
                      ) : (
                        <span className="text-muted">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

export default JobListPage
