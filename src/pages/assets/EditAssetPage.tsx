import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

import AssetForm from '../../components/forms/AssetForm'
import LoadingState from '../../components/feedback/LoadingState'
import EmptyState from '../../components/feedback/EmptyState'
import ErrorState from '../../components/feedback/ErrorState'
import { getAssetById } from '../../services/assetService'
import { getCustomerById } from '../../services/customerService'
import type { AssetResponse } from '../../types/asset'
import type { CustomerResponse } from '../../types/customer'
import { parseApiError } from '../../utils/formatApiError'

function EditAssetPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [asset, setAsset] = useState<AssetResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
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
          const parsed = parseApiError(caught, 'Could not load this asset. Check that the customer service is running.')
          setError(parsed.message)
        }
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id])

  const ownerId = asset?.customerId

  useEffect(() => {
    if (!ownerId) {
      return
    }

    async function load() {
      try {
        setOwner(await getCustomerById(ownerId!))
      } catch {
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
            <AssetForm
              mode="edit"
              assetId={asset.id}
              customerName={owner ? owner.name : null}
              initialValues={{
                customerId: asset.customerId,
                assetType: asset.assetType,
                model: asset.model,
                serialNumber: asset.serialNumber,
                installationDate: asset.installationDate,
                location: asset.location,
                notes: asset.notes,
              }}
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
