import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'

import StatusBadge from '../../components/common/StatusBadge'
import LoadingState from '../../components/feedback/LoadingState'
import EmptyState from '../../components/feedback/EmptyState'
import ErrorState from '../../components/feedback/ErrorState'
import { ASSET_TYPE_LABELS } from '../../constants/asset'
import { deactivateAsset, getAssetById } from '../../services/assetService'
import type { AssetResponse } from '../../types/asset'
import { formatDateTime } from '../../utils/formatDateTime'
import { useAuth } from '../../auth/useAuth'
import { parseApiError } from '../../utils/formatApiError'

function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { hasRole } = useAuth()
  const canManageAsset = hasRole('Agent', 'Manager')
  const [asset, setAsset] = useState<AssetResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [deactivating, setDeactivating] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) {
        setNotFound(true)
        setLoading(false)
        return
      }

      try {
        setAsset(await getAssetById(id))
      } catch (caught) {
        if (axios.isAxiosError(caught) && caught.response?.status === 404) {
          setNotFound(true)
        } else {
          const parsed = parseApiError(caught, 'Could not load this asset. Check that the customer service is running.')
          setError(parsed.message)
        }
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id])

  async function handleDeactivate() {
    if (!asset) {
      return
    }

    const confirmed = window.confirm(
      `Deactivate ${asset.model} (${asset.serialNumber})? The record is kept, but ` +
        'the asset stops being active and can no longer be edited.',
    )

    if (!confirmed) {
      return
    }

    setActionError('')
    setDeactivating(true)

    try {
      setAsset(await deactivateAsset(asset.id))
    } catch (caught) {
      if (axios.isAxiosError(caught) && caught.response?.status === 404) {
        setNotFound(true)
      } else {
        const parsed = parseApiError(caught, 'Could not deactivate this asset. Check that the customer service is running.')
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
          <Link
            className="back-link"
            to={asset ? `/customers/${asset.customerId}` : '/customers'}
          >
            &larr; {asset ? 'Back to customer' : 'Back to customers'}
          </Link>
          <h1 className="page-title">
            {asset ? `${ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType} - ${asset.model}` : 'Asset'}
          </h1>
          {asset && <p className="page-sub">Registered {formatDateTime(asset.createdAt)}</p>}
        </div>
        {asset && (
          <div className="d-flex align-items-center gap-2">
            <StatusBadge status={asset.status} />
            {canManageAsset && asset.status === 'ACTIVE' && (
              <Link className="btn btn-primary" to={`/assets/${asset.id}/edit`}>
                Edit
              </Link>
            )}
            {canManageAsset && asset.status === 'ACTIVE' && (
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
          <LoadingState message="Loading asset..." />
        ) : notFound ? (
          <EmptyState
            icon="?"
            title="Asset not found"
            message={`No asset is registered with the id "${id}".`}
            action={
              <Link className="btn btn-primary" to="/customers">
                Back to customers
              </Link>
            }
          />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          asset && (
            <dl className="detail-grid mb-0">
              <div className="detail-row">
                <dt>Asset type</dt>
                <dd>{ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType}</dd>
              </div>
              <div className="detail-row">
                <dt>Model</dt>
                <dd>{asset.model}</dd>
              </div>
              <div className="detail-row">
                <dt>Serial number</dt>
                <dd>{asset.serialNumber}</dd>
              </div>
              <div className="detail-row">
                <dt>Installation date</dt>
                <dd>{asset.installationDate}</dd>
              </div>
              <div className="detail-row">
                <dt>Location</dt>
                <dd>{asset.location}</dd>
              </div>
              <div className="detail-row">
                <dt>Notes</dt>
                <dd>{asset.notes ?? <span className="text-muted">Not provided</span>}</dd>
              </div>
              <div className="detail-row">
                <dt>Customer</dt>
                <dd>
                  <Link to={`/customers/${asset.customerId}`}>View owning customer</Link>
                </dd>
              </div>
              <div className="detail-row">
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={asset.status} />
                </dd>
              </div>
              <div className="detail-row">
                <dt>Created</dt>
                <dd>{formatDateTime(asset.createdAt)}</dd>
              </div>
              <div className="detail-row">
                <dt>Last updated</dt>
                <dd>{formatDateTime(asset.updatedAt)}</dd>
              </div>
              <div className="detail-row">
                <dt>Id</dt>
                <dd>
                  <code className="detail-id">{asset.id}</code>
                </dd>
              </div>
            </dl>
          )
        )}
      </div>
    </>
  )
}

export default AssetDetailPage
