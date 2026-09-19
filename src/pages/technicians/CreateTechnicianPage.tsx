import { Link } from 'react-router-dom'

import TechnicianForm from '../../components/forms/TechnicianForm'

function CreateTechnicianPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <Link className="back-link" to="/customers">&larr; Back to workspace</Link>
          <h1 className="page-title">New technician</h1>
          <p className="page-sub">Create the Dispatch record used for service-job assignment.</p>
        </div>
      </div>
      <div className="card app-card app-card-padded form-column">
        <TechnicianForm />
      </div>
    </>
  )
}

export default CreateTechnicianPage
