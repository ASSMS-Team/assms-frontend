import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

import CustomerForm from '../../components/forms/CustomerForm'
import { getCustomerById } from '../../services/customerService'
import type { CustomerResponse } from '../../types/customer'

function EditCustomerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<CustomerResponse | null>(null)
  const [loading, setLoading] = useState(true)
  // Kept separate from `error` for the same reason as on the detail page: a 404
  // is an expected answer to a valid question, not a failure. It is also set
  // from the form, for a customer deleted between loading and saving.
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      if (!id) {
        setNotFound(true)
        setLoading(false)

        return
      }

      try {
        setCustomer(await getCustomerById(id))
      } catch (caught) {
        if (axios.isAxiosError(caught) && caught.response?.status === 404) {
          setNotFound(true)
        } else {
          setError('Could not load this customer. Check that the customer service is running.')
        }
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id])

  return (
    <>
      <div className="page-head">
        <div>
          <Link className="back-link" to={id ? `/customers/${id}` : '/customers'}>
            &larr; Back to customer
          </Link>
          <h1 className="page-title">{customer ? `Edit ${customer.name}` : 'Edit customer'}</h1>
          <p className="page-sub">
            Name, phone, address, customer type and email. The id and status do not change.
          </p>
        </div>
      </div>

      <div className="card app-card app-card-padded form-column">
        {loading ? (
          <div className="state-block">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="state-text">Loading customer...</p>
          </div>
        ) : notFound ? (
          <div className="state-block">
            <div className="empty-mark">?</div>
            <p className="state-title">Customer not found</p>
            <p className="state-text">
              No customer is registered with the id <code>{id}</code>.
            </p>
            <Link className="btn btn-primary" to="/customers">
              Back to customers
            </Link>
          </div>
        ) : error ? (
          <div className="state-block">
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          </div>
        ) : (
          customer && (
            <CustomerForm
              mode="edit"
              customerId={customer.id}
              // Only the editable fields; status and the timestamps stay with
              // the server, and the id travels in the URL.
              initialValues={{
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
                customerType: customer.customerType,
                email: customer.email,
              }}
              // The detail page showing the new values is the confirmation, so
              // there is no success message to leave behind here.
              onSaved={(saved) => navigate(`/customers/${saved.id}`)}
              onNotFound={() => setNotFound(true)}
            />
          )
        )}
      </div>
    </>
  )
}

export default EditCustomerPage
