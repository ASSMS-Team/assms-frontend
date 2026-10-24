import { Link } from 'react-router-dom'

import StaffAccountForm from '../../components/forms/StaffAccountForm'
import './CreateStaffAccountPage.css'

function CreateStaffAccountPage() {
  return (
    <div className="create-staff-account-container">
      <Link className="back" to="/staff-accounts">
        ← Back to staff accounts
      </Link>
      <h1>Create staff account</h1>
      <p className="sub">
        Set up a new internal login with the right role. They can sign in right away.
      </p>

      <StaffAccountForm />
    </div>
  )
}

export default CreateStaffAccountPage
