import { useContext, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'

import StatusBadge from '../../components/common/StatusBadge'
import { AuthContext } from '../../auth/authContext'
import { getJobById, startJob } from '../../services/jobService'
import type { JobResponse } from '../../types/job'
import { formatDateTime } from '../../utils/formatDateTime'

function JobDetailPage() {
  const { id = '' } = useParams()
  const auth = useContext(AuthContext)
  const staff = auth?.staff ?? null
  const [job, setJob] = useState<JobResponse | null>(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        setJob(await getJobById(id))
      } catch {
        setError('Job not found or Job Service is unavailable.')
      }
    }
    void load()
  }, [id])

  async function handleStartJob() {
    if (!job) return
    const technicianId = staff?.id || job.assignment?.technicianId || ''
    setStarting(true)
    setActionError('')
    setActionSuccess('')

    try {
      const updated = await startJob(job.id, technicianId)
      setJob(updated)
      setActionSuccess('Job started successfully and is now in progress.')
    } catch (caught: unknown) {
      if (axios.isAxiosError(caught)) {
        if (caught.response?.status === 403) {
          setActionError('Forbidden: Only the assigned technician can start this job.')
        } else if (caught.response?.status === 409) {
          setActionError('Conflict: Job cannot be started because it is not in ASSIGNED status.')
        } else {
          setActionError('Could not start this job. Check that Job Service is running.')
        }
      } else {
        setActionError('An unexpected error occurred while starting the job.')
      }
    } finally {
      setStarting(false)
    }
  }

  const isTechnician = auth?.hasRole('Technician') ?? false
  const backLinkPath = isTechnician ? '/my-jobs' : '/jobs'
  const backLinkLabel = isTechnician ? '← Back to my jobs' : '← Back to jobs'

  if (error) {
    return (
      <div className="state-block">
        <div className="alert alert-danger" role="alert">{error}</div>
        <Link className="btn btn-primary" to={backLinkPath}>
          {isTechnician ? 'Back to my jobs' : 'Back to jobs'}
        </Link>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="state-block">
        <div className="spinner-border text-primary" role="status" />
        <p className="state-text">Loading job...</p>
      </div>
    )
  }

  const canStartJob =
    job.status === 'ASSIGNED' &&
    (!auth || isTechnician || (!auth.hasRole('Agent', 'Dispatcher', 'Manager')))

  return (
    <>
      <div className="page-head">
        <div>
          <Link className="back-link" to={backLinkPath}>
            {backLinkLabel}
          </Link>
          <h1 className="page-title">{job.jobReference}</h1>
          <p className="page-sub">
            {job.serviceCategory} · {job.region}
          </p>
        </div>
        <div className="d-flex align-items-center gap-3">
          <StatusBadge status={job.status} />
          {canStartJob && (
            <button
              type="button"
              className="btn btn-primary"
              id="start-job-button"
              disabled={starting}
              onClick={handleStartJob}
            >
              {starting ? 'Starting job...' : 'Start Job'}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="alert alert-danger mb-3" role="alert">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="alert alert-success mb-3" role="alert">
          {actionSuccess}
        </div>
      )}

      <div className="card app-card">
        <dl className="detail-grid">
          <div className="detail-row">
            <dt>Priority</dt>
            <dd>{job.priority}</dd>
          </div>
          <div className="detail-row">
            <dt>Assignment</dt>
            <dd>
              {job.assignment
                ? `${job.assignment.technicianReference} (${job.assignment.technicianId})`
                : 'Unassigned'}
            </dd>
          </div>
          <div className="detail-row">
            <dt>Assigned at</dt>
            <dd>
              {job.assignment ? formatDateTime(job.assignment.assignedAt) : '—'}
            </dd>
          </div>
          {job.startedAt && (
            <div className="detail-row">
              <dt>Started at</dt>
              <dd>{formatDateTime(job.startedAt)}</dd>
            </div>
          )}
          <div className="detail-row">
            <dt>Problem description</dt>
            <dd>{job.problemDescription}</dd>
          </div>
        </dl>
      </div>
    </>
  )
}

export default JobDetailPage

