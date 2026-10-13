import { Link } from 'react-router-dom'

import StaffAccountForm from '../../components/forms/StaffAccountForm'

function CreateStaffAccountPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <Link className="back-link" to="/staff-accounts">
            &larr; Back to staff accounts
          </Link>
          <h1 className="page-title">Create staff account</h1>
          <p className="page-sub">Provision a new internal login with an appropriate role.</p>
        </div>
      </div>

      <div className="card app-card app-card-padded form-column">
        <StaffAccountForm />
      </div>
    </>
  )
}

export default CreateStaffAccountPage
