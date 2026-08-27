import { Link, NavLink, Outlet } from 'react-router-dom'

// Chrome shared by every page: the top bar and the centred content column.
// Pages render into the Outlet and worry only about their own content.
function AppLayout() {
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
            <NavLink className="nav-link app-nav-link" to="/customers/new">
              New customer
            </NavLink>
            <NavLink className="nav-link app-nav-link" to="/assets/new">
              New asset
            </NavLink>
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
