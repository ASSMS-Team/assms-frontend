import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getStaffAccounts } from '../../services/staffAccountService'
import type { StaffAccountResponse } from '../../services/staffAccountService'

function StaffAccountListPage() {
  const [accounts, setAccounts] = useState<StaffAccountResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getStaffAccounts()
      .then((data) => { if (!cancelled) setAccounts(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setError('Could not load staff accounts.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Staff accounts</h1>
          <p className="page-sub">Active internal staff logins provisioned through this system.</p>
        </div>
        <Link className="btn btn-primary" to="/staff-accounts/new" id="staff-accounts-create-link">
          ＋ Create account
        </Link>
      </div>

      {loading && <p className="page-status">Loading…</p>}

      {error && <p className="alert alert-danger" role="alert">{error}</p>}

      {!loading && !error && accounts.length === 0 && (
        <p className="page-status">No staff accounts found.</p>
      )}

      {!loading && accounts.length > 0 && (
        <div className="card app-card">
          <div className="table-responsive">
            <table className="table" id="staff-accounts-table">
              <thead>
                <tr>
                  <th>Full name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.fullName || account.username}</td>
                    <td><code>{account.username}</code></td>
                    <td>{account.email}</td>
                    <td>
                      <span className={`badge badge-role badge-role-${account.role.toLowerCase()}`}>
                        {account.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${account.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                        {account.status}
                      </span>
                    </td>
                    <td>{new Date(account.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

export default StaffAccountListPage
