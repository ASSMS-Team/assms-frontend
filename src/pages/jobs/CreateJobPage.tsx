import { Link } from 'react-router-dom'

import JobForm from '../../components/forms/JobForm'

function CreateJobPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <Link className="back-link" to="/jobs">
            &larr; Back to jobs
          </Link>
          <h1 className="page-title">New service job</h1>
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
