import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'

import StatusBadge from '../../components/common/StatusBadge'
import { CUSTOMER_TYPE_LABELS } from '../../constants/customer'
import { getCustomerById } from '../../services/customerService'
import type { CustomerResponse } from '../../types/customer'
import { formatDateTime } from '../../utils/formatDateTime'

function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<CustomerResponse | null>(null)
  const [loading, setLoading] = useState(true)
  // Kept separate from `error` on purpose: a 404 is an expected answer to a
  // valid question, not a failure, and it reads differently to the user.
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
          <Link className="back-link" to="/customers">
            &larr; Back to customers
          </Link>
          <h1 className="page-title">{customer ? customer.name : 'Customer'}</h1>
          {customer && <p className="page-sub">Registered {formatDateTime(customer.createdAt)}</p>}
        </div>
        {customer && (
          <div className="d-flex align-items-center gap-3">
            <StatusBadge status={customer.status} />
            <Link className="btn btn-primary" to={`/customers/${customer.id}/edit`}>
              Edit
            </Link>
          </div>
        )}
      </div>

      <div className="card app-card">
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
            <dl className="detail-grid mb-0">
              <div className="detail-row">
                <dt>Name</dt>
                <dd>{customer.name}</dd>
              </div>
              <div className="detail-row">
                <dt>Phone</dt>
                <dd>{customer.phone}</dd>
              </div>
              <div className="detail-row">
                <dt>Address</dt>
                <dd>{customer.address}</dd>
              </div>
              <div className="detail-row">
                <dt>Customer type</dt>
                <dd>{CUSTOMER_TYPE_LABELS[customer.customerType] ?? customer.customerType}</dd>
              </div>
              <div className="detail-row">
                <dt>Email</dt>
                <dd>{customer.email ?? <span className="text-muted">Not provided</span>}</dd>
              </div>
              <div className="detail-row">
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={customer.status} />
                </dd>
              </div>
              <div className="detail-row">
                <dt>Created</dt>
                <dd>{formatDateTime(customer.createdAt)}</dd>
              </div>
              <div className="detail-row">
                <dt>Last updated</dt>
                <dd>{formatDateTime(customer.updatedAt)}</dd>
              </div>
              <div className="detail-row">
                <dt>Id</dt>
                <dd>
                  <code className="detail-id">{customer.id}</code>
                </dd>
              </div>
            </dl>
          )
        )}
      </div>
    </>
  )
}

export default CustomerDetailPage
