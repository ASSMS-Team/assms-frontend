import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import StatusBadge from '../../components/common/StatusBadge'
import { CUSTOMER_TYPE_LABELS } from '../../constants/customer'
import { getAllCustomers } from '../../services/customerService'
import type { CustomerResponse } from '../../types/customer'

function CustomerListPage() {
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      try {
        setCustomers(await getAllCustomers())
      } catch {
        setError('Could not load customers. Check that the customer service is running.')
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
        <Link className="btn btn-primary" to="/customers/new">
          New customer
        </Link>
      </div>

      <div className="card app-card">
        {loading ? (
          <div className="state-block">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="state-text">Loading customers...</p>
          </div>
        ) : error ? (
          <div className="state-block">
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          </div>
        ) : customers.length === 0 ? (
          // An empty list is a normal outcome, not an error - say so instead of
          // rendering a table with nothing but headers.
          <div className="state-block">
            <div className="empty-mark">0</div>
            <p className="state-title">No customers yet</p>
            <p className="state-text">Register the first one to see it listed here.</p>
            <Link className="btn btn-primary" to="/customers/new">
              New customer
            </Link>
          </div>
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
                      {/* A real link as well as the clickable row, so the page
                          stays reachable by keyboard. */}
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
