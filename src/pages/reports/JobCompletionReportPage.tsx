import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

import { REGIONS, REGION_LABELS } from '../../constants/job'
import { getJobCompletions } from '../../services/reportService'
import type { ValidationProblemDetails } from '../../types/customer'
import type { JobCompletionReport } from '../../types/report'
import { formatDateTime } from '../../utils/formatDateTime'
import './JobCompletionReportPage.css'

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

function JobCompletionReportPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [region, setRegion] = useState('')
  const [clientError, setClientError] = useState<string | null>(null)
  const [applied, setApplied] = useState<AppliedFilters>(NO_FILTERS)

  const [report, setReport] = useState<JobCompletionReport | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const loaded = await getJobCompletions({
          from: applied.from || undefined,
          to: applied.to || undefined,
          region: applied.region || undefined,
        })

        if (cancelled) return

        setReport(loaded)
        setError(null)
        setFieldErrors({})
      } catch (caught) {
        if (cancelled) return

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
        if (!cancelled) setLoading(false)
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

  function handleClearFilters() {
    setFrom('')
    setTo('')
    setRegion('')
    setClientError(null)
    setFieldErrors({})
    setError(null)
    setLoading(true)
    setApplied(NO_FILTERS)
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

  // Aggregate completed jobs by region
  const regionCountMap = new Map<string, number>()
  if (report?.jobs) {
    for (const job of report.jobs) {
      const regLabel =
        REGION_LABELS[job.region as keyof typeof REGION_LABELS] || job.region
      regionCountMap.set(regLabel, (regionCountMap.get(regLabel) || 0) + 1)
    }
  }

  const regionRows = Array.from(regionCountMap.entries())
    .map(([regionName, n]) => ({ region: regionName, n }))
    .sort((a, b) => b.n - a.n || a.region.localeCompare(b.region))

  const total = report ? report.total : 0
  const maxRegion = regionRows[0] ? regionRows[0].n : 0
  const none = total === 0

  const captionText = none
    ? 'completed jobs'
    : `completed ${total === 1 ? 'job' : 'jobs'} across ${regionRows.length} ${
        regionRows.length === 1 ? 'region' : 'regions'
      }`

  const rangeText = getRangeDescription(from, to, region)
  const invalidFilters = Object.keys(fieldErrors).length > 0

  return (
    <div className="job-completions-container">
      <h1>Job completion report</h1>
      <p className="sub">
        Completed service volume from the Reporting Service event-fed read model.
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
        <div className={`sum${none ? ' is-zero' : ''}`} id="sum">
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
            aria-label="Share of completed jobs by region"
          >
            {!none &&
              regionRows.map((x, i) => (
                <i
                  key={x.region}
                  title={`${x.region}: ${x.n}`}
                  style={{
                    flexGrow: x.n,
                    backgroundColor: SHADES[Math.min(i, 4)],
                  }}
                />
              ))}
          </div>
        </div>

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
        ) : none ? (
          <div className="empty" id="empty">
            <div className="ring">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
            <h2>No completed jobs match these filters</h2>
            <p>Widen the time range or choose All regions to see more results.</p>
            <button
              type="button"
              className="ghost"
              id="clear"
              onClick={handleClearFilters}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="rows" id="rows">
            {regionRows.map((x, i) => {
              const p = Math.round((x.n / total) * 100)
              const w = maxRegion ? Math.round((x.n / maxRegion) * 100) : 0
              const color = SHADES[Math.min(i, 2) || 1]

              return (
                <li
                  key={x.region}
                  className="row"
                  style={
                    {
                      '--c': color,
                      '--w': `${w}%`,
                    } as React.CSSProperties
                  }
                >
                  <div className="name">
                    <span className="pin" />
                    {x.region}
                  </div>
                  <div className="track" aria-hidden="true">
                    <b
                      style={{
                        width: `${w}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <div className="n">{x.n}</div>
                  <div className="pct">{p}%</div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {!loading && !error && !invalidFilters && !none && report && (
        <div className="jobs-table-card">
          <div className="table-responsive">
            <table className="table table-hover app-table align-middle mb-0">
              <thead>
                <tr>
                  <th>Job reference</th>
                  <th>Region</th>
                  <th>Category</th>
                  <th>Technician</th>
                  <th className="text-end">Completed at</th>
                </tr>
              </thead>
              <tbody>
                {report.jobs.map((item) => (
                  <tr key={item.jobId}>
                    <td>
                      <Link
                        to={`/jobs/${item.jobId}`}
                        className="fw-semibold text-decoration-none"
                      >
                        {item.jobReference}
                      </Link>
                    </td>
                    <td>
                      {REGION_LABELS[item.region as keyof typeof REGION_LABELS] ||
                        item.region}
                    </td>
                    <td>{item.serviceCategory || '—'}</td>
                    <td>{item.technicianReference || 'Unassigned'}</td>
                    <td className="text-end text-nowrap">
                      {formatDateTime(item.completedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={4}>Total Completed Jobs</th>
                  <th className="text-end">{report.total}</th>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobCompletionReportPage
