import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import LoadingState from '../../components/feedback/LoadingState'
import ErrorState from '../../components/feedback/ErrorState'
import { REGIONS, REGION_LABELS } from '../../constants/technician'
import { getAllTechnicians } from '../../services/dispatchService'
import type { TechnicianResponse } from '../../types/technician'
import { useAuth } from '../../auth/useAuth'
import { parseApiError } from '../../utils/formatApiError'
import './TechnicianListPage.css'

const DEV_FALLBACK_TECHNICIANS: TechnicianResponse[] = [
  {
    id: 'tec-1',
    reference: 'TEC-034',
    fullName: 'Hirusha',
    region: 'WESTERN',
    skills: ['AC', 'Electrical', 'Plumbing'],
    status: 'ACTIVE',
    phone: '0771234567',
    email: 'hirusha@assms.lk',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'tec-2',
    reference: 'TEC-032',
    fullName: 'Hirusha Sipara',
    region: 'WESTERN',
    skills: ['Solar'],
    status: 'ACTIVE',
    phone: '0772345678',
    email: 'sipara@assms.lk',
    createdAt: '2026-09-02T00:00:00Z',
    updatedAt: '2026-09-02T00:00:00Z',
  },
  {
    id: 'tec-3',
    reference: 'TEC-033',
    fullName: 'Local Technician',
    region: 'WESTERN',
    skills: ['Pumps'],
    status: 'ACTIVE',
    phone: '0773456789',
    email: 'local@assms.lk',
    createdAt: '2026-09-03T00:00:00Z',
    updatedAt: '2026-09-03T00:00:00Z',
  },
]

const AVATAR_PALETTES: Array<[string, string]> = [
  ['#2cc487', '#0f7a53'],
  ['#5db8ff', '#0b5aa6'],
  ['#ffc94d', '#c78400'],
  ['#ff8a80', '#c0392b'],
  ['#b388ff', '#6200ea'],
  ['#26a69a', '#004d40'],
]

function getAvatarPalette(key: string): [string, string] {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length]
}

function getInitials(name: string): string {
  if (!name) return ''
  const words = name.split(/\s+/).filter(Boolean)
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase()
}

function TechnicianListPage() {
  const [technicians, setTechnicians] = useState<TechnicianResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const canCreateTechnician = hasRole('Dispatcher', 'Manager')

  const query = searchParams.get('q') ?? ''
  const region = searchParams.get('region') ?? ''
  const status = searchParams.get('status') ?? ''

  useEffect(() => {
    async function load() {
      try {
        const data = await getAllTechnicians()
        setTechnicians(data)
      } catch (caught) {
        const parsed = parseApiError(caught, 'Could not load technicians. Check that the Dispatch Service is running.')
        setError(parsed.message)
        if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
          setTechnicians(DEV_FALLBACK_TECHNICIANS)
        }
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const filteredTechnicians = useMemo(() => {
    return technicians.filter((technician) => {
      const q = query.toLowerCase().trim()
      const matchesQuery =
        !q ||
        [technician.fullName, technician.reference, ...technician.skills].some((value) =>
          value.toLowerCase().includes(q)
        )
      const matchesRegion = !region || technician.region === region
      const matchesStatus = !status || technician.status === status
      return matchesQuery && matchesRegion && matchesStatus
    })
  }, [technicians, query, region, status])

  const activeCount = technicians.filter((t) => t.status === 'ACTIVE').length
  const coveredRegionsCount = new Set(technicians.map((t) => t.region)).size

  const updateFilter = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value && value !== 'All') next.set(name, value)
    else next.delete(name)
    setSearchParams(next)
  }

  return (
    <div className="technicians-container">
      <div className="head">
        <div>
          <h1>Technicians</h1>
          <p>Dispatch capability records used before assignment decisions.</p>
        </div>
        {canCreateTechnician && (
          <Link className="btn btn-create" to="/technicians/new">
            + New technician
          </Link>
        )}
      </div>

      <section className="stats" id="stats" aria-label="Summary">
        <div className="stat">
          <span>Technicians</span>
          <b>{technicians.length}</b>
          <small>Dispatch capability records</small>
        </div>
        <div className="stat">
          <span>Available</span>
          <b>{activeCount}</b>
          <small>Eligible for new work</small>
        </div>
        <div className="stat">
          <span>Unavailable</span>
          <b>{technicians.length - activeCount}</b>
          <small>Excluded from assignment</small>
        </div>
        <div className="stat">
          <span>Regions</span>
          <b>{coveredRegionsCount}</b>
          <small>Current coverage</small>
        </div>
      </section>

      <section className="panel">
        <div className="tools">
          <div className="search">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              className="field"
              id="q"
              type="search"
              placeholder="Search by name, reference or skill"
              aria-label="Search technicians"
              value={query}
              onChange={(e) => updateFilter('q', e.target.value)}
            />
          </div>

          <select
            className="field"
            id="fr"
            aria-label="Filter by region"
            value={region}
            onChange={(e) => updateFilter('region', e.target.value)}
          >
            <option value="">All regions</option>
            {REGIONS.map((item) => (
              <option key={item} value={item}>
                {REGION_LABELS[item]} region
              </option>
            ))}
          </select>

          <select
            className="field"
            id="fs"
            aria-label="Filter by state"
            value={status}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            <option value="">All states</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div className="tr th">
          <div>Technician</div>
          <div>Region</div>
          <div>Skills</div>
          <div>State</div>
        </div>

        <div id="list">
          {loading ? (
            <div className="empty">
              <LoadingState message="Loading technicians..." />
            </div>
          ) : error ? (
            <div className="empty">
              <ErrorState message={error} />
            </div>
          ) : technicians.length === 0 ? (
            <div className="empty">
              <b>No technicians yet</b>
              <p>Create the first technician record before assigning service jobs.</p>
            </div>
          ) : filteredTechnicians.length === 0 ? (
            <div className="empty">
              <b>No technicians match your search</b>
              <p>Try a different name or skill, or clear the filters.</p>
            </div>
          ) : (
            filteredTechnicians.map((technician) => {
              const palette = getAvatarPalette(technician.reference || technician.fullName)
              const isActive = technician.status === 'ACTIVE'

              return (
                <div
                  key={technician.id}
                  className="tr row row-item"
                  onClick={() => navigate(`/technicians/${technician.id}`)}
                >
                  <div className="person">
                    <div
                      className="av"
                      style={{
                        '--c1': palette[0],
                        '--c2': palette[1],
                      } as React.CSSProperties}
                    >
                      {getInitials(technician.fullName)}
                    </div>
                    <div>
                      <b>
                        <Link to={`/technicians/${technician.id}`}>
                          {technician.fullName}
                        </Link>
                      </b>
                      <small>{technician.reference}</small>
                    </div>
                  </div>

                  <div data-l="Region">
                    {REGION_LABELS[technician.region] ?? technician.region}
                  </div>

                  <div className="sk" data-l="Skills">
                    <span className="visually-hidden">{technician.skills.join(', ')}</span>
                    <div className="skills" aria-hidden="true">
                      {technician.skills.map((skill) => (
                        <span key={skill} className="skill">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div data-l="State">
                    <span className={`st${isActive ? '' : ' in'}`}>
                      <span className="visually-hidden">{technician.status}</span>
                      <span aria-hidden="true">{isActive ? 'Active' : 'Inactive'}</span>
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="foot" id="count" aria-live="polite">
          Showing {filteredTechnicians.length} of {technicians.length} technicians
        </div>
      </section>
    </div>
  )
}

export default TechnicianListPage
