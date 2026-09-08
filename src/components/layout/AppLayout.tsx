import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

// Chrome shared by every page: the top bar and the centred content column.
// Pages render into the Outlet and worry only about their own content.
function AppLayout() {
  const { staff, signOut, hasRole } = useAuth()
  return (
    <div className="app-shell">
      <nav className="navbar navbar-expand app-navbar sticky-top">
        <div className="container">
          <Link className="navbar-brand app-brand" to="/customers">
            <span className="app-brand-mark">A</span>
            <span>
              ASSMS
              <small className="app-brand-sub">Customer &amp; Asset</small>
            </span>
          </Link>

          <div className="navbar-nav ms-auto">
            <NavLink className="nav-link app-nav-link" to="/customers" end>
              Customers
            </NavLink>
            {hasRole('Agent', 'Manager') && <NavLink className="nav-link app-nav-link" to="/customers/new">New customer</NavLink>}
            {hasRole('Agent', 'Manager') && <NavLink className="nav-link app-nav-link" to="/assets/new">New asset</NavLink>}
            {hasRole('Agent', 'Dispatcher', 'Manager') && <NavLink className="nav-link app-nav-link" to="/jobs/new">New job</NavLink>}
            {hasRole('Dispatcher', 'Manager') && <NavLink className="nav-link app-nav-link" to="/technicians/new">New technician</NavLink>}
            {hasRole('Dispatcher', 'Manager') && <NavLink className="nav-link app-nav-link" to="/reports/jobs-by-status">Jobs by status</NavLink>}
          </div>
          <div className="app-user ms-3">
            <span><strong>{staff?.username}</strong><small>{staff?.role}</small></span>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={signOut}>Logout</button>
          </div>
        </div>
      </nav>

      <main className="container app-main">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
