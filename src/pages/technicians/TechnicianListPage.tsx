import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import StatusBadge from '../../components/common/StatusBadge'
import { REGIONS, REGION_LABELS } from '../../constants/technician'
import { getAllTechnicians } from '../../services/dispatchService'
import type { TechnicianResponse } from '../../types/technician'

function TechnicianListPage() {
  const [technicians, setTechnicians] = useState<TechnicianResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get('q') ?? ''
  const region = searchParams.get('region') ?? ''
  const status = searchParams.get('status') ?? ''

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

  const filteredTechnicians = useMemo(() => technicians.filter((technician) => {
    const matchesQuery = !query || [technician.fullName, technician.reference, ...technician.skills]
      .some((value) => value.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    return matchesQuery && (!region || technician.region === region) && (!status || technician.status === status)
  }), [technicians, query, region, status])

  const activeCount = technicians.filter((technician) => technician.status === 'ACTIVE').length
  const updateFilter = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(name, value)
    else next.delete(name)
    setSearchParams(next)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Technicians</h1>
          <p className="page-sub">Dispatch capability records used before assignment decisions.</p>
        </div>
        <Link className="btn btn-primary" to="/technicians/new">New technician</Link>
      </div>

      {!loading && !error && technicians.length > 0 && <section className="operations-metrics" aria-label="Technician summary">
        <article><span>Technicians</span><strong>{technicians.length}</strong><small>Dispatch capability records</small></article>
        <article><span>Available</span><strong>{activeCount}</strong><small>Eligible for new work</small></article>
        <article><span>Unavailable</span><strong>{technicians.length - activeCount}</strong><small>Excluded from assignment</small></article>
        <article><span>Regions</span><strong>{new Set(technicians.map((technician) => technician.region)).size}</strong><small>Current coverage</small></article>
      </section>}

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
          <>
            <div className="operations-toolbar">
              <label className="visually-hidden" htmlFor="technician-search">Search technicians</label>
              <input id="technician-search" type="search" placeholder="Search name, reference or skill" value={query} onChange={(event) => updateFilter('q', event.target.value)} />
              <label className="visually-hidden" htmlFor="technician-region">Filter by region</label>
              <select id="technician-region" value={region} onChange={(event) => updateFilter('region', event.target.value)}>
                <option value="">All regions</option>
                {REGIONS.map((item) => <option key={item} value={item}>{REGION_LABELS[item]} region</option>)}
              </select>
              <label className="visually-hidden" htmlFor="technician-status">Filter by state</label>
              <select id="technician-status" value={status} onChange={(event) => updateFilter('status', event.target.value)}>
                <option value="">All states</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
              </select>
              <span>{filteredTechnicians.length} shown</span>
            </div>
            {filteredTechnicians.length === 0 ? <div className="state-block"><div className="empty-mark">0</div><p className="state-title">No technicians match these filters</p><p className="state-text">Clear a filter or search with a different term.</p></div> :
              <div className="table-responsive">
                <table className="table table-hover app-table align-middle mb-0">
                  <thead><tr><th scope="col">Technician</th><th scope="col">Region</th><th scope="col">Skills</th><th scope="col">State</th></tr></thead>
                  <tbody>
                    {filteredTechnicians.map((technician) => (
                      <tr key={technician.id} className="row-link" onClick={() => navigate(`/technicians/${technician.id}`)}>
                        <td><Link className="row-link-name" to={`/technicians/${technician.id}`}>{technician.fullName}</Link><small className="d-block text-muted">{technician.reference}</small></td>
                        <td>{REGION_LABELS[technician.region] ?? technician.region}</td>
                        <td>{technician.skills.join(', ')}</td>
                        <td><StatusBadge status={technician.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
          </>
        )}
      </div>
    </>
  )
}

export default TechnicianListPage
