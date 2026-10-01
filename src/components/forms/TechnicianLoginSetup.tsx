import { useEffect, useState, type FormEvent } from 'react'
import { createTechnicianAccount, getTechnicianAccount, linkTechnicianAccount, loginSetupError, type TechnicianAccount } from '../../services/technicianAccounts'
import TechnicianLoginFields from './TechnicianLoginFields'
import { EMPTY_LOGIN, validateLogin } from './technicianLoginDraft'

export default function TechnicianLoginSetup({ technicianId }: { technicianId: string }) {
  const [account, setAccount] = useState<TechnicianAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [revision, setRevision] = useState(0)
  const [mode, setMode] = useState('create')
  const [draft, setDraft] = useState({ ...EMPTY_LOGIN })
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let cancelled = false
    void getTechnicianAccount(technicianId).then((result) => { if (!cancelled) setAccount(result) })
      .catch(() => { if (!cancelled) { setLoadFailed(true); setError('Could not check login setup. Try again.') } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [technicianId, revision])
  async function submit(event: FormEvent) {
    event.preventDefault()
    const validation = mode === 'create' ? validateLogin(draft) : !identifier.trim() ? 'Enter the existing Technician username or email.' : null
    if (validation) { setError(validation); return }
    setSaving(true); setError('')
    try {
      const result = mode === 'create'
        ? await createTechnicianAccount(technicianId, { username: draft.username.trim(), email: draft.email.trim(), password: draft.password })
        : await linkTechnicianAccount(technicianId, identifier.trim())
      setAccount(result); setDraft({ ...EMPTY_LOGIN }); setIdentifier('')
    } catch (cause) {
      // A response may be lost after the account was committed. Reconcile
      // before retry so successful provisioning is not mistaken for failure.
      try {
        const result = await getTechnicianAccount(technicianId)
        if (result) { setAccount(result); setDraft({ ...EMPTY_LOGIN }); return }
      } catch { /* Retain the original actionable error. */ }
      setError(loginSetupError(cause))
    } finally { setSaving(false) }
  }
  return <section className="card app-card app-card-padded mt-4" aria-label="Technician login access">
    <h2 className="h4">Login access</h2>
    {loading ? <p>Checking login setup…</p> : account ? <div role="status">
      <p>Linked login: <strong>{account.username}</strong> ({account.email})</p>
      <p className="mb-0">The technician must sign out and sign in again to use the linked assignments. Existing jobs are retained.</p>
    </div> : loadFailed ? <><p role="alert">{error}</p><button className="btn btn-outline-primary" onClick={() => { setLoading(true); setLoadFailed(false); setError(''); setRevision((n) => n + 1) }}>Check again</button></> : <form onSubmit={submit}>
      <p>Create a Technician login or link an existing active Technician account. This keeps the technician ID and assignments unchanged.</p>
      <div className="mb-3"><label className="form-label" htmlFor="login-mode">Login setup</label>
        <select id="login-mode" className="form-select" value={mode} onChange={(e) => { setMode(e.target.value); setDraft({ ...EMPTY_LOGIN }); setError('') }}>
          <option value="create">Create new login</option><option value="link">Link existing login</option>
        </select></div>
      <fieldset disabled={saving}>
        {mode === 'create' ? <TechnicianLoginFields value={draft} onChange={setDraft} /> : <div className="mb-3">
          <label className="form-label" htmlFor="existing-login">Existing Technician username or email</label>
          <input id="existing-login" className="form-control" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          <p className="form-text">Confirm this is the person who owns this technician record before linking.</p></div>}
        {error && <p className="alert alert-warning mt-3" role="alert">{error}</p>}
        <button className="btn btn-primary mt-3" disabled={saving}>{saving ? 'Setting up login…' : mode === 'create' ? 'Create login' : 'Link login'}</button>
      </fieldset>
    </form>}
  </section>
}
