<<<<<<< Updated upstream
import { useContext, useEffect, useState } from 'react'
=======
import { useContext, useEffect, useState, type FormEvent } from 'react'
>>>>>>> Stashed changes
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'

import StatusBadge from '../../components/common/StatusBadge'
import { AuthContext } from '../../auth/authContext'
<<<<<<< Updated upstream
import { getJobById, startJob } from '../../services/jobService'
import type { JobResponse } from '../../types/job'
=======
import {
  addWorkRecord,
  getJobById,
  getWorkRecords,
  startJob,
  updateWorkRecord,
} from '../../services/jobService'
import type { JobResponse, ServiceWorkRecordResponse } from '../../types/job'
>>>>>>> Stashed changes
import { formatDateTime } from '../../utils/formatDateTime'

function JobDetailPage() {
  const { id = '' } = useParams()
  const auth = useContext(AuthContext)
  const staff = auth?.staff ?? null
  const [job, setJob] = useState<JobResponse | null>(null)
  const [error, setError] = useState('')

<<<<<<< Updated upstream
  useEffect(() => {
    async function load() {
      try {
        setJob(await getJobById(id))
=======
  // Start Job state
  const [starting, setStarting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Work Records state
  const [workRecords, setWorkRecords] = useState<ServiceWorkRecordResponse[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [recordContent, setRecordContent] = useState('')
  const [addingRecord, setAddingRecord] = useState(false)
  const [recordError, setRecordError] = useState('')
  const [recordSuccess, setRecordSuccess] = useState('')

  // Edit Work Record state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [editRecordContent, setEditRecordContent] = useState('')
  const [updatingRecord, setUpdatingRecord] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const loadedJob = await getJobById(id)
        setJob(loadedJob)
        if (loadedJob.status === 'IN_PROGRESS') {
          await loadRecords(loadedJob.id)
        }
>>>>>>> Stashed changes
      } catch {
        setError('Job not found or Job Service is unavailable.')
      }
    }
    void load()
  }, [id])

<<<<<<< Updated upstream
=======
  async function loadRecords(jobId: string) {
    setLoadingRecords(true)
    try {
      const records = await getWorkRecords(jobId)
      setWorkRecords(records)
    } catch {
      // Non-fatal if records fail to load initially
    } finally {
      setLoadingRecords(false)
    }
  }

>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======
      await loadRecords(updated.id)
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
=======
  async function handleAddWorkRecord(e: FormEvent) {
    e.preventDefault()
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
      const newRecord = await addWorkRecord(job.id, {
        technicianId,
        content: recordContent.trim(),
      })
      setWorkRecords((prev) => [...prev, newRecord])
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

  async function handleUpdateWorkRecord(recordId: string) {
    if (!job) return
    if (!editRecordContent.trim()) {
      setRecordError('Work record content is required.')
      return
    }

    const technicianId = staff?.id || job.assignment?.technicianId || ''
    setUpdatingRecord(true)
    setRecordError('')
    setRecordSuccess('')

    try {
      const updatedRecord = await updateWorkRecord(job.id, recordId, {
        technicianId,
        content: editRecordContent.trim(),
      })
      setWorkRecords((prev) =>
        prev.map((r) => (r.id === recordId ? updatedRecord : r)),
      )
      setEditingRecordId(null)
      setRecordSuccess('Work record updated successfully.')
    } catch (caught: unknown) {
      if (axios.isAxiosError(caught)) {
        if (caught.response?.status === 400) {
          setRecordError('Work record content is required.')
        } else if (caught.response?.status === 403) {
          setRecordError('Forbidden: Only the active assignee can update work records on this job.')
        } else if (caught.response?.status === 409) {
          setRecordError('Conflict: Work records can only be updated on a job in status IN_PROGRESS.')
        } else {
          setRecordError('Could not update work record. Check that Job Service is running.')
        }
      } else {
        setRecordError('An unexpected error occurred while updating the work record.')
      }
    } finally {
      setUpdatingRecord(false)
    }
  }

  function handleCancelEdit() {
    setEditingRecordId(null)
    setEditRecordContent('')
    setRecordError('')
    setRecordSuccess('')
  }

>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    (!auth || isTechnician || (!auth.hasRole('Agent', 'Dispatcher', 'Manager')))
=======
    (!auth || isTechnician || !auth.hasRole('Agent', 'Dispatcher', 'Manager'))

  const canEditWorkRecord =
    job.status === 'IN_PROGRESS' &&
    (!auth || isTechnician || !auth.hasRole('Agent', 'Dispatcher', 'Manager'))
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
      <div className="card app-card">
        <dl className="detail-grid">
=======
      <div className="card app-card mb-4">
        <dl className="detail-grid mb-0">
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======

      {/* Service Work Records Section */}
      {job.status === 'IN_PROGRESS' && (
        <div className="card app-card p-4">
          <h2 className="h4 mb-3">Service Work Records</h2>

          {canEditWorkRecord && editingRecordId === null && (
            <form onSubmit={handleAddWorkRecord} className="mb-4">
              {recordError && (
                <div className="alert alert-danger mb-3" role="alert">
                  {recordError}
                </div>
              )}
              {recordSuccess && (
                <div className="alert alert-success mb-3" role="alert">
                  {recordSuccess}
                </div>
              )}
              <div className="mb-3">
                <label htmlFor="work-record-content" className="form-label">
                  Record Work Performed
                </label>
                <textarea
                  id="work-record-content"
                  className="form-control"
                  rows={3}
                  placeholder="Describe parts replaced, diagnostics performed, or work completed..."
                  value={recordContent}
                  onChange={(e) => setRecordContent(e.target.value)}
                  disabled={addingRecord}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                id="add-work-record-btn"
                disabled={addingRecord}
              >
                {addingRecord ? 'Adding record...' : 'Add Work Record'}
              </button>
            </form>
          )}

          {canEditWorkRecord && editingRecordId !== null && (
            <div className="mb-4">
              {recordError && (
                <div className="alert alert-danger mb-3" role="alert">
                  {recordError}
                </div>
              )}
              {recordSuccess && (
                <div className="alert alert-success mb-3" role="alert">
                  {recordSuccess}
                </div>
              )}
              <div className="mb-3">
                <label htmlFor="edit-work-record-content" className="form-label">
                  Edit Work Performed
                </label>
                <textarea
                  id="edit-work-record-content"
                  className="form-control"
                  rows={3}
                  value={editRecordContent}
                  onChange={(e) => setEditRecordContent(e.target.value)}
                  disabled={updatingRecord}
                />
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  id="save-work-record-btn"
                  disabled={updatingRecord}
                  onClick={() => void handleUpdateWorkRecord(editingRecordId)}
                >
                  {updatingRecord ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  id="cancel-work-record-btn"
                  disabled={updatingRecord}
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loadingRecords ? (
            <div className="text-center py-3">
              <div className="spinner-border spinner-border-sm text-primary" role="status" />
              <span className="ms-2">Loading work records...</span>
            </div>
          ) : workRecords.length === 0 ? (
            <div className="text-muted py-2">
              No service work records recorded yet.
            </div>
          ) : (
            <div className="list-group">
              {workRecords.map((record) => (
                <div key={record.id} className="list-group-item list-group-item-action flex-column align-items-start">
                  <div className="d-flex w-100 justify-content-between mb-1">
                    <h5 className="mb-1 text-primary">{record.technicianReference || 'Technician'}</h5>
                    <div className="d-flex align-items-center gap-3">
                      <small className="text-muted">{formatDateTime(record.recordedAt)}</small>
                      {canEditWorkRecord && editingRecordId !== record.id && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary edit-work-record-btn"
                          onClick={() => {
                            setEditingRecordId(record.id)
                            setEditRecordContent(record.content)
                            setRecordError('')
                            setRecordSuccess('')
                          }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mb-1">{record.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
>>>>>>> Stashed changes
    </>
  )
}

export default JobDetailPage
