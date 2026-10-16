import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useAuth } from '../../auth/useAuth'
import { deactivateStaffAccount, getStaffAccounts, staffAccountError } from '../../services/staffAccountService'
import type { StaffAccountResponse } from '../../services/staffAccountService'
import { getAllTechnicians } from '../../services/dispatchService'
import type { TechnicianResponse } from '../../types/technician'
import './StaffAccountListPage.css'

const ROLES = ['Agent', 'Dispatcher', 'Technician', 'Manager'] as const

const ROLE_AVATAR_COLORS: Record<string, [string, string]> = {
  Agent: ['#7a8cff', '#3a45b8'],
  Dispatcher: ['#ffc94d', '#c78400'],
  Manager: ['#ff8a80', '#c0392b'],
  Technician: ['#5db8ff', '#0b5aa6'],
}

function getInitials(name: string): string {
  const parts = name.split(/[.\s_]/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

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
    <div className="staff-container">
      <div className="staff-head">
        <div>
          <h1>Staff accounts</h1>
          <p>Manage who can sign in and what role they have.</p>
        </div>
        <Link className="staff-create-btn" to="/staff-accounts/new" id="staff-accounts-create-link">
          + Create account
        </Link>
      </div>

      {actionSuccess && (
        <div className="alert alert-success alert-dismissible mb-4" role="status">
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="alert alert-danger mb-4" role="alert">
          {actionError}
        </div>
      )}

      {!loading && !error && accounts.length > 0 && (
        <section className="staff-stats" aria-label="Staff accounts summary">
          <div className="staff-stat">
            <span>Total staff</span>
            <b>{accounts.length}</b>
            <small>Registered logins</small>
          </div>
          <div className="staff-stat">
            <span>Active</span>
            <b>{activeCount}</b>
            <small>Eligible to sign in</small>
          </div>
          <div className="staff-stat">
            <span>Inactive</span>
            <b>{inactiveCount}</b>
            <small>Access turned off</small>
          </div>
          <div className="staff-stat">
            <span>Roles in use</span>
            <b>{new Set(accounts.map((a) => a.role)).size}</b>
            <small>Across operations</small>
          </div>
        </section>
      )}

      <div className="staff-panel">
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
          <div className="empty">
            <b>No staff accounts found</b>
            <p>Provision the first staff account to provide internal system access.</p>
            <Link className="staff-create-btn" to="/staff-accounts/new">+ Create staff account</Link>
          </div>
        ) : (
          <>
            <div className="staff-tools">
              <div className="staff-search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <label className="visually-hidden" htmlFor="staff-search">Search staff accounts</label>
                <input
                  className="staff-field"
                  id="staff-search"
                  type="search"
                  placeholder="Search by name, username or email"
                  aria-label="Search staff"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <label className="visually-hidden" htmlFor="staff-role-filter">Filter by role</label>
              <select
                className="staff-field"
                id="staff-role-filter"
                aria-label="Filter by role"
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
                className="staff-field"
                id="staff-status-filter"
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => updateFilter('status', e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {filteredAccounts.length === 0 ? (
              <div className="empty">
                <b>No staff accounts match these filters</b>
                <p>Clear a filter or search with a different term.</p>
                <button type="button" className="staff-ghost" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="staff-table-wrap">
                  <table className="staff-table" id="staff-accounts-table">
                    <thead>
                      <tr>
                        <th scope="col">Staff member</th>
                        <th scope="col">Username</th>
                        <th scope="col">Role</th>
                        <th scope="col">Linked technician</th>
                        <th scope="col">Status</th>
                        <th scope="col">Created</th>
                        <th scope="col"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAccounts.map((account) => {
                        const linkedTech = account.technicianId ? technicianMap.get(account.technicianId) : null
                        const isCurrentUser =
                          account.id === staff?.id ||
                          (Boolean(staff?.username) && account.username.toLowerCase() === staff?.username.toLowerCase())
                        const avatarColors = ROLE_AVATAR_COLORS[account.role] ?? ['#7a8cff', '#3a45b8']
                        const initials = getInitials(account.fullName || account.username)

                        return (
                          <tr key={account.id} className={`staff-row${account.status === 'ACTIVE' ? '' : ' off'}`}>
                            <td data-label="Staff member">
                              <div className="person">
                                <div
                                  className="av"
                                  style={{
                                    '--c1': avatarColors[0],
                                    '--c2': avatarColors[1],
                                  } as React.CSSProperties}
                                >
                                  {initials}
                                </div>
                                <div>
                                  <b>
                                    {account.fullName || account.username}
                                    {isCurrentUser && <span className="you">You</span>}
                                  </b>
                                  <small>{account.email}</small>
                                </div>
                              </div>
                            </td>
                            <td data-label="Username">
                              <span className="staff-username">{account.username}</span>
                            </td>
                            <td data-label="Role">
                              <span className={`role r-${account.role.toLowerCase()}`}>
                                {account.role}
                              </span>
                            </td>
                            <td data-label="Linked technician">
                              {account.role === 'Technician' ? (
                                account.technicianId ? (
                                  linkedTech ? (
                                    <Link className="tech" to={`/technicians/${linkedTech.id}`}>
                                      <b>{linkedTech.reference}</b>
                                      <small>({linkedTech.fullName})</small>
                                    </Link>
                                  ) : (
                                    <span title={account.technicianId}>
                                      <code className="mono">{account.technicianId.slice(0, 8)}…</code>
                                    </span>
                                  )
                                ) : (
                                  <span className="none">None</span>
                                )
                              ) : (
                                <span className="none">None</span>
                              )}
                              {account.role === 'Technician' && account.status === 'INACTIVE' && account.dispatchSyncStatus === 'PENDING_RETRY' && (
                                <span className="badge bg-warning text-dark ms-2" title="Dispatch sync pending">Sync pending</span>
                              )}
                            </td>
                            <td data-label="Status">
                              <span className={`st${account.status === 'ACTIVE' ? '' : ' in'}`}>
                                {account.status}
                              </span>
                            </td>
                            <td data-label="Created" className="date">
                              {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td data-label="Action">
                              {account.status === 'ACTIVE' ? (
                                <button
                                  type="button"
                                  className="act act-deactivate"
                                  disabled={isCurrentUser || deactivatingId === account.id}
                                  title={isCurrentUser ? 'You cannot deactivate your own account' : 'Deactivate staff account'}
                                  onClick={() => void handleDeactivate(account)}
                                >
                                  {deactivatingId === account.id ? 'Deactivating…' : 'Deactivate'}
                                </button>
                              ) : account.role === 'Technician' && account.technicianId && account.dispatchSyncStatus === 'PENDING_RETRY' ? (
                                <button
                                  type="button"
                                  className="act act-reactivate act-retry ok"
                                  disabled={deactivatingId === account.id}
                                  title="Retry Dispatch technician synchronization"
                                  onClick={() => void handleDeactivate(account)}
                                >
                                  {deactivatingId === account.id ? 'Retrying…' : 'Retry sync'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="act act-reactivate"
                                  disabled
                                  title="Account is currently inactive"
                                >
                                  Reactivate<span className="visually-hidden">Deactivated</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="foot" id="count" aria-live="polite">
                  Showing {filteredAccounts.length} of {accounts.length} staff
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default StaffAccountListPage
