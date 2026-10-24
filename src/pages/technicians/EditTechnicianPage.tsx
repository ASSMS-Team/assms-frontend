import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'

import TechnicianForm from '../../components/forms/TechnicianForm'
import LoadingState from '../../components/feedback/LoadingState'
import EmptyState from '../../components/feedback/EmptyState'
import ErrorState from '../../components/feedback/ErrorState'
import { getTechnicianById } from '../../services/dispatchService'
import type { TechnicianResponse } from '../../types/technician'
import { parseApiError } from '../../utils/formatApiError'

function EditTechnicianPage() {
  const { id } = useParams<{ id: string }>()
  const [technician, setTechnician] = useState<TechnicianResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <>
      <div className="page-head">
        <div>
          <Link className="back-link" to={id ? `/technicians/${id}` : '/technicians'}>
            &larr; Back to technician
          </Link>
          <h1 className="page-title">Update technician</h1>
          <p className="page-sub">Update skills and operational region assignment.</p>
        </div>
      </div>
      {loading || notFound || error ? (
        <div className="card app-card app-card-padded form-column">
          {loading ? (
            <LoadingState message="Loading technician..." />
          ) : notFound ? (
            <EmptyState
              icon="?"
              title="Technician not found"
              message={`No technician is registered with the id "${id}".`}
              action={<Link className="btn btn-primary" to="/technicians">Back to technicians</Link>}
            />
          ) : (
            <ErrorState message={error} />
          )}
        </div>
      ) : (
        technician && <TechnicianForm technician={technician} />
      )}
    </>
  )
}

export default EditTechnicianPage
