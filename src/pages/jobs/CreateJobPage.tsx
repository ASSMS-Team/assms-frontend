import { Link } from 'react-router-dom'

import JobForm from '../../components/forms/JobForm'

// Thin wrapper: title and layout only. Everything to do with the form - state,
// the cascading asset lookup, submission, error handling - belongs to the form
// component.
function CreateJobPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <Link className="back-link" to="/customers">
            &larr; Back to customers
          </Link>
          <h1 className="page-title">New job</h1>
          <p className="page-sub">Raise a service job against a customer’s unit.</p>
        </div>
      </div>

      <div className="card app-card app-card-padded form-column">
        <JobForm />
      </div>
    </>
  )
}

export default CreateJobPage
