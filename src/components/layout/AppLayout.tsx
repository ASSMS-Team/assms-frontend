import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

function AppLayout() {
  const { staff, signOut, hasRole } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const canManageCustomers = hasRole('Agent', 'Manager')
  const canDispatch = hasRole('Dispatcher', 'Manager')
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `operations-nav-link${isActive ? ' active' : ''}`

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`operations-sidebar${menuOpen ? ' operations-sidebar-open' : ''}`} aria-label="Primary navigation">
        <Link className="operations-brand" to="/customers" onClick={closeMenu}>
          <img className="app-brand-mark" src="/assets/assms-mark.png" alt="" />
          <span className="operations-brand-copy">
            <strong>ASSMS</strong>
            <small>Service operations</small>
          </span>
        </Link>

        <nav className="operations-nav">
          <p className="operations-nav-label">Workspace</p>
          <NavLink className={navClass} to="/customers" end onClick={closeMenu}>
            <span aria-hidden="true">◈</span> Customers
          </NavLink>
          {canManageCustomers && <NavLink className={navClass} to="/customers/new" onClick={closeMenu}>
            <span aria-hidden="true">＋</span> Register customer
          </NavLink>}
          {canManageCustomers && <NavLink className={navClass} to="/assets/new" onClick={closeMenu}>
            <span aria-hidden="true">◇</span> Register asset
          </NavLink>}

          <p className="operations-nav-label">Dispatch</p>
          {hasRole('Agent', 'Dispatcher', 'Manager') && <NavLink className={navClass} to="/jobs/new" onClick={closeMenu}>
            <span aria-hidden="true">↗</span> New service job
          </NavLink>}
          {canDispatch && <NavLink className={navClass} to="/technicians" onClick={closeMenu}>
            <span aria-hidden="true">◎</span> Technicians
          </NavLink>}
          {canDispatch && <NavLink className={navClass} to="/technicians/new" onClick={closeMenu}>
            <span aria-hidden="true">＋</span> Add technician
          </NavLink>}

          {canDispatch && <>
            <p className="operations-nav-label">Insight</p>
            <NavLink className={navClass} to="/reports/jobs-by-status" onClick={closeMenu}>
              <span aria-hidden="true">▤</span> Jobs by status
            </NavLink>
          </>}
        </nav>

        <div className="operations-sidebar-footer">
          <span className="operations-avatar" aria-hidden="true">{staff?.username.slice(0, 2).toUpperCase()}</span>
          <span><strong>{staff?.username}</strong><small>{staff?.role}</small></span>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <div className="operations-workspace">
        <header className="operations-topbar">
          <button className="operations-menu" type="button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>☰</button>
          <div className="environment-indicator"><i aria-hidden="true" /> Staging workspace</div>
          <p className="operations-context">ASSMS <span>/</span> Service delivery</p>
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
