import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'

import { REGIONS, REGION_LABELS } from '../../constants/job'
import { getJobsByTechnician } from '../../services/reportService'
import type { ValidationProblemDetails } from '../../types/customer'
import type { JobsByTechnicianReport } from '../../types/report'

interface AppliedFilters { from: string; to: string; region: string }
const NO_FILTERS: AppliedFilters = { from: '', to: '', region: '' }

function JobsByTechnicianPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [region, setRegion] = useState('')
  const [applied, setApplied] = useState<AppliedFilters>(NO_FILTERS)
  const [report, setReport] = useState<JobsByTechnicianReport | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const loaded = await getJobsByTechnician({
          from: applied.from || undefined,
          to: applied.to || undefined,
          region: applied.region || undefined,
        })
        if (cancelled) return
        setReport(loaded); setError(null); setFieldErrors({})
      } catch (caught) {
        if (cancelled) return
        setReport(null)
        if (axios.isAxiosError<ValidationProblemDetails>(caught) && caught.response?.data.errors) {
          setFieldErrors(caught.response.data.errors); setError(null)
        } else {
          setFieldErrors({}); setError('Could not load the report. Check that the Reporting Service is running.')
        }
      } finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [applied])

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(null); setFieldErrors({})
    setApplied({ from: from.trim(), to: to.trim(), region })
  }

  function fieldError(field: string) {
    const messages = fieldErrors[field]
    return messages?.length ? <div className="invalid-feedback">{messages.join(' ')}</div> : null
  }

  const noData = report?.technicians.length === 0 && !loading && !error && Object.keys(fieldErrors).length === 0

  return <>
    <div className="page-head"><div><h1 className="page-title">Jobs by technician</h1><p className="page-sub">Assignment workload from the Reporting Service event-fed read model.</p></div></div>
    <div className="card app-card app-card-padded mb-3"><form onSubmit={apply} noValidate><div className="row g-3 align-items-end">
      <div className="col-lg-4"><label className="form-label" htmlFor="assignment-from">From (UTC)</label><input id="assignment-from" className={`form-control${fieldErrors.from ? ' is-invalid' : ''}`} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="2026-09-15T10:00:00Z" disabled={loading} />{fieldError('from')}</div>
      <div className="col-lg-4"><label className="form-label" htmlFor="assignment-to">To (UTC)</label><input id="assignment-to" className={`form-control${fieldErrors.to ? ' is-invalid' : ''}`} value={to} onChange={(e) => setTo(e.target.value)} placeholder="2026-09-16T10:00:00Z" disabled={loading} />{fieldError('to')}</div>
      <div className="col-lg-2"><label className="form-label" htmlFor="assignment-region">Region</label><select id="assignment-region" className={`form-select${fieldErrors.region ? ' is-invalid' : ''}`} value={region} onChange={(e) => setRegion(e.target.value)} disabled={loading}><option value="">All regions</option>{REGIONS.map((value) => <option key={value} value={value}>{REGION_LABELS[value]}</option>)}</select>{fieldError('region')}</div>
      <div className="col-lg-2"><button className="btn btn-primary w-100" disabled={loading} type="submit">{loading ? 'Loading...' : 'Apply'}</button></div>
    </div><p className="form-text mb-0 mt-2">Use RFC 3339 UTC timestamps. From is inclusive; To is exclusive. Filters combine using AND.</p></form></div>
    <div className="card app-card">{loading ? <div className="state-block"><div className="spinner-border text-primary" role="status" /><p className="state-text">Loading report...</p></div>
      : error ? <div className="state-block"><div className="alert alert-danger mb-0" role="alert">{error}</div></div>
        : Object.keys(fieldErrors).length > 0 ? <div className="state-block"><p className="state-title">The report was not run</p><p className="state-text">Correct the filters above and apply again.</p></div>
          : noData ? <div className="state-block"><div className="empty-mark">0</div><p className="state-title">No assignments match these filters</p><p className="state-text">Widen the time range or clear the region filter.</p></div>
            : report ? <div className="table-responsive"><table className="table table-hover app-table align-middle mb-0"><thead><tr><th>Technician</th><th className="text-end">Assigned jobs</th></tr></thead><tbody>{report.technicians.map((item) => <tr key={item.technicianId}><td><strong>{item.technicianReference}</strong><small className="d-block text-muted">{item.technicianId}</small></td><td className="text-end">{item.jobCount}</td></tr>)}</tbody><tfoot><tr><th>Total</th><th className="text-end">{report.total}</th></tr></tfoot></table></div> : null}</div>
  </>
}

export default JobsByTechnicianPage
