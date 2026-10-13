import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

import CustomerForm from '../../components/forms/CustomerForm'
import LoadingState from '../../components/feedback/LoadingState'
import EmptyState from '../../components/feedback/EmptyState'
import ErrorState from '../../components/feedback/ErrorState'
import { getCustomerById } from '../../services/customerService'
import type { CustomerResponse } from '../../types/customer'
import { parseApiError } from '../../utils/formatApiError'

function EditCustomerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<CustomerResponse | null>(null)
  const [loading, setLoading] = useState(true)
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
          const parsed = parseApiError(caught, 'Could not load this customer. Check that the customer service is running.')
          setError(parsed.message)
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
          <LoadingState message="Loading customer..." />
        ) : notFound ? (
          <EmptyState
            icon="?"
            title="Customer not found"
            message={`No customer is registered with the id "${id}".`}
            action={
              <Link className="btn btn-primary" to="/customers">
                Back to customers
              </Link>
            }
          />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          customer && (
            <CustomerForm
              mode="edit"
              customerId={customer.id}
              initialValues={{
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
                customerType: customer.customerType,
                email: customer.email,
              }}
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
