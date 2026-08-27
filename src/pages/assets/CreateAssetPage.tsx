import { Link } from 'react-router-dom'

import AssetForm from '../../components/forms/AssetForm'

// Thin wrapper: title and layout only. Everything to do with the form - state,
// submission, error handling - belongs to the form component.
function CreateAssetPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <Link className="back-link" to="/customers">
            &larr; Back to customers
          </Link>
          <h1 className="page-title">New asset</h1>
          <p className="page-sub">Register equipment against a customer.</p>
        </div>
      </div>

      <div className="card app-card app-card-padded form-column">
        <AssetForm />
      </div>
    </>
  )
}

export default CreateAssetPage
