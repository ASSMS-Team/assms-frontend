import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useAuth } from '../../auth/useAuth'
import { deactivateStaffAccount, getStaffAccounts, staffAccountError } from '../../services/staffAccountService'
import type { StaffAccountResponse } from '../../services/staffAccountService'
import { getAllTechnicians } from '../../services/dispatchService'
import type { TechnicianResponse } from '../../types/technician'

const ROLES = ['Agent', 'Dispatcher', 'Technician', 'Manager'] as const

function StaffAccountListPage() {
  const { staff } = useAuth()
  const [accounts, setAccounts] = useState<StaffAccountResponse[]>([])
  const [technicians, setTechnicians] = useState<TechnicianResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const urlQuery = searchParams.get('q') ?? ''
  const roleFilter = searchParams.get('role') ?? ''
  const statusFilter = searchParams.get('status') ?? ''

  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery)
  const [searchQuery, setSearchQuery] = useState(urlQuery)

  if (prevUrlQuery !== urlQuery) {
    setPrevUrlQuery(urlQuery)
    setSearchQuery(urlQuery)
  }

  useEffect(() => {
    if (searchQuery === urlQuery) return

    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (searchQuery) next.set('q', searchQuery)
        else next.delete('q')
        return next
      }, { replace: true })
    }, 200)

    return () => clearTimeout(timer)
  }, [searchQuery, urlQuery, setSearchParams])

  const loadData = useCallback(() => {
    return Promise.allSettled([
      getStaffAccounts(),
      getAllTechnicians(),
    ]).then(([accountData, technicianData]) => {
      if (accountData.status === 'fulfilled') {
        setAccounts(Array.isArray(accountData.value) ? accountData.value : [])
      } else {
        setError(staffAccountError(accountData.reason))
      }

      if (technicianData.status === 'fulfilled' && Array.isArray(technicianData.value)) {
        setTechnicians(technicianData.value)
      }
    }).catch((err) => {
      setError(staffAccountError(err))
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function handleRetry() {
    setLoading(true)
    setError(null)
    void loadData()
  }

  const technicianMap = useMemo(() => {
    const map = new Map<string, TechnicianResponse>()
    for (const tech of technicians) {
      map.set(tech.id, tech)
    }
    return map
  }, [technicians])

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return accounts.filter((account) => {
      const matchesQuery = !q || [account.fullName, account.username, account.email]
        .some((val) => val?.toLowerCase().includes(q))

      const matchesRole = !roleFilter || account.role.toLowerCase() === roleFilter.toLowerCase()
      const matchesStatus = !statusFilter || account.status.toLowerCase() === statusFilter.toLowerCase()

      return matchesQuery && matchesRole && matchesStatus
    })
  }, [accounts, searchQuery, roleFilter, statusFilter])

  const activeCount = accounts.filter((a) => a.status === 'ACTIVE').length
  const inactiveCount = accounts.filter((a) => a.status === 'INACTIVE').length

  function updateFilter(name: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(name, value)
      else next.delete(name)
      return next
    })
  }

  function clearFilters() {
    setSearchQuery('')
    setSearchParams(new URLSearchParams())
  }

  async function handleDeactivate(account: StaffAccountResponse) {
    setActionError(null)
    setActionSuccess(null)

    const isRetry = account.status === 'INACTIVE' && account.role === 'Technician' && account.dispatchSyncStatus === 'PENDING_RETRY'

    if (!isRetry) {
      const isCurrentManager = account.id === staff?.id || (Boolean(staff?.username) && account.username.toLowerCase() === staff?.username.toLowerCase())
      if (isCurrentManager) {
        setActionError('Self-deactivation safeguard: You cannot deactivate your own currently authenticated Manager account.')
        return
      }

      const techNote = account.role === 'Technician' && account.technicianId
        ? ' Linked Dispatch technician availability will also be deactivated.'
        : ''

      const confirmed = window.confirm(
        `Deactivate staff account "${account.fullName || account.username}"? Future login will be prevented while historical data is preserved.${techNote}`
      )
      if (!confirmed) return
    }

    setDeactivatingId(account.id)
    try {
      const updated = await deactivateStaffAccount(account.id)
      setAccounts((prev) =>
        prev.map((item) => (item.id === account.id ? { ...item, status: updated.status, dispatchSyncStatus: updated.dispatchSyncStatus } : item))
      )
      if (updated.dispatchSyncStatus === 'PENDING_RETRY') {
        setActionError(
          `Staff access for "${account.fullName || account.username}" was revoked, but Dispatch technician synchronization is pending retry (Dispatch service is currently unreachable). Retry once Dispatch is restored to complete offboarding.`
        )
      } else if (account.role === 'Technician' && account.technicianId) {
        setActionSuccess(
          `Successfully deactivated "${account.fullName || account.username}". Access has been revoked and linked Dispatch technician has been marked inactive for assignments.`
        )
      } else {
        setActionSuccess(
          `Successfully deactivated "${account.fullName || account.username}". Access has been revoked and future login is prevented.`
        )
      }
    } catch (err) {
      setActionError(staffAccountError(err))
    } finally {
      setDeactivatingId(null)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Staff accounts</h1>
          <p className="page-sub">Internal logins, assigned roles, and access statuses across the organization.</p>
        </div>
        <Link className="btn btn-primary" to="/staff-accounts/new" id="staff-accounts-create-link">
          ＋ Create account
        </Link>
      </div>

      {actionSuccess && (
        <div className="alert alert-success alert-dismissible" role="status">
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="alert alert-danger" role="alert">
          {actionError}
        </div>
      )}

      {!loading && !error && accounts.length > 0 && (
        <section className="operations-metrics" aria-label="Staff accounts summary">
          <article>
            <span>Total staff</span>
            <strong>{accounts.length}</strong>
            <small>Registered logins</small>
          </article>
          <article>
            <span>Active</span>
            <strong>{activeCount}</strong>
            <small>Eligible for login</small>
          </article>
          <article>
            <span>Inactive</span>
            <strong>{inactiveCount}</strong>
            <small>Access deactivated</small>
          </article>
          <article>
            <span>Roles in use</span>
            <strong>{new Set(accounts.map((a) => a.role)).size}</strong>
            <small>Across operations</small>
          </article>
        </section>
      )}

      <div className="card app-card">
        {loading ? (
          <div className="state-block">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading…</span>
            </div>
            <p className="state-text">Loading staff accounts…</p>
          </div>
        ) : error ? (
          <div className="state-block">
            <div className="alert alert-danger mb-3" role="alert">{error}</div>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={handleRetry}
              id="staff-accounts-retry-btn"
            >
              Retry
            </button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="state-block">
            <div className="empty-mark">0</div>
            <p className="state-title">No staff accounts found</p>
            <p className="state-text">Provision the first staff account to provide internal system access.</p>
            <Link className="btn btn-primary" to="/staff-accounts/new">Create staff account</Link>
          </div>
        ) : (
          <>
            <div className="operations-toolbar">
              <label className="visually-hidden" htmlFor="staff-search">Search staff accounts</label>
              <input
                id="staff-search"
                type="search"
                placeholder="Search name, username or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <label className="visually-hidden" htmlFor="staff-role-filter">Filter by role</label>
              <select
                id="staff-role-filter"
                value={roleFilter}
                onChange={(e) => updateFilter('role', e.target.value)}
              >
                <option value="">All roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <label className="visually-hidden" htmlFor="staff-status-filter">Filter by status</label>
              <select
                id="staff-status-filter"
                value={statusFilter}
                onChange={(e) => updateFilter('status', e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              <span>{filteredAccounts.length} shown</span>
            </div>

            {filteredAccounts.length === 0 ? (
              <div className="state-block">
                <div className="empty-mark">0</div>
                <p className="state-title">No staff accounts match these filters</p>
                <p className="state-text">Clear a filter or search with a different term.</p>
                <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="table-responsive staff-table-responsive">
                <table className="table table-hover app-table align-middle mb-0" id="staff-accounts-table">
                  <thead>
                    <tr>
                      <th scope="col">Staff member</th>
                      <th scope="col">Username</th>
                      <th scope="col">Email</th>
                      <th scope="col">Role</th>
                      <th scope="col">Linked technician</th>
                      <th scope="col">Status</th>
                      <th scope="col">Created date</th>
                      <th scope="col">Created by</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((account) => {
                      const linkedTech = account.technicianId ? technicianMap.get(account.technicianId) : null
                      const isCurrentUser = account.id === staff?.id || (Boolean(staff?.username) && account.username.toLowerCase() === staff?.username.toLowerCase())

                      return (
                        <tr key={account.id}>
                          <td data-label="Staff member">
                            <strong>{account.fullName || account.username}</strong>
                            {isCurrentUser && <span className="badge bg-secondary ms-2">You</span>}
                          </td>
                          <td data-label="Username"><code className="code-badge">{account.username}</code></td>
                          <td data-label="Email">{account.email}</td>
                          <td data-label="Role">
                            <span className={`badge badge-role badge-role-${account.role.toLowerCase()}`}>
                              {account.role}
                            </span>
                          </td>
                          <td data-label="Linked technician">
                            {account.role === 'Technician' ? (
                              account.technicianId ? (
                                linkedTech ? (
                                  <Link to={`/technicians/${linkedTech.id}`}>
                                    <strong>{linkedTech.reference}</strong> <small className="text-muted">({linkedTech.fullName})</small>
                                  </Link>
                                ) : (
                                  <span title={account.technicianId}>
                                    <code className="code-badge">{account.technicianId.slice(0, 8)}…</code>
                                  </span>
                                )
                              ) : (
                                <span className="text-muted">Unlinked</span>
                              )
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                            {account.role === 'Technician' && account.status === 'INACTIVE' && account.dispatchSyncStatus === 'PENDING_RETRY' && (
                              <span className="badge bg-warning text-dark ms-2" title="Dispatch sync pending">Sync pending</span>
                            )}
                          </td>
                          <td data-label="Status">
                            <span className={`badge ${account.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                              {account.status}
                            </span>
                          </td>
                          <td data-label="Created date">
                            {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td data-label="Created by">
                            {account.createdBy ? <code className="code-badge">{account.createdBy.slice(0, 8)}…</code> : <span className="text-muted">N/A</span>}
                          </td>
                          <td data-label="Action">
                            {account.status === 'ACTIVE' ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                disabled={isCurrentUser || deactivatingId === account.id}
                                title={isCurrentUser ? 'You cannot deactivate your own account' : 'Deactivate staff account'}
                                onClick={() => void handleDeactivate(account)}
                              >
                                {deactivatingId === account.id ? 'Deactivating…' : 'Deactivate'}
                              </button>
                            ) : account.role === 'Technician' && account.technicianId && account.dispatchSyncStatus === 'PENDING_RETRY' ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-warning"
                                disabled={deactivatingId === account.id}
                                title="Retry Dispatch technician synchronization"
                                onClick={() => void handleDeactivate(account)}
                              >
                                {deactivatingId === account.id ? 'Retrying…' : 'Retry sync'}
                              </button>
                            ) : (
                              <span className="text-muted small">Deactivated</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

export default StaffAccountListPage
