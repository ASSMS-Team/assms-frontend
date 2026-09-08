import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AuthProvider } from './AuthProvider'
import ProtectedRoute from './ProtectedRoute'
import RoleRoute from './RoleRoute'

function token(role: string, expiresInSeconds = 3600) {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'staff-1', unique_name: 'sawan', role, exp: Math.floor(Date.now() / 1000) + expiresInSeconds })}.test`
}

function renderRoutes(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login screen</div>} />
          <Route path="/forbidden" element={<div>Access denied</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/customers" element={<div>Customer workspace</div>} />
            <Route element={<RoleRoute roles={['Manager']} />}>
              <Route path="/manager" element={<div>Manager function</div>} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('authentication routes', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => cleanup())

  it('redirects an unauthenticated request to login', () => {
    renderRoutes('/customers')
    expect(screen.getByText('Login screen')).toBeInTheDocument()
  })

  it('allows a valid staff token into a protected route', () => {
    sessionStorage.setItem('assms.staff.access-token', token('Agent'))
    renderRoutes('/customers')
    expect(screen.getByText('Customer workspace')).toBeInTheDocument()
  })

  it('denies a valid token whose role is outside the route policy', () => {
    sessionStorage.setItem('assms.staff.access-token', token('Technician'))
    renderRoutes('/manager')
    expect(screen.getByText('Access denied')).toBeInTheDocument()
  })

  it('treats an expired token as unauthenticated', () => {
    sessionStorage.setItem('assms.staff.access-token', token('Manager', -1))
    renderRoutes('/customers')
    expect(screen.getByText('Login screen')).toBeInTheDocument()
  })
})
