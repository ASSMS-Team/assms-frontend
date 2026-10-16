import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

import { getMyAssignments } from '../../services/dispatchService'
import type { MyAssignmentResponse } from '../../types/assignment'
import './MyJobsPage.css'

type FilterTab = 'assigned' | 'progress' | 'done'

function getStatusCategory(status: string): FilterTab {
  const s = (status || '').toUpperCase()
  if (s === 'COMPLETED' || s === 'DONE') {
    return 'done'
  }
  if (s === 'IN_PROGRESS' || s === 'IN PROGRESS') {
    return 'progress'
  }
  return 'assigned'
}

function getStatusBadgeClass(status: string): string {
  const s = (status || '').toUpperCase()
  if (s === 'COMPLETED' || s === 'DONE' || s === 'OK') {
    return 'ok'
  }
  if (s === 'IN_PROGRESS' || s === 'IN PROGRESS' || s === 'BUSY') {
    return 'busy'
  }
  return 'assigned'
}

function formatAssignedDate(dateString: string): { date: string; time: string } {
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return { date: dateString, time: '' }
    const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    return { date, time }
  } catch {
    return { date: dateString, time: '' }
  }
}

function MyJobsPage() {
  const [assignments, setAssignments] = useState<MyAssignmentResponse[]>([])
  const [filter, setFilter] = useState<FilterTab>('assigned')
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

  const assignedCount = assignments.filter((a) => getStatusCategory(a.jobStatus) === 'assigned').length
  const inProgressCount = assignments.filter((a) => getStatusCategory(a.jobStatus) === 'progress').length
  const completedCount = assignments.filter((a) => getStatusCategory(a.jobStatus) === 'done').length

  const filteredAssignments = assignments.filter((a) => getStatusCategory(a.jobStatus) === filter)

  return (
    <div className="my-jobs-container">
      <div className="hd2">
        <div>
          <h1>My jobs</h1>
          <p className="sub">Service work assigned to you.</p>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="state-block">
            <div className="spinner-border text-primary" role="status" aria-label="Loading" />
            <p className="state-text">Loading your assignments…</p>
          </div>
        </div>
      ) : error ? (
        <div className="card">
          <div className="state-block">
            {profileMissing && <p className="state-title">Technician profile setup required</p>}
            <div className={`alert ${profileMissing ? 'alert-warning' : 'alert-danger'} mb-0`} role="alert">
              {error}
            </div>
            <button
              type="button"
              className="btn btn-outline-primary mt-3 retry-btn"
              onClick={() => setReload((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        </div>
      ) : assignments.length === 0 ? (
        <div className="card">
          <div className="empty no-border">
            <div className="empty-mark" aria-hidden="true">✓</div>
            <b>No jobs assigned</b>
            You have no active assignments right now. Check back later.
          </div>
        </div>
      ) : (
        <>
          <div className="tabs">
            <button
              type="button"
              aria-pressed={filter === 'assigned'}
              data-f="assigned"
              onClick={() => setFilter('assigned')}
            >
              Assigned<b>{assignedCount}</b>
            </button>
            <button
              type="button"
              aria-pressed={filter === 'progress'}
              data-f="progress"
              onClick={() => setFilter('progress')}
            >
              In progress<b>{inProgressCount}</b>
            </button>
            <button
              type="button"
              aria-pressed={filter === 'done'}
              data-f="done"
              onClick={() => setFilter('done')}
            >
              Completed<b>{completedCount}</b>
            </button>
          </div>

          <div className="card">
            <div className="row th">
              <span>Job</span>
              <span>Priority</span>
              <span>Summary</span>
              <span>Status</span>
              <span>Assigned</span>
            </div>

            {filteredAssignments.length === 0 ? (
              <div className="empty" id="empty">
                <b>No jobs here yet</b>
                Jobs appear in this list when their status changes.
              </div>
            ) : (
              filteredAssignments.map((a) => {
                const { date, time } = formatAssignedDate(a.assignedAt)
                const statusBadgeClass = getStatusBadgeClass(a.jobStatus)
                return (
                  <div
                    className="row"
                    key={a.assignmentId}
                    data-s={getStatusCategory(a.jobStatus)}
                    onClick={() => navigate(`/jobs/${a.jobId}`)}
                  >
                    <span>
                      <Link
                        className="row-link-name job-link"
                        to={`/jobs/${a.jobId}`}
                        id={`my-job-link-${a.assignmentId}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <b>{a.jobReference}</b>
                      </Link>
                      <small>
                        {[a.serviceCategory, a.region].filter(Boolean).join(' · ') || 'Location not recorded'}
                      </small>
                    </span>
                    <span className={a.priority ? '' : 'mute'} data-l="Priority">
                      {a.priority ?? '—'}
                    </span>
                    <span className={a.problemDescription ? '' : 'mute'} data-l="Summary">
                      {a.problemDescription ? (
                        <span
                          className="text-truncate d-inline-block"
                          style={{ maxWidth: '22rem', verticalAlign: 'bottom' }}
                          title={a.problemDescription}
                        >
                          {a.problemDescription}
                        </span>
                      ) : (
                        '—'
                      )}
                    </span>
                    <span data-l="Status">
                      <i className={`st ${statusBadgeClass}`}>{a.jobStatus}</i>
                    </span>
                    <span data-l="Assigned">
                      {date}
                      {time && <small>{time}</small>}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default MyJobsPage
