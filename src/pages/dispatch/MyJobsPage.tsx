import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

import StatusBadge from '../../components/common/StatusBadge'
import { getMyAssignments } from '../../services/dispatchService'
import type { MyAssignmentResponse } from '../../types/assignment'

function MyJobsPage() {
  const [assignments, setAssignments] = useState<MyAssignmentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profileMissing, setProfileMissing] = useState(false)
  const [reload, setReload] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      setProfileMissing(false)
      try {
        setAssignments(await getMyAssignments())
      } catch (cause) {
        const status = axios.isAxiosError(cause) ? cause.response?.status : undefined
        if (status === 404) {
          setProfileMissing(true)
          setError('Your staff account is not linked to a Dispatch technician record. Ask your Manager or Dispatcher to set up login access from your technician details, then sign out and sign in again.')
        } else if (status === 403) {
          setError('Your account does not have permission to view technician assignments. Sign in with a Technician account.')
        } else if (status === 401) {
          setError('Your session has expired. Sign in again to view your assigned jobs.')
        } else {
          setError('Could not load your assignments. Please try again. If the problem continues, contact your support team.')
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [reload])

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
            {profileMissing && <p className="state-title">Technician profile setup required</p>}
            <div className={`alert ${profileMissing ? 'alert-warning' : 'alert-danger'} mb-0`} role="alert">{error}</div>
            <button className="btn btn-outline-primary mt-3" onClick={() => setReload((value) => value + 1)}>Try again</button>
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
