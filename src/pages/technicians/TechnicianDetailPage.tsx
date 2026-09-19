import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'

import StatusBadge from '../../components/common/StatusBadge'
import { REGION_LABELS } from '../../constants/technician'
import { deactivateTechnician, getTechnicianById } from '../../services/dispatchService'
import type { TechnicianResponse } from '../../types/technician'
import { formatDateTime } from '../../utils/formatDateTime'

function TechnicianDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [technician, setTechnician] = useState<TechnicianResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [deactivating, setDeactivating] = useState(false)
  const [deactivationError, setDeactivationError] = useState('')

  useEffect(() => {
    async function load() {
      if (!id) {
        setNotFound(true)
        setLoading(false)
        return
      }

      try {
        setTechnician(await getTechnicianById(id))
      } catch (caught) {
        if (axios.isAxiosError(caught) && caught.response?.status === 404) {
          setNotFound(true)
        } else {
          setError('Could not load this technician. Check that the Dispatch Service is running.')
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  async function handleDeactivate() {
    if (!technician || !window.confirm(
      `Deactivate ${technician.fullName}? The Technician record and assignment history are retained, but no future work can be assigned.`,
    )) return

    setDeactivating(true)
    setDeactivationError('')
    try {
      setTechnician(await deactivateTechnician(technician.id))
    } catch (caught) {
      if (axios.isAxiosError(caught) && caught.response?.status === 409) {
        setDeactivationError('This technician has open assignments. Reassign or close those jobs before deactivation.')
      } else {
        setDeactivationError('Could not deactivate this technician. Please try again.')
      }
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link className="back-link" to="/technicians">&larr; Back to technicians</Link>
          <h1 className="page-title">{technician?.fullName ?? 'Technician'}</h1>
          {technician && <p className="page-sub">{technician.reference}</p>}
        </div>
        {technician && <StatusBadge status={technician.status} />}
        {technician && <div className="d-flex gap-2">
          <Link className="btn btn-primary" to={`/technicians/${technician.id}/edit`}>Edit</Link>
          {technician.status === 'ACTIVE' && <button type="button" className="btn btn-outline-danger" disabled={deactivating} onClick={handleDeactivate}>
            {deactivating ? 'Deactivating...' : 'Deactivate'}
          </button>}
        </div>}
      </div>

      <div className="card app-card">
        {loading ? (
          <div className="state-block"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div><p className="state-text">Loading technician...</p></div>
        ) : notFound ? (
          <div className="state-block"><div className="empty-mark">?</div><p className="state-title">Technician not found</p><p className="state-text">No technician is registered with the id <code>{id}</code>.</p><Link className="btn btn-primary" to="/technicians">Back to technicians</Link></div>
        ) : error ? (
          <div className="state-block"><div className="alert alert-danger mb-0" role="alert">{error}</div></div>
        ) : technician && (
          <>
            {deactivationError && <div className="alert alert-warning" role="alert">{deactivationError}</div>}
            <dl className="detail-grid mb-0">
              <div className="detail-row"><dt>Reference</dt><dd>{technician.reference}</dd></div>
              <div className="detail-row"><dt>Region</dt><dd>{REGION_LABELS[technician.region] ?? technician.region}</dd></div>
              <div className="detail-row"><dt>Skills</dt><dd>{technician.skills.join(', ')}</dd></div>
              <div className="detail-row"><dt>State</dt><dd><StatusBadge status={technician.status} /></dd></div>
              <div className="detail-row"><dt>Phone</dt><dd>{technician.phone ?? <span className="text-muted">Not provided</span>}</dd></div>
              <div className="detail-row"><dt>Email</dt><dd>{technician.email ?? <span className="text-muted">Not provided</span>}</dd></div>
              <div className="detail-row"><dt>Created</dt><dd>{formatDateTime(technician.createdAt)}</dd></div>
              <div className="detail-row"><dt>Last updated</dt><dd>{formatDateTime(technician.updatedAt)}</dd></div>
            </dl>
          </>
        )}
      </div>
    </>
  )
}

export default TechnicianDetailPage
