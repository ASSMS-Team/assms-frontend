import { Link } from 'react-router-dom'

import CustomerForm from '../../components/forms/CustomerForm'

// Thin wrapper: title and layout only. Everything to do with the form - state,
// submission, error handling - belongs to the form component.
function CreateCustomerPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <Link className="back-link" to="/customers">
            &larr; Back to customers
          </Link>
          <h1 className="page-title">New customer</h1>
          <p className="page-sub">Register a customer with the service.</p>
        </div>
      </div>

      <div className="card app-card app-card-padded form-column">
        <CustomerForm mode="create" />
      </div>
    </>
  )
}

export default CreateCustomerPage
