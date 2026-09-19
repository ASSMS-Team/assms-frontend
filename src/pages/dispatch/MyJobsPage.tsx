import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import StatusBadge from '../../components/common/StatusBadge'
import { getMyAssignments } from '../../services/dispatchService'
import type { MyAssignmentResponse } from '../../types/assignment'

function MyJobsPage() {
  const [assignments, setAssignments] = useState<MyAssignmentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        setAssignments(await getMyAssignments())
      } catch {
        setError('Could not load your assignments. Check the Dispatch Service connection.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">My Jobs</h1>
          <p className="page-sub">Service work currently assigned to you.</p>
        </div>
      </div>

      <div className="card app-card">
        {loading ? (
          <div className="state-block">
            <div className="spinner-border text-primary" role="status" aria-label="Loading" />
            <p className="state-text">Loading your assignments…</p>
          </div>
        ) : error ? (
          <div className="state-block">
            <div className="alert alert-danger mb-0" role="alert">{error}</div>
          </div>
        ) : assignments.length === 0 ? (
          <div className="state-block">
            <div className="empty-mark" aria-hidden="true">✓</div>
            <p className="state-title">No jobs assigned</p>
            <p className="state-text">You have no active assignments right now. Check back later.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover app-table align-middle mb-0">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr
                    className="row-link"
                    key={a.assignmentId}
                    onClick={() => navigate(`/jobs/${a.jobId}`)}
                  >
                    <td>
                      <Link
                        className="row-link-name"
                        to={`/jobs/${a.jobId}`}
                        id={`my-job-link-${a.assignmentId}`}
                      >
                        {a.jobReference}
                      </Link>
                    </td>
                    <td><StatusBadge status={a.jobStatus} /></td>
                    <td>
                      <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                        {new Date(a.assignedAt).toLocaleString()}
                      </span>
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

export default MyJobsPage
