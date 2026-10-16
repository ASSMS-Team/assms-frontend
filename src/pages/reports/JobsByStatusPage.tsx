import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'

import { getJobsByStatus } from '../../services/reportService'
import type { ValidationProblemDetails } from '../../types/customer'
import type { JobsByStatusReport } from '../../types/report'
import './JobsByStatusPage.css'

interface AppliedFilters {
  from: string
  to: string
}

const NO_FILTERS: AppliedFilters = { from: '', to: '' }

interface StageDefinition {
  key: string
  label: string
  hint: string
  color: string
}

const STAGES: StageDefinition[] = [
  { key: 'CREATED', label: 'Created', hint: 'Raised, not yet assigned', color: 'var(--s-created)' },
  { key: 'ASSIGNED', label: 'Assigned', hint: 'Waiting for a technician to start', color: 'var(--s-assigned)' },
  { key: 'IN_PROGRESS', label: 'In progress', hint: 'Technician is on site', color: 'var(--s-progress)' },
  { key: 'COMPLETED', label: 'Completed', hint: 'Work finished', color: 'var(--s-done)' },
  { key: 'CANCELLED', label: 'Cancelled', hint: 'Closed without work', color: 'var(--s-cancel)' },
]

function toLocalDateIso(d: Date): string {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

function getPresetDates(days: number): { from: string; to: string } {
  if (days === 0) {
    return { from: '', to: '' }
  }
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - days)
  return {
    from: toLocalDateIso(from),
    to: toLocalDateIso(to),
  }
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr + 'T00:00:00')
    if (Number.isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function getRangeDescription(fromVal: string, toVal: string): string {
  if (fromVal && toVal) {
    return `Raised ${formatDisplayDate(fromVal)} to ${formatDisplayDate(toVal)}`
  }
  if (fromVal) {
    return `Raised since ${formatDisplayDate(fromVal)}`
  }
  if (toVal) {
    return `Raised up to ${formatDisplayDate(toVal)}`
  }
  return 'All jobs'
}

function JobsByStatusPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [activePreset, setActivePreset] = useState<number | null>(0)
  const [clientError, setClientError] = useState<string | null>(null)
  const [applied, setApplied] = useState<AppliedFilters>(NO_FILTERS)

  const [report, setReport] = useState<JobsByStatusReport | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const loaded = await getJobsByStatus(applied.from, applied.to)

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

        if (axios.isAxiosError<ValidationProblemDetails>(caught)) {
          const problem = caught.response?.data

          if (problem?.errors) {
            setFieldErrors(problem.errors)
            setError(null)
          } else {
            setError(
              'Could not load the report. Check that the reporting service is running.',
            )
            setFieldErrors({})
          }
        } else {
          setError('Something went wrong while loading the report.')
          setFieldErrors({})
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

  function handlePresetClick(days: number) {
    setActivePreset(days)
    setClientError(null)
    setFieldErrors({})
    setError(null)
    const range = getPresetDates(days)
    setFrom(range.from)
    setTo(range.to)
    setLoading(true)
    setApplied(range)
  }

  function handleFromChange(val: string) {
    setFrom(val)
    setActivePreset(null)
    if (clientError) setClientError(null)
  }

  function handleToChange(val: string) {
    setTo(val)
    setActivePreset(null)
    if (clientError) setClientError(null)
  }

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (from && to && from > to) {
      setClientError('The start date is after the end date. Swap them or clear one.')
      return
    }

    setClientError(null)
    setLoading(true)
    setError(null)
    setFieldErrors({})
    setApplied({ from, to })
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
    : 'Both dates are optional. Leave them blank to count every job.'

  // Build status count lookup
  const statusCountMap = new Map<string, number>()
  if (report?.statuses) {
    for (const item of report.statuses) {
      statusCountMap.set(item.status.trim().toUpperCase(), item.count)
    }
  }

  const total = report ? report.total : 0

  const stageRows = STAGES.map((stage) => {
    const count = statusCountMap.get(stage.key) ?? 0
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0
    return {
      ...stage,
      count,
      percentage,
    }
  })

  // Support any unexpected dynamic statuses from upstream read model
  if (report?.statuses) {
    const knownKeys = new Set(STAGES.map((s) => s.key))
    for (const item of report.statuses) {
      const key = item.status.trim().toUpperCase()
      if (!knownKeys.has(key)) {
        const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0
        stageRows.push({
          key,
          label: item.status,
          hint: `Status: ${item.status}`,
          color: '#6b7280',
          count: item.count,
          percentage,
        })
      }
    }
  }

  const nonZeroStages = stageRows.filter((s) => s.count > 0)
  const rangeText = getRangeDescription(applied.from, applied.to)
  const invalidFilters = Object.keys(fieldErrors).length > 0

  return (
    <div className="jobs-by-status-container">
      <h1>Jobs by status</h1>
      <p className="sub">
        How many jobs sit at each stage, counted from the date each job was raised.
      </p>

      <form className="card filters" id="filters" onSubmit={handleApply} noValidate>
        <div className="presets" role="group" aria-label="Quick range">
          <button
            type="button"
            data-days="0"
            aria-pressed={activePreset === 0}
            onClick={() => handlePresetClick(0)}
          >
            All time
          </button>
          <button
            type="button"
            data-days="7"
            aria-pressed={activePreset === 7}
            onClick={() => handlePresetClick(7)}
          >
            Last 7 days
          </button>
          <button
            type="button"
            data-days="30"
            aria-pressed={activePreset === 30}
            onClick={() => handlePresetClick(30)}
          >
            Last 30 days
          </button>
        </div>

        <label className="f" htmlFor="from">
          <span>From</span>
          <input
            className={`inp${isFromBad ? ' bad' : ''}`}
            type="date"
            id="from"
            name="from"
            value={from}
            onChange={(e) => handleFromChange(e.target.value)}
            disabled={loading}
            aria-invalid={isFromBad}
          />
        </label>

        <label className="f" htmlFor="to">
          <span>To</span>
          <input
            className={`inp${isToBad ? ' bad' : ''}`}
            type="date"
            id="to"
            name="to"
            value={to}
            onChange={(e) => handleToChange(e.target.value)}
            disabled={loading}
            aria-invalid={isToBad}
          />
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
            <p className="state-text">Correct the dates above and apply again.</p>
          </div>
        ) : (
          <>
            <div className="sum">
              <div className="sum-head">
                <div className="total">
                  <span id="total">{total}</span>
                  <small>jobs in total</small>
                </div>
                <div className="range" id="range">
                  {rangeText}
                </div>
              </div>
              <div className="stack" id="stack" role="img" aria-label="Share of jobs by status">
                {nonZeroStages.map((stage) => (
                  <i
                    key={stage.key}
                    title={`${stage.label}: ${stage.count}`}
                    style={{
                      flexGrow: stage.count,
                      backgroundColor: stage.color,
                    }}
                  />
                ))}
              </div>
            </div>

            <ul className="rows" id="rows">
              {stageRows.map((stage) => (
                <li
                  key={stage.key}
                  className={`row${stage.count === 0 ? ' zero' : ''}`}
                  style={
                    {
                      '--c': stage.color,
                      '--w': `${stage.percentage}%`,
                    } as React.CSSProperties
                  }
                >
                  <div className="name">
                    <span className="dot" style={{ backgroundColor: stage.color }} />
                    <div>
                      {stage.label}
                      <small>{stage.hint}</small>
                    </div>
                  </div>
                  <div className="track" aria-hidden="true">
                    <b
                      style={{
                        width: `${stage.percentage}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                  <div className="n">{stage.count}</div>
                  <div className="pct">{stage.percentage}%</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}

export default JobsByStatusPage
