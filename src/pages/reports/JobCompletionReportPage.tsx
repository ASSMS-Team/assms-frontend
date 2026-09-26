import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

import { REGIONS, REGION_LABELS } from '../../constants/job'
import { getJobCompletions } from '../../services/reportService'
import type { ValidationProblemDetails } from '../../types/customer'
import type { JobCompletionReport } from '../../types/report'
import { formatDateTime } from '../../utils/formatDateTime'

interface AppliedFilters {
  from: string
  to: string
  region: string
}

const NO_FILTERS: AppliedFilters = { from: '', to: '', region: '' }
const DEFAULT_TIME = '00:00'

function asUtcTimestamp(value: string) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : date.toISOString()
}

function JobCompletionReportPage() {
  const [fromDate, setFromDate] = useState('')
  const [fromTime, setFromTime] = useState(DEFAULT_TIME)
  const [toDate, setToDate] = useState('')
  const [toTime, setToTime] = useState(DEFAULT_TIME)
  const [region, setRegion] = useState('')
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
        if (axios.isAxiosError<ValidationProblemDetails>(caught) && caught.response?.data.errors) {
          setFieldErrors(caught.response.data.errors)
          setError(null)
        } else {
          setFieldErrors({})
          setError('Could not load the report. Check that the Reporting Service is running.')
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

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setFieldErrors({})
    setApplied({
      from: fromDate ? asUtcTimestamp(`${fromDate}T${fromTime}`) : '',
      to: toDate ? asUtcTimestamp(`${toDate}T${toTime}`) : '',
      region,
    })
  }

  function fieldError(field: string) {
    const messages = fieldErrors[field]
    return messages?.length ? <div className="invalid-feedback">{messages.join(' ')}</div> : null
  }

  const noData = report?.jobs.length === 0 && !loading && !error && Object.keys(fieldErrors).length === 0

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Job completion report</h1>
          <p className="page-sub">Completed service volume from the Reporting Service event-fed read model.</p>
        </div>
      </div>

      <div className="card app-card app-card-padded mb-3">
        <form onSubmit={apply} noValidate>
          <div className="row g-3 align-items-end">
            <div className="col-lg-4">
              <label className="form-label" htmlFor="completion-from-date">
                From
              </label>
              <div className="input-group">
                <input
                  id="completion-from-date"
                  type="date"
                  className={`form-control${fieldErrors.from ? ' is-invalid' : ''}`}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  disabled={loading}
                  aria-label="From date"
                />
                <input
                  id="completion-from-time"
                  type="time"
                  className={`form-control${fieldErrors.from ? ' is-invalid' : ''}`}
                  value={fromTime}
                  onChange={(e) => setFromTime(e.target.value)}
                  disabled={loading}
                  aria-label="From time"
                />
              </div>
              {fieldError('from')}
            </div>

            <div className="col-lg-4">
              <label className="form-label" htmlFor="completion-to-date">
                To
              </label>
              <div className="input-group">
                <input
                  id="completion-to-date"
                  type="date"
                  className={`form-control${fieldErrors.to ? ' is-invalid' : ''}`}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  disabled={loading}
                  aria-label="To date"
                />
                <input
                  id="completion-to-time"
                  type="time"
                  className={`form-control${fieldErrors.to ? ' is-invalid' : ''}`}
                  value={toTime}
                  onChange={(e) => setToTime(e.target.value)}
                  disabled={loading}
                  aria-label="To time"
                />
              </div>
              {fieldError('to')}
            </div>

            <div className="col-lg-2">
              <label className="form-label" htmlFor="completion-region">
                Region
              </label>
              <select
                id="completion-region"
                className={`form-select${fieldErrors.region ? ' is-invalid' : ''}`}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={loading}
              >
                <option value="">All regions</option>
                {REGIONS.map((value) => (
                  <option key={value} value={value}>
                    {REGION_LABELS[value]}
                  </option>
                ))}
              </select>
              {fieldError('region')}
            </div>

            <div className="col-lg-2">
              <button className="btn btn-primary w-100" disabled={loading} type="submit">
                {loading ? 'Loading...' : 'Apply'}
              </button>
            </div>
          </div>
          <p className="form-text mb-0 mt-2">
            Use the calendar and clock controls in your local time. The report converts selected values to UTC automatically. From is inclusive; To is exclusive. Filters combine using AND.
          </p>
        </form>
      </div>

      <div className="card app-card">
        {loading ? (
          <div className="state-block">
            <div className="spinner-border text-primary" role="status" />
            <p className="state-text">Loading report...</p>
          </div>
        ) : error ? (
          <div className="state-block">
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          </div>
        ) : Object.keys(fieldErrors).length > 0 ? (
          <div className="state-block">
            <p className="state-title">The report was not run</p>
            <p className="state-text">Correct the filters above and apply again.</p>
          </div>
        ) : noData ? (
          <div className="state-block">
            <div className="empty-mark">0</div>
            <p className="state-title">No completed jobs match these filters</p>
            <p className="state-text">Widen the time range or clear the region filter.</p>
          </div>
        ) : report ? (
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
                      <Link to={`/jobs/${item.jobId}`} className="fw-semibold text-decoration-none">
                        {item.jobReference}
                      </Link>
                    </td>
                    <td>{REGION_LABELS[item.region as keyof typeof REGION_LABELS] || item.region}</td>
                    <td>{item.serviceCategory || '—'}</td>
                    <td>{item.technicianReference || 'Unassigned'}</td>
                    <td className="text-end text-nowrap">{formatDateTime(item.completedAt)}</td>
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
        ) : null}
      </div>
    </>
  )
}

export default JobCompletionReportPage
