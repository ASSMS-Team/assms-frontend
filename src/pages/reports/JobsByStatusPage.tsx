import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'

import { getJobsByStatus } from '../../services/reportService'
import type { ValidationProblemDetails } from '../../types/customer'
import type { JobsByStatusReport } from '../../types/report'

// The bounds the report was actually run with, as opposed to what is currently
// typed into the two inputs. A new object is what re-runs the report, so
// pressing Apply twice with the same dates refreshes rather than doing nothing.
interface AppliedFilters {
  from: string
  to: string
}

// Blank on arrival: the page is useful before anyone picks a range, and an
// empty form should not mean an empty screen.
const NO_FILTERS: AppliedFilters = { from: '', to: '' }

function JobsByStatusPage() {
  // Kept apart from the applied filters on purpose: typing a new date must not
  // change the table underneath until Apply is pressed, or the numbers on
  // screen would stop matching the range that produced them.
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [applied, setApplied] = useState<AppliedFilters>(NO_FILTERS)

  const [report, setReport] = useState<JobsByStatusReport | null>(null)
  // Keyed by field name, exactly as the API returns them - "from" and "to",
  // which are already the names of the inputs, so they line up without
  // translation.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Guards against Apply being pressed again while a request is in flight:
    // without it a slow response for the previous range could land after the
    // new one's and leave the wrong numbers under the new dates.
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

        // Cleared so a refused filter cannot leave the previous range's table
        // on screen next to the new range's dates.
        setReport(null)

        if (axios.isAxiosError<ValidationProblemDetails>(caught)) {
          const problem = caught.response?.data

          if (problem?.errors) {
            // The 400: a value that is not a date, or a from that falls after
            // its to. The API keys both against the query parameter to correct,
            // so they render against the inputs rather than as a banner.
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

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Marking the page as loading belongs here rather than in the effect: the
    // button has to read "Loading..." from this render, and a setState reachable
    // synchronously from an effect body is what causes the cascading renders the
    // React guidance warns about. The first run needs none of this - the initial
    // state already says loading.
    setLoading(true)
    setError(null)
    setFieldErrors({})

    setApplied({ from, to })
  }

  function errorsFor(field: string) {
    const messages = fieldErrors[field]

    if (!messages?.length) {
      return null
    }

    return (
      <ul className="invalid-feedback list-unstyled mb-0">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    )
  }

  const invalidFilters = Object.keys(fieldErrors).length > 0

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Jobs by status</h1>
          <p className="page-sub">
            How many jobs sit at each stage. Counted from when each job was
            raised, not from when this report last updated.
          </p>
        </div>
      </div>

      <div className="card app-card app-card-padded mb-3">
        <form onSubmit={handleApply} noValidate>
          <div className="row g-3 align-items-start">
            <div className="col-sm-4">
              <label className="form-label" htmlFor="from">
                From
              </label>
              <input
                id="from"
                name="from"
                type="date"
                className={`form-control${fieldErrors.from ? ' is-invalid' : ''}`}
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.from)}
              />
              {errorsFor('from')}
            </div>

            <div className="col-sm-4">
              <label className="form-label" htmlFor="to">
                To
              </label>
              <input
                id="to"
                name="to"
                type="date"
                className={`form-control${fieldErrors.to ? ' is-invalid' : ''}`}
                value={to}
                onChange={(event) => setTo(event.target.value)}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.to)}
              />
              {errorsFor('to')}
            </div>

            <div className="col-sm-4">
              {/* A hidden label keeps the button on the same baseline as the two
                  inputs without leaving a stray word above it. */}
              <label
                className="form-label invisible d-none d-sm-block"
                aria-hidden="true"
              >
                Apply
              </label>
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Apply'}
              </button>
            </div>
          </div>

          <p className="form-text mb-0">
            Both dates are optional and independent. Leave them blank to count
            every job.
          </p>
        </form>
      </div>

      <div className="card app-card">
        {loading ? (
          <div className="state-block">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="state-text">Loading report...</p>
          </div>
        ) : error ? (
          <div className="state-block">
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          </div>
        ) : invalidFilters ? (
          // The messages themselves already render against the inputs above, so
          // this only has to explain why there is no table.
          <div className="state-block">
            <p className="state-title">The report was not run</p>
            <p className="state-text">Correct the dates above and apply again.</p>
          </div>
        ) : report && report.statuses.length === 0 ? (
          // Nothing matching is a normal outcome, not an error and not a missing
          // page - say so rather than rendering a table with nothing but
          // headers.
          <div className="state-block">
            <div className="empty-mark">0</div>
            <p className="state-title">No jobs match these filters</p>
            <p className="state-text">
              Widen the date range, or clear both dates to count every job.
            </p>
          </div>
        ) : report ? (
          <div className="table-responsive">
            <table className="table table-hover app-table align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end">
                    Jobs
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.statuses.map((statusCount) => (
                  <tr key={statusCount.status}>
                    <td>{statusCount.status}</td>
                    <td className="text-end">{statusCount.count}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  {/* The API's own total, not a sum of the rows: the rows are
                      what it grouped, and re-adding them here would be a second
                      answer to the same question. */}
                  <th scope="row">Total</th>
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

export default JobsByStatusPage
