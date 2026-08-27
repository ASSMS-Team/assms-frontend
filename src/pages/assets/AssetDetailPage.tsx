import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'

import { ASSET_TYPE_LABELS } from '../../constants/asset'
import { getAssetById } from '../../services/assetService'
import type { AssetResponse } from '../../types/asset'
import { formatDateTime } from '../../utils/formatDateTime'

function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [asset, setAsset] = useState<AssetResponse | null>(null)
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
        setAsset(await getAssetById(id))
      } catch (caught) {
        if (axios.isAxiosError(caught) && caught.response?.status === 404) {
          setNotFound(true)
        } else {
          setError('Could not load this asset. Check that the customer service is running.')
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
          {/* Back to the owner once it is known, since that is where this page
              is reached from; the customer list is the fallback until then. */}
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
      </div>

      <div className="card app-card">
        {loading ? (
          <div className="state-block">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="state-text">Loading asset...</p>
          </div>
        ) : notFound ? (
          <div className="state-block">
            <div className="empty-mark">?</div>
            <p className="state-title">Asset not found</p>
            <p className="state-text">
              No asset is registered with the id <code>{id}</code>.
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
                {/* Shown as the API sends it. Running 'YYYY-MM-DD' through a
                    Date would read it as UTC midnight and could render the day
                    before in a western timezone - a day with no time of day has
                    nothing to convert. */}
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
                  {/* The response carries the owner's id, so the link needs no
                      second request to build. */}
                  <Link to={`/customers/${asset.customerId}`}>View owning customer</Link>
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
