import type { LoginDraft } from './technicianLoginDraft'

export default function TechnicianLoginFields({ value, onChange }: { value: LoginDraft; onChange: (next: LoginDraft) => void }) {
  return <div className="row g-3">
    <div className="col-md-6"><label className="form-label" htmlFor="login-username">Login username</label>
      <input id="login-username" className="form-control" maxLength={100} autoComplete="off" value={value.username} onChange={(e) => onChange({ ...value, username: e.target.value })} />
      <p className="form-text">Can differ from the technician reference.</p></div>
    <div className="col-md-6"><label className="form-label" htmlFor="login-email">Login email</label>
      <input id="login-email" className="form-control" type="email" maxLength={254} autoComplete="off" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} /></div>
    <div className="col-md-6"><label className="form-label" htmlFor="login-password">Initial password</label>
      <input id="login-password" className="form-control" type="password" minLength={12} maxLength={128} autoComplete="new-password" value={value.password} onChange={(e) => onChange({ ...value, password: e.target.value })} />
      <p className="form-text">12–128 characters. Share privately with the technician.</p></div>
    <div className="col-md-6"><label className="form-label" htmlFor="login-confirm">Confirm password</label>
      <input id="login-confirm" className="form-control" type="password" autoComplete="new-password" value={value.confirmation} onChange={(e) => onChange({ ...value, confirmation: e.target.value })} /></div>
  </div>
}
