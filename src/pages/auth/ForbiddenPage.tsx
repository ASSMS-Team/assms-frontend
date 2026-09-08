import { Link } from 'react-router-dom'

export default function ForbiddenPage() {
  return (
    <section className="state-block app-card">
      <p className="auth-kicker">Access restricted</p>
      <h1 className="page-title">Your role cannot open this function.</h1>
      <p className="page-sub">Return to the customer workspace or ask a Manager if your assigned role is incorrect.</p>
      <Link className="btn btn-primary mt-3" to="/customers">Return to customers</Link>
    </section>
  )
}
