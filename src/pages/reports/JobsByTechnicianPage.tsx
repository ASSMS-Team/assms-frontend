import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'

import { REGIONS, REGION_LABELS } from '../../constants/job'
import { getJobsByTechnician } from '../../services/reportService'
import type { ValidationProblemDetails } from '../../types/customer'
import type { JobsByTechnicianReport } from '../../types/report'
import './JobsByTechnicianPage.css'

interface AppliedFilters {
  from: string
  to: string
  region: string
}

const NO_FILTERS: AppliedFilters = { from: '', to: '', region: '' }
const SHADES = ['#0f4a37', '#178a5c', '#5cb98c', '#a6dcc2', '#cfeadb']

// datetime-local returns a local wall-clock time. Convert it at the boundary
// so the API always receives its RFC 3339 UTC contract value.
function asUtcTimestamp(value: string) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : date.toISOString()
}

function formatDisplayDateTime(val: string): string {
  if (!val) return ''
  const d = new Date(val)
  if (Number.isNaN(d.valueOf())) return val
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getRangeDescription(fromVal: string, toVal: string, regionVal: string): string {
  const datePart =
    fromVal && toVal
      ? `${formatDisplayDateTime(fromVal)} to ${formatDisplayDateTime(toVal)}`
      : fromVal
      ? `From ${formatDisplayDateTime(fromVal)}`
      : toVal
      ? `Before ${formatDisplayDateTime(toVal)}`
      : 'All dates'

  const regionLabel =
    REGION_LABELS[regionVal as keyof typeof REGION_LABELS] || regionVal
  const regionPart = regionVal ? `${regionLabel} region` : 'all regions'

  return `${datePart}, ${regionPart}`
}

function JobsByTechnicianPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [region, setRegion] = useState('')
  const [clientError, setClientError] = useState<string | null>(null)
  const [applied, setApplied] = useState<AppliedFilters>(NO_FILTERS)

  const [report, setReport] = useState<JobsByTechnicianReport | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const loaded = await getJobsByTechnician({
          from: applied.from || undefined,
          to: applied.to || undefined,
          region: applied.region || undefined,
        })

        if (cancelled) {
          return
        }

        setReport(loaded)
        setError(null)
        setFieldErrors({})
      } catch (caught) {
        if (cancelled) {
          return
        }

        setReport(null)

        if (
          axios.isAxiosError<ValidationProblemDetails>(caught) &&
          caught.response?.data.errors
        ) {
          setFieldErrors(caught.response.data.errors)
          setError(null)
        } else {
          setFieldErrors({})
          setError(
            'Could not load the report. Check that the Reporting Service is running.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [applied])

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (from && to && from >= to) {
      setClientError('To must be later than From. Adjust one of the times.')
      return
    }

    setClientError(null)
    setLoading(true)
    setError(null)
    setFieldErrors({})
    setApplied({
      from: asUtcTimestamp(from),
      to: asUtcTimestamp(to),
      region,
    })
  }

  function handleCopyId(id: string) {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(id)
        .then(() => {
          setCopiedId(id)
          setTimeout(() => setCopiedId(null), 1400)
        })
        .catch(() => {})
    }
  }

  const isFromBad = Boolean(clientError || fieldErrors.from)
  const isToBad = Boolean(clientError || fieldErrors.to)
  const isBad = Boolean(clientError || fieldErrors.from || fieldErrors.to)

  const noteText = clientError
    ? clientError
    : fieldErrors.from?.length
    ? fieldErrors.from.join(' ')
    : fieldErrors.to?.length
    ? fieldErrors.to.join(' ')
    : 'Times are in your local time and converted to UTC for the report. From is inclusive, To is exclusive, and filters combine using AND.'

  const rows = [...(report?.technicians || [])].sort(
    (a, b) => b.jobCount - a.jobCount || a.technicianReference.localeCompare(b.technicianReference),
  )

  const total = report ? report.total : 0
  const max = rows[0] ? rows[0].jobCount : 0

  const captionText = `assigned ${total === 1 ? 'job' : 'jobs'} across ${
    rows.length
  } ${rows.length === 1 ? 'technician' : 'technicians'}`

  const rangeText = getRangeDescription(from, to, region)
  const invalidFilters = Object.keys(fieldErrors).length > 0

  return (
    <div className="jobs-by-technician-container">
      <h1>Jobs by technician</h1>
      <p className="sub">
        Assignment workload from the Reporting Service event-fed read model.
      </p>

      <form className="card filters" id="filters" onSubmit={handleApply} noValidate>
        <label className="f" htmlFor="from">
          <span>From</span>
          <input
            className={`inp${isFromBad ? ' bad' : ''}`}
            type="datetime-local"
            id="from"
            name="from"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              if (clientError) setClientError(null)
            }}
            disabled={loading}
            aria-label="From"
            aria-invalid={isFromBad}
          />
        </label>

        <label className="f" htmlFor="to">
          <span>To</span>
          <input
            className={`inp${isToBad ? ' bad' : ''}`}
            type="datetime-local"
            id="to"
            name="to"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              if (clientError) setClientError(null)
            }}
            disabled={loading}
            aria-label="To"
            aria-invalid={isToBad}
          />
        </label>

        <label className="f" htmlFor="region">
          <span>Region</span>
          <select
            className={`inp${fieldErrors.region ? ' bad' : ''}`}
            id="region"
            name="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={loading}
            aria-label="Region"
          >
            <option value="">All regions</option>
            {REGIONS.map((value) => (
              <option key={value} value={value}>
                {REGION_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Apply'}
        </button>

        <p className={`note${isBad ? ' err' : ''}`} id="note">
          {noteText}
        </p>
      </form>

      <section className="card report" aria-live="polite">
        {loading ? (
          <div className="report-state" role="status">
            <div className="spinner" />
            <p className="state-text">Loading report...</p>
          </div>
        ) : error ? (
          <div className="report-state error">
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          </div>
        ) : invalidFilters ? (
          <div className="report-state">
            <p className="report-state-title">The report was not run</p>
            <p className="state-text">Correct the filters above and apply again.</p>
          </div>
        ) : (
          <>
            <div className="sum">
              <div className="sum-head">
                <div className="total">
                  <span id="total">{total}</span>
                  <small id="cap">{captionText}</small>
                </div>
                <div className="range" id="range">
                  {rangeText}
                </div>
              </div>
              <div
                className="stack"
                id="stack"
                role="img"
                aria-label="Share of assigned jobs by technician"
              >
                {rows.map((x, i) => (
                  <i
                    key={x.technicianId}
                    title={`${x.technicianReference}: ${x.jobCount}`}
                    style={{
                      flexGrow: x.jobCount,
                      backgroundColor: SHADES[Math.min(i, 4)],
                    }}
                  />
                ))}
              </div>
            </div>

            <ul className="rows" id="rows">
              {rows.length === 0 ? (
                <li className="empty">
                  <span>No assignments match these filters</span>. Widen the
                  dates or choose All regions.
                </li>
              ) : (
                rows.map((x, i) => {
                  const p = total ? Math.round((x.jobCount / total) * 100) : 0
                  const w = max ? Math.round((x.jobCount / max) * 100) : 0
                  const badgeCode =
                    x.technicianReference.length >= 3
                      ? x.technicianReference.slice(-3)
                      : x.technicianReference
                  const isTopPick = x.jobCount === max && rows.length > 1
                  const color =
                    SHADES[Math.min(i, 2) === 0 ? 1 : Math.min(i, 2)]

                  return (
                    <li
                      key={x.technicianId}
                      className={`row${isTopPick ? ' top-pick' : ''}`}
                      style={
                        {
                          '--c': color,
                          '--w': `${w}%`,
                        } as React.CSSProperties
                      }
                    >
                      <div className="who">
                        <div className="badge">{badgeCode}</div>
                        <div style={{ minWidth: 0 }}>
                          <b>{x.technicianReference}</b>
                          <button
                            type="button"
                            className={`uid${
                              copiedId === x.technicianId ? ' done' : ''
                            }`}
                            onClick={() => handleCopyId(x.technicianId)}
                            aria-label={`Copy technician ID ${x.technicianId}`}
                          >
                            <span>{x.technicianId}</span>
                            <em>
                              {copiedId === x.technicianId ? 'Copied' : 'Copy'}
                            </em>
                          </button>
                        </div>
                      </div>
                      <div className="track" aria-hidden="true">
                        <b
                          style={{
                            width: `${w}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <div className="n">{x.jobCount}</div>
                      <div className="pct">{p}%</div>
                    </li>
                  )
                })
              )}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}

export default JobsByTechnicianPage
