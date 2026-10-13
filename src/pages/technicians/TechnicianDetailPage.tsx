import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'

import StatusBadge from '../../components/common/StatusBadge'
import LoadingState from '../../components/feedback/LoadingState'
import EmptyState from '../../components/feedback/EmptyState'
import ErrorState from '../../components/feedback/ErrorState'
import { REGION_LABELS } from '../../constants/technician'
import { deactivateTechnician, getTechnicianById } from '../../services/dispatchService'
import type { TechnicianResponse } from '../../types/technician'
import { formatDateTime } from '../../utils/formatDateTime'
import TechnicianLoginSetup from '../../components/forms/TechnicianLoginSetup'
import { useAuth } from '../../auth/useAuth'
import { parseApiError } from '../../utils/formatApiError'

function TechnicianDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { hasRole } = useAuth()
  const canManageTechnician = hasRole('Dispatcher', 'Manager')
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
          const parsed = parseApiError(caught, 'Could not load this technician. Check that the Dispatch Service is running.')
          setError(parsed.message)
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
        const parsed = parseApiError(caught, 'Could not deactivate this technician. Please try again.')
        setDeactivationError(parsed.message)
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
        {technician && (
          <div className="d-flex align-items-center gap-2">
            <StatusBadge status={technician.status} />
            {canManageTechnician && (
              <Link className="btn btn-primary" to={`/technicians/${technician.id}/edit`}>Edit</Link>
            )}
            {canManageTechnician && technician.status === 'ACTIVE' && (
              <button
                type="button"
                className="btn btn-outline-danger"
                disabled={deactivating}
                onClick={handleDeactivate}
              >
                {deactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card app-card">
        {loading ? (
          <LoadingState message="Loading technician..." />
        ) : notFound ? (
          <EmptyState
            icon="?"
            title="Technician not found"
            message={<>No technician is registered with the id <code>{id}</code>.</>}
            action={<Link className="btn btn-primary" to="/technicians">Back to technicians</Link>}
          />
        ) : error ? (
          <ErrorState message={error} />
        ) : technician && (
          <>
            {deactivationError && <div className="alert alert-warning m-3 mb-0" role="alert">{deactivationError}</div>}
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
      {technician && <TechnicianLoginSetup key={technician.id} technicianId={technician.id} />}
    </>
  )
}

export default TechnicianDetailPage
