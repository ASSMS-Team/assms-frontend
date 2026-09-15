import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import StatusBadge from '../../components/common/StatusBadge'
import { getJobById } from '../../services/jobService'
import type { JobResponse } from '../../types/job'

function JobDetailPage() {
  const { id = '' } = useParams()
  const [job, setJob] = useState<JobResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try { setJob(await getJobById(id)) }
      catch { setError('Job not found or Job Service is unavailable.') }
    }
    void load()
  }, [id])

  if (error) return <div className="state-block"><div className="alert alert-danger" role="alert">{error}</div><Link className="btn btn-primary" to="/jobs">Back to jobs</Link></div>
  if (!job) return <div className="state-block"><div className="spinner-border text-primary" role="status" /><p className="state-text">Loading job...</p></div>

  return <>
    <div className="page-head"><div><Link className="back-link" to="/jobs">← Back to jobs</Link><h1 className="page-title">{job.jobReference}</h1><p className="page-sub">{job.serviceCategory} · {job.region}</p></div><StatusBadge status={job.status} /></div>
    <div className="card app-card"><dl className="detail-grid"><div className="detail-row"><dt>Priority</dt><dd>{job.priority}</dd></div><div className="detail-row"><dt>Assignment</dt><dd>{job.assignment ? `${job.assignment.technicianReference} (${job.assignment.technicianId})` : 'Unassigned'}</dd></div><div className="detail-row"><dt>Assigned at</dt><dd>{job.assignment ? new Date(job.assignment.assignedAt).toLocaleString() : '—'}</dd></div><div className="detail-row"><dt>Problem description</dt><dd>{job.problemDescription}</dd></div></dl></div>
  </>
}

export default JobDetailPage
