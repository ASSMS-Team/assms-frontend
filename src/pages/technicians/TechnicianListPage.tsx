import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import StatusBadge from '../../components/common/StatusBadge'
import { REGION_LABELS } from '../../constants/technician'
import { getAllTechnicians } from '../../services/dispatchService'
import type { TechnicianResponse } from '../../types/technician'

function TechnicianListPage() {
  const [technicians, setTechnicians] = useState<TechnicianResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      try {
        setTechnicians(await getAllTechnicians())
      } catch {
        setError('Could not load technicians. Check that the Dispatch Service is running.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Technicians</h1>
          <p className="page-sub">Dispatch capability records used before assignment decisions.</p>
        </div>
        <Link className="btn btn-primary" to="/technicians/new">New technician</Link>
      </div>

      <div className="card app-card">
        {loading ? (
          <div className="state-block">
            <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
            <p className="state-text">Loading technicians...</p>
          </div>
        ) : error ? (
          <div className="state-block"><div className="alert alert-danger mb-0" role="alert">{error}</div></div>
        ) : technicians.length === 0 ? (
          <div className="state-block">
            <div className="empty-mark">0</div>
            <p className="state-title">No technicians yet</p>
            <p className="state-text">Create the first technician record before assigning service jobs.</p>
            <Link className="btn btn-primary" to="/technicians/new">New technician</Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover app-table align-middle mb-0">
              <thead><tr><th scope="col">Technician</th><th scope="col">Region</th><th scope="col">Skills</th><th scope="col">State</th></tr></thead>
              <tbody>
                {technicians.map((technician) => (
                  <tr key={technician.id} className="row-link" onClick={() => navigate(`/technicians/${technician.id}`)}>
                    <td><Link className="row-link-name" to={`/technicians/${technician.id}`}>{technician.fullName}</Link><small className="d-block text-muted">{technician.reference}</small></td>
                    <td>{REGION_LABELS[technician.region] ?? technician.region}</td>
                    <td>{technician.skills.join(', ')}</td>
                    <td><StatusBadge status={technician.status} /></td>
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

export default TechnicianListPage
