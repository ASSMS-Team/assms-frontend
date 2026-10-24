import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

import StatusBadge from '../../components/common/StatusBadge'
import LoadingState from '../../components/feedback/LoadingState'
import EmptyState from '../../components/feedback/EmptyState'
import ErrorState from '../../components/feedback/ErrorState'
import { ASSET_TYPE_LABELS } from '../../constants/asset'
import { CUSTOMER_TYPE_LABELS } from '../../constants/customer'
import { getAssetsByCustomerId } from '../../services/assetService'
import { deactivateCustomer, getCustomerById } from '../../services/customerService'
import type { AssetResponse } from '../../types/asset'
import type { CustomerResponse } from '../../types/customer'
import { formatDateTime } from '../../utils/formatDateTime'
import { useAuth } from '../../auth/useAuth'
import { parseApiError } from '../../utils/formatApiError'

function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { hasRole } = useAuth()
  const canManageCustomer = hasRole('Agent', 'Manager')
  const [customer, setCustomer] = useState<CustomerResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [deactivating, setDeactivating] = useState(false)
  const [assets, setAssets] = useState<AssetResponse[]>([])
  const [assetsLoading, setAssetsLoading] = useState(true)
  const [assetsError, setAssetsError] = useState('')
  const navigate = useNavigate()

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

  const customerId = customer?.id

  useEffect(() => {
    if (!customerId) {
      return
    }

    async function load() {
      try {
        setAssets(await getAssetsByCustomerId(customerId!))
      } catch (caught) {
        const parsed = parseApiError(caught, 'Could not load this customer’s assets. Check that the customer service is running.')
        setAssetsError(parsed.message)
      } finally {
        setAssetsLoading(false)
      }
    }

    void load()
  }, [customerId])

  async function handleDeactivate() {
    if (!customer) {
      return
    }

    const confirmed = window.confirm(
      `Deactivate ${customer.name}? The record is kept, but the customer stops ` +
        'being active and their phone number is freed for someone else.',
    )

    if (!confirmed) {
      return
    }

    setActionError('')
    setDeactivating(true)

    try {
      setCustomer(await deactivateCustomer(customer.id))
    } catch (caught) {
      if (axios.isAxiosError(caught) && caught.response?.status === 404) {
        setNotFound(true)
      } else {
        const parsed = parseApiError(caught, 'Could not deactivate this customer. Check that the customer service is running.')
        setActionError(parsed.message)
      }
    } finally {
      setDeactivating(false)
    }
  }

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
          <div className="d-flex align-items-center gap-2">
            <StatusBadge status={customer.status} />
            {canManageCustomer && customer.status === 'ACTIVE' && (
              <Link className="btn btn-primary" to={`/customers/${customer.id}/edit`}>
                Edit
              </Link>
            )}
            {canManageCustomer && customer.status === 'ACTIVE' && (
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={handleDeactivate}
                disabled={deactivating}
              >
                {deactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            )}
          </div>
        )}
      </div>

      {actionError && (
        <p className="alert alert-danger" role="alert">
          {actionError}
        </p>
      )}

      <div className="card app-card">
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

      {customer && (
        <>
          <div className="page-head mt-4">
            <div>
              <h2 className="page-title">Assets</h2>
              <p className="page-sub">Equipment registered against this customer, newest first.</p>
            </div>
            {canManageCustomer && (
              <Link className="btn btn-primary" to="/assets/new">
                New asset
              </Link>
            )}
          </div>

          <div className="card app-card">
            {assetsLoading ? (
              <LoadingState message="Loading assets..." />
            ) : assetsError ? (
              <ErrorState message={assetsError} />
            ) : assets.length === 0 ? (
              <EmptyState
                title="No assets registered"
                message="Nothing has been registered against this customer yet."
                action={
                  canManageCustomer ? (
                    <Link className="btn btn-primary" to="/assets/new">
                      Register an asset
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <div className="table-responsive">
                <table className="table table-hover app-table align-middle mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Asset type</th>
                      <th scope="col">Model</th>
                      <th scope="col">Serial number</th>
                      <th scope="col">Installation date</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => (
                      <tr
                        key={asset.id}
                        className="row-link"
                        onClick={() => navigate(`/assets/${asset.id}`)}
                      >
                        <td>
                          <Link className="row-link-name" to={`/assets/${asset.id}`}>
                            {ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType}
                          </Link>
                        </td>
                        <td>{asset.model}</td>
                        <td className="text-nowrap">{asset.serialNumber}</td>
                        <td className="text-nowrap">{asset.installationDate}</td>
                        <td>
                          <StatusBadge status={asset.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

export default CustomerDetailPage
