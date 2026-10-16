import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import assmsLogo from '../../assets/assms-sidebar-logo.png'

function getInitials(username?: string): string {
  if (!username) return 'BM'
  if (username.includes('.')) {
    const parts = username.split('.')
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
  }
  return username.slice(0, 2).toUpperCase()
}

function AppLayout() {
  const { staff, signOut, hasRole } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navRef = useRef<HTMLElement>(null)

  const canManageCustomers = hasRole('Agent', 'Manager')
  const canDispatch = hasRole('Dispatcher', 'Manager')
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `operations-nav-link${isActive ? ' active' : ''}`

  function closeMenu() {
    setMenuOpen(false)
  }

  // Close mobile drawer on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Ensure active navigation link is scrolled into view in sidebar
  useEffect(() => {
    const cur = navRef.current?.querySelector<HTMLElement>('[aria-current="page"], .active')
    if (cur && typeof cur.scrollIntoView === 'function') {
      cur.scrollIntoView({ block: 'nearest' })
    }
  }, [location.pathname])

  const initials = getInitials(staff?.username)

  const isCustomersActive =
    location.pathname === '/customers' ||
    (location.pathname.startsWith('/customers/') && location.pathname !== '/customers/new')

  const isJobsActive =
    location.pathname === '/jobs' ||
    (location.pathname.startsWith('/jobs/') && location.pathname !== '/jobs/new')

  const isTechniciansActive =
    location.pathname === '/technicians' ||
    (location.pathname.startsWith('/technicians/') && location.pathname !== '/technicians/new')

  const isStaffAccountsActive =
    location.pathname === '/staff-accounts' ||
    (location.pathname.startsWith('/staff-accounts/') && location.pathname !== '/staff-accounts/new')

  return (
    <div className="app-shell">
      {/* SVG Icon Definitions */}
      <svg width="0" height="0" style={{ position: 'absolute', display: 'none' }} aria-hidden="true">
        <defs>
          <symbol id="users" viewBox="0 0 24 24">
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8" />
          </symbol>
          <symbol id="userplus" viewBox="0 0 24 24">
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6M22 11h-6" />
          </symbol>
          <symbol id="box" viewBox="0 0 24 24">
            <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
            <path d="M3.3 7.5L12 12.5l8.7-5M12 22V12.5" />
          </symbol>
          <symbol id="jobs" viewBox="0 0 24 24">
            <rect x="8" y="2" width="8" height="4" rx="1" />
            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 12h6M9 16h4" />
          </symbol>
          <symbol id="plus" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v8M8 12h8" />
          </symbol>
          <symbol id="wrench" viewBox="0 0 24 24">
            <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
          </symbol>
          <symbol id="chart" viewBox="0 0 24 24">
            <path d="M3 3v18h18" />
            <path d="M7 14v4M12 8v10M17 11v7" />
          </symbol>
          <symbol id="pulse" viewBox="0 0 24 24">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </symbol>
          <symbol id="done" viewBox="0 0 24 24">
            <path d="M22 11.1V12a10 10 0 11-5.9-9.1" />
            <path d="M22 4L12 14l-3-3" />
          </symbol>
          <symbol id="shield" viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </symbol>
          <symbol id="out" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </symbol>
          <symbol id="menu" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </symbol>
        </defs>
      </svg>

      {/* Modern ASSMS Sidebar */}
      <aside
        id="side"
        className={`side operations-sidebar${menuOpen ? ' open operations-sidebar-open' : ''}`}
        aria-label="Main navigation"
      >
        <div className="head">
          <Link className="logo" to="/customers" onClick={closeMenu} aria-label="ASSMS home">
            <img alt="ASSMS" src={assmsLogo} />
            <span>After-Sales Service Management System</span>
          </Link>
        </div>

        <nav id="nav" ref={navRef} className="operations-nav" aria-label="Sidebar navigation">
          <div className="grp">Workspace</div>
          <NavLink
            className={({ isActive }) =>
              `operations-nav-link${isActive || isCustomersActive ? ' active' : ''}`
            }
            aria-current={isCustomersActive ? 'page' : undefined}
            to="/customers"
            end
            onClick={closeMenu}
            data-t="Customers"
          >
            <svg className="i" aria-hidden="true"><use href="#users" /></svg>
            Customers
          </NavLink>
          {canManageCustomers && (
            <NavLink className={navClass} to="/customers/new" onClick={closeMenu} data-t="Register customer">
              <svg className="i" aria-hidden="true"><use href="#userplus" /></svg>
              Register customer
            </NavLink>
          )}
          {canManageCustomers && (
            <NavLink className={navClass} to="/assets/new" onClick={closeMenu} data-t="Register asset">
              <svg className="i" aria-hidden="true"><use href="#box" /></svg>
              Register asset
            </NavLink>
          )}

          <div className="grp">Dispatch</div>
          {hasRole('Technician') && (
            <NavLink className={navClass} to="/my-jobs" onClick={closeMenu} data-t="My jobs">
              <svg className="i" aria-hidden="true"><use href="#jobs" /></svg>
              My jobs
            </NavLink>
          )}
          {canDispatch && (
            <NavLink
              className={({ isActive }) =>
                `operations-nav-link${isActive || isJobsActive ? ' active' : ''}`
              }
              aria-current={isJobsActive ? 'page' : undefined}
              to="/jobs"
              end
              onClick={closeMenu}
              data-t="Jobs"
            >
              <svg className="i" aria-hidden="true"><use href="#jobs" /></svg>
              Jobs
            </NavLink>
          )}
          {hasRole('Agent', 'Dispatcher', 'Manager') && (
            <NavLink className={navClass} to="/jobs/new" onClick={closeMenu} data-t="New service job">
              <svg className="i" aria-hidden="true"><use href="#plus" /></svg>
              New service job
            </NavLink>
          )}
          {canDispatch && (
            <NavLink
              className={({ isActive }) =>
                `operations-nav-link${isActive || isTechniciansActive ? ' active' : ''}`
              }
              aria-current={isTechniciansActive ? 'page' : undefined}
              to="/technicians"
              end
              onClick={closeMenu}
              data-t="Technicians"
            >
              <svg className="i" aria-hidden="true"><use href="#wrench" /></svg>
              Technicians
            </NavLink>
          )}
          {canDispatch && (
            <NavLink className={navClass} to="/technicians/new" onClick={closeMenu} data-t="Add technician">
              <svg className="i" aria-hidden="true"><use href="#userplus" /></svg>
              Add technician
            </NavLink>
          )}

          {canDispatch && (
            <>
              <div className="grp">Insight</div>
              <NavLink className={navClass} to="/reports/jobs-by-status" onClick={closeMenu} data-t="Jobs by status">
                <svg className="i" aria-hidden="true"><use href="#chart" /></svg>
                Jobs by status
              </NavLink>
              {hasRole('Manager') && (
                <NavLink className={navClass} to="/reports/jobs-by-technician" onClick={closeMenu} data-t="Jobs by technician">
                  <svg className="i" aria-hidden="true"><use href="#pulse" /></svg>
                  Jobs by technician
                </NavLink>
              )}
              {hasRole('Manager') && (
                <NavLink className={navClass} to="/reports/job-completions" onClick={closeMenu} data-t="Job completions">
                  <svg className="i" aria-hidden="true"><use href="#done" /></svg>
                  Job completions
                </NavLink>
              )}
            </>
          )}

          {hasRole('Manager') && (
            <>
              <div className="grp">Admin</div>
              <NavLink
                className={({ isActive }) =>
                  `operations-nav-link${isActive || isStaffAccountsActive ? ' active' : ''}`
                }
                aria-current={isStaffAccountsActive ? 'page' : undefined}
                to="/staff-accounts"
                end
                onClick={closeMenu}
                data-t="Staff accounts"
              >
                <svg className="i" aria-hidden="true"><use href="#shield" /></svg>
                Staff accounts
              </NavLink>
              <NavLink className={navClass} to="/staff-accounts/new" onClick={closeMenu} data-t="Add staff account">
                <svg className="i" aria-hidden="true"><use href="#userplus" /></svg>
                Add staff account
              </NavLink>
            </>
          )}
        </nav>

        <div className="foot operations-sidebar-footer">
          <div className="user">
            <div className="av operations-avatar" aria-hidden="true">{initials}</div>
            <div>
              <b>{staff?.username}</b>
              <span className="role">{staff?.role}</span>
            </div>
          </div>
          <button type="button" className="out" id="out" onClick={signOut}>
            <svg className="i" aria-hidden="true"><use href="#out" /></svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Scrim backdrop for mobile view */}
      <div
        id="scrim"
        className={`scrim${menuOpen ? ' show' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <div className="operations-workspace">
        <header className="operations-topbar">
          <button
            id="burger"
            className="burger operations-menu"
            type="button"
            aria-label="Open navigation"
            aria-controls="side"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg className="i" aria-hidden="true"><use href="#menu" /></svg>
          </button>
          <div className="operations-topbar-left">
            <span className="environment-indicator">
              <i aria-hidden="true" /> <strong>Staging workspace</strong>
            </span>
            <span className="operations-topbar-divider">/</span>
            <span className="operations-topbar-sub">Service delivery</span>
          </div>
          <div className="operations-topbar-role">{staff?.role}</div>
        </header>

        <main className="operations-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
