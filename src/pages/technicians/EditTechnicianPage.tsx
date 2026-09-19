import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'

import TechnicianForm from '../../components/forms/TechnicianForm'
import { getTechnicianById } from '../../services/dispatchService'
import type { TechnicianResponse } from '../../types/technician'

function EditTechnicianPage() {
  const { id } = useParams<{ id: string }>()
  const [technician, setTechnician] = useState<TechnicianResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      if (!id) { setNotFound(true); setLoading(false); return }
      try { setTechnician(await getTechnicianById(id)) }
      catch (caught) {
        if (axios.isAxiosError(caught) && caught.response?.status === 404) setNotFound(true)
        else setError('Could not load this technician. Check that the Dispatch Service is running.')
      } finally { setLoading(false) }
    }
    void load()
  }, [id])

  return (
    <>
      <div className="page-head"><div><Link className="back-link" to={id ? `/technicians/${id}` : '/technicians'}>&larr; Back to technician</Link><h1 className="page-title">Update technician</h1></div></div>
      <div className="card app-card app-card-padded form-column">
        {loading ? <div className="state-block"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div><p className="state-text">Loading technician...</p></div>
          : notFound ? <div className="state-block"><div className="empty-mark">?</div><p className="state-title">Technician not found</p><Link className="btn btn-primary" to="/technicians">Back to technicians</Link></div>
          : error ? <div className="alert alert-danger mb-0" role="alert">{error}</div>
          : technician && <TechnicianForm technician={technician} />}
      </div>
    </>
  )
}

export default EditTechnicianPage
