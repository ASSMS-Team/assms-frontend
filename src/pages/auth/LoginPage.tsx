import axios from 'axios'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../auth/useAuth'

export default function LoginPage() {
  const { isAuthenticated, signIn } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  if (isAuthenticated) return <Navigate to="/customers" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await signIn(identifier.trim(), password)
      const requested = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
      navigate(requested || '/customers', { replace: true })
    } catch (failure) {
      setError(axios.isAxiosError(failure) && failure.response?.status === 401
        ? 'Invalid username/email or password.'
        : 'Login is temporarily unavailable. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="ASSMS introduction">
        <div className="auth-brand"><span className="app-brand-mark">A</span> ASSMS</div>
        <div>
          <p className="auth-kicker">Internal service workspace</p>
          <h1>Keep every service request moving.</h1>
          <p>One secure entry point for customer care, dispatch, field work and operational oversight.</p>
        </div>
        <p className="auth-boundary">Access is limited to approved ASSMS staff accounts.</p>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={submit} noValidate>
          <div>
            <p className="auth-kicker">Welcome back</p>
            <h2>Sign in to your workspace</h2>
            <p className="auth-help">Use the username or email assigned to your staff account.</p>
          </div>
          {error && <div className="alert alert-danger" role="alert">{error}</div>}
          <div>
            <label className="form-label" htmlFor="identifier">Username or email</label>
            <input id="identifier" className="form-control form-control-lg" autoComplete="username" required
              value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
          </div>
          <div>
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" type="password" className="form-control form-control-lg" autoComplete="current-password" required
              value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <button className="btn btn-primary btn-lg auth-submit" disabled={submitting || !identifier.trim() || !password}>
            {submitting ? 'Signing in…' : 'Sign in securely'}
          </button>
          <p className="auth-footnote">No public registration. Contact your Manager if you need access.</p>
        </form>
      </section>
    </main>
  )
}
