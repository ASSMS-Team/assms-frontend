import { useContext, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'

import StatusBadge from '../../components/common/StatusBadge'
import { AuthContext } from '../../auth/authContext'
import { addWorkRecord, getJobById, getWorkRecords, startJob } from '../../services/jobService'
import type { JobResponse, ServiceWorkRecordResponse } from '../../types/job'
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
  const [workRecords, setWorkRecords] = useState<ServiceWorkRecordResponse[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [recordContent, setRecordContent] = useState('')
  const [addingRecord, setAddingRecord] = useState(false)
  const [recordError, setRecordError] = useState('')
  const [recordSuccess, setRecordSuccess] = useState('')

  async function loadRecords(jobId: string) {
    setLoadingRecords(true)
    try {
      setWorkRecords(await getWorkRecords(jobId))
    } catch {
      // Keep the job details available if the optional records request fails.
    } finally {
      setLoadingRecords(false)
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const loadedJob = await getJobById(id)
        setJob(loadedJob)
        if (loadedJob.status === 'IN_PROGRESS') {
          await loadRecords(loadedJob.id)
        }
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
      await loadRecords(updated.id)
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

  async function handleAddWorkRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!job) return
    if (!recordContent.trim()) {
      setRecordError('Work record content is required.')
      return
    }

    const technicianId = staff?.id || job.assignment?.technicianId || ''
    setAddingRecord(true)
    setRecordError('')
    setRecordSuccess('')

    try {
      const record = await addWorkRecord(job.id, {
        technicianId,
        content: recordContent.trim(),
      })
      setWorkRecords((current) => [...current, record])
      setRecordContent('')
      setRecordSuccess('Work record added successfully.')
    } catch (caught: unknown) {
      if (axios.isAxiosError(caught)) {
        if (caught.response?.status === 400) {
          setRecordError('Work record content is required.')
        } else if (caught.response?.status === 403) {
          setRecordError('Forbidden: Only the active assignee can add work records to this job.')
        } else if (caught.response?.status === 409) {
          setRecordError('Conflict: Work records can only be added to a job in status IN_PROGRESS.')
        } else {
          setRecordError('Could not save work record. Check that Job Service is running.')
        }
      } else {
        setRecordError('An unexpected error occurred while saving the work record.')
      }
    } finally {
      setAddingRecord(false)
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

  const canManageAssignedWork =
    !auth || isTechnician || !auth.hasRole('Agent', 'Dispatcher', 'Manager')
  const canStartJob = job.status === 'ASSIGNED' && canManageAssignedWork
  const canAddWorkRecord = job.status === 'IN_PROGRESS' && canManageAssignedWork

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

      {actionError && <div className="alert alert-danger mb-3" role="alert">{actionError}</div>}
      {actionSuccess && <div className="alert alert-success mb-3" role="alert">{actionSuccess}</div>}

      <div className="card app-card">
        <dl className="detail-grid">
          <div className="detail-row"><dt>Priority</dt><dd>{job.priority}</dd></div>
          <div className="detail-row">
            <dt>Assignment</dt>
            <dd>{job.assignment ? `${job.assignment.technicianReference} (${job.assignment.technicianId})` : 'Unassigned'}</dd>
          </div>
          <div className="detail-row">
            <dt>Assigned at</dt>
            <dd>{job.assignment ? formatDateTime(job.assignment.assignedAt) : '—'}</dd>
          </div>
          {job.startedAt && <div className="detail-row"><dt>Started at</dt><dd>{formatDateTime(job.startedAt)}</dd></div>}
          <div className="detail-row"><dt>Problem description</dt><dd>{job.problemDescription}</dd></div>
        </dl>
      </div>

      {job.status === 'IN_PROGRESS' && (
        <section className="card app-card p-4 mt-4" aria-labelledby="work-records-heading">
          <h2 id="work-records-heading" className="h4 mb-3">Service Work Records</h2>

          {canAddWorkRecord && (
            <form onSubmit={handleAddWorkRecord} className="mb-4">
              {recordError && <div className="alert alert-danger mb-3" role="alert">{recordError}</div>}
              {recordSuccess && <div className="alert alert-success mb-3" role="alert">{recordSuccess}</div>}
              <div className="mb-3">
                <label htmlFor="work-record-content" className="form-label">Record Work Performed</label>
                <textarea
                  id="work-record-content"
                  className="form-control"
                  rows={3}
                  placeholder="Describe parts replaced, diagnostics performed, or work completed..."
                  value={recordContent}
                  onChange={(event) => setRecordContent(event.target.value)}
                  disabled={addingRecord}
                />
              </div>
              <button type="submit" className="btn btn-primary" id="add-work-record-btn" disabled={addingRecord}>
                {addingRecord ? 'Adding record...' : 'Add Work Record'}
              </button>
            </form>
          )}

          {loadingRecords ? (
            <div className="text-center py-3">
              <div className="spinner-border spinner-border-sm text-primary" role="status" />
              <span className="ms-2">Loading work records...</span>
            </div>
          ) : workRecords.length === 0 ? (
            <div className="text-muted py-2">No service work records recorded yet.</div>
          ) : (
            <div className="list-group">
              {workRecords.map((record) => (
                <article key={record.id} className="list-group-item d-flex flex-column">
                  <div className="d-flex w-100 justify-content-between mb-1">
                    <h3 className="h6 mb-1 text-primary">{record.technicianReference || 'Technician'}</h3>
                    <time className="small text-muted" dateTime={record.recordedAt}>{formatDateTime(record.recordedAt)}</time>
                  </div>
                  <p className="mb-1">{record.content}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  )
}

export default JobDetailPage
