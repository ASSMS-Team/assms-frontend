import axios from 'axios'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../auth/useAuth'
import './LoginPage.css'

export default function LoginPage() {
  const { isAuthenticated, signIn } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [identifierError, setIdentifierError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  if (isAuthenticated) return <Navigate to="/customers" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    const trimmedId = identifier.trim()
    const isIdEmpty = !trimmedId
    const isPwEmpty = !password

    setIdentifierError(isIdEmpty)
    setPasswordError(isPwEmpty)

    if (isIdEmpty || isPwEmpty) {
      if (isIdEmpty) {
        document.getElementById('identifier')?.focus()
      } else {
        document.getElementById('password')?.focus()
      }
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await signIn(trimmedId, password)
      const requested = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
      navigate(requested || '/customers', { replace: true })
    } catch (failure) {
      setError(
        axios.isAxiosError(failure) && failure.response?.status === 401
          ? 'Invalid username/email or password.'
          : 'Login is temporarily unavailable. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentifier(e.target.value)
    if (identifierError) setIdentifierError(false)
    if (error) setError('')
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (passwordError) setPasswordError(false)
    if (error) setError('')
  }

  const handleForgotPassword = () => {
    setError('Passwords are reset by your Manager. Please contact them for a new one.')
  }

  return (
    <div className="signin-container">
      <div className="shell">
        <section className="hero" aria-hidden="true">
          <img className="logo-img" alt="ASSMS" src="/assets/auth-logo.png" />
          <p className="tagline">After-Sales Service Management System</p>
          <div className="dash"></div>
          <h2>Service that keeps you moving.</h2>
          <p>Manage customers, assets, service jobs and warranties in one place.</p>
          <img className="scene" alt="" src="/assets/auth-scene.jpg" />
        </section>

        <main className="pane">
          <div className="inner">
            <div className="mbrand">
              <img className="logo-img" alt="ASSMS" src="/assets/auth-logo.png" />
              <p className="tagline">After-Sales Service Management System</p>
            </div>
            <form id="form" onSubmit={submit} noValidate>
              <h1>Sign in to your workspace</h1>
              <p className="sub">Sign in to your account to continue.</p>

              <div
                className={`alert alert-danger ${error ? 'show' : ''}`}
                id="alert"
                role="alert"
                style={{ display: error ? 'block' : 'none' }}
              >
                {error}
              </div>

              <div className="field">
                <label className="label" htmlFor="identifier">Username or email</label>
                <div className="wrap">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                  <input
                    className={`inp ${identifierError ? 'bad' : ''}`}
                    id="identifier"
                    name="identifier"
                    placeholder="Enter your username or email"
                    autoComplete="username"
                    autoFocus
                    value={identifier}
                    onChange={handleIdentifierChange}
                  />
                  <em
                    className="err"
                    style={{ display: identifierError ? 'block' : 'none' }}
                  >
                    Enter your username or email.
                  </em>
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="password">Password</label>
                <div className="wrap pw">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="4" y="11" width="16" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 018 0v3" />
                  </svg>
                  <input
                    className={`inp ${passwordError ? 'bad' : ''}`}
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={handlePasswordChange}
                  />
                  <button
                    type="button"
                    className="eye"
                    id="eye"
                    aria-label="Show or hide password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <em
                  className="err"
                  style={{ display: passwordError ? 'block' : 'none' }}
                >
                  Enter your password.
                </em>
              </div>

              <div className="row">
                <label className="check">
                  <input
                    type="checkbox"
                    id="rem"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  className="link"
                  id="forgot"
                  onClick={handleForgotPassword}
                >
                  Forgot password?
                </button>
              </div>

              <button
                className={`btn auth-submit ${submitting ? 'load' : ''}`}
                id="go"
                type="submit"
                disabled={submitting}
              >
                <span className="spin"></span>
                <span id="lbl">{submitting ? 'Signing in…' : 'Sign In'}</span>
                {!submitting && <span id="arr">→</span>}
              </button>

              <p className="note">No public registration. Contact your Manager if you need access.</p>
            </form>
          </div>
          <div className="foot">
            <b>ASSMS</b> &nbsp;·&nbsp; <b>After-Sales Service Management System</b>
          </div>
        </main>
      </div>
    </div>
  )
}
