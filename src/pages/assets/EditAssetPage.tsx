import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

import AssetForm from '../../components/forms/AssetForm'
import { getAssetById } from '../../services/assetService'
import { getCustomerById } from '../../services/customerService'
import type { AssetResponse } from '../../types/asset'
import type { CustomerResponse } from '../../types/customer'

function EditAssetPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [asset, setAsset] = useState<AssetResponse | null>(null)
  const [loading, setLoading] = useState(true)
  // Kept separate from `error` for the same reason as on the detail page: a 404
  // is an expected answer to a valid question, not a failure. It is also set
  // from the form, for an asset deleted between loading and saving.
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  // The owner, fetched only so the form can name it. Deliberately without a
  // loading or error state of its own: the field is informational, the id is
  // already on hand as the fallback, and a customer that will not load is no
  // reason to hold up an edit that does not touch the owner anyway.
  const [owner, setOwner] = useState<CustomerResponse | null>(null)

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

  // Runs once the asset is known rather than on mount: the owner's id comes
  // from the asset, so there is nothing to ask for until it has loaded.
  const ownerId = asset?.customerId

  useEffect(() => {
    if (!ownerId) {
      return
    }

    async function load() {
      try {
        setOwner(await getCustomerById(ownerId!))
      } catch {
        // Nothing to report: the form shows the owner's id instead.
        setOwner(null)
      }
    }

    void load()
  }, [ownerId])

  return (
    <>
      <div className="page-head">
        <div>
          <Link className="back-link" to={id ? `/assets/${id}` : '/customers'}>
            &larr; Back to asset
          </Link>
          <h1 className="page-title">{asset ? `Edit ${asset.model}` : 'Edit asset'}</h1>
          <p className="page-sub">
            Asset type, model, serial number, installation date, location and notes.
            The id and the owning customer do not change.
          </p>
        </div>
      </div>

      <div className="card app-card app-card-padded form-column">
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
            <AssetForm
              mode="edit"
              assetId={asset.id}
              // Null until the owner has loaded, and if it never does - the
              // form falls back to the id it already has.
              customerName={owner ? owner.name : null}
              // The six editable fields, plus the owner the form shows read-only.
              // The timestamps stay with the server, and the id travels in the URL.
              initialValues={{
                customerId: asset.customerId,
                assetType: asset.assetType,
                model: asset.model,
                serialNumber: asset.serialNumber,
                installationDate: asset.installationDate,
                location: asset.location,
                notes: asset.notes,
              }}
              // The detail page showing the new values is the confirmation, so
              // there is no success message to leave behind here.
              onSaved={(saved) => navigate(`/assets/${saved.id}`)}
              onNotFound={() => setNotFound(true)}
            />
          )
        )}
      </div>
    </>
  )
}

export default EditAssetPage
