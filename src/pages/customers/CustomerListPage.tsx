import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import StatusBadge from '../../components/common/StatusBadge'
import LoadingState from '../../components/feedback/LoadingState'
import EmptyState from '../../components/feedback/EmptyState'
import ErrorState from '../../components/feedback/ErrorState'
import { CUSTOMER_TYPE_LABELS } from '../../constants/customer'
import { getAllCustomers } from '../../services/customerService'
import type { CustomerResponse } from '../../types/customer'
import { useAuth } from '../../auth/useAuth'
import { parseApiError } from '../../utils/formatApiError'

function CustomerListPage() {
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const canRegisterCustomer = hasRole('Agent', 'Manager')

  useEffect(() => {
    async function load() {
      try {
        setCustomers(await getAllCustomers())
      } catch (caught) {
        const parsed = parseApiError(caught, 'Could not load customers. Check that the customer service is running.')
        setError(parsed.message)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-sub">Everyone registered with the service, newest first.</p>
        </div>
        {canRegisterCustomer && (
          <Link className="btn btn-primary" to="/customers/new">
            New customer
          </Link>
        )}
      </div>

      <div className="card app-card">
        {loading ? (
          <LoadingState message="Loading customers..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customers yet"
            message="Register the first one to see it listed here."
            action={
              canRegisterCustomer ? (
                <Link className="btn btn-primary" to="/customers/new">
                  New customer
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover app-table align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Customer type</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="row-link"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  >
                    <td>
                      <Link className="row-link-name" to={`/customers/${customer.id}`}>
                        {customer.name}
                      </Link>
                    </td>
                    <td className="text-nowrap">{customer.phone}</td>
                    <td>{CUSTOMER_TYPE_LABELS[customer.customerType] ?? customer.customerType}</td>
                    <td>
                      <StatusBadge status={customer.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

export default CustomerListPage
