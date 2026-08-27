import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import axios from 'axios'

import { ASSET_TYPES, ASSET_TYPE_LABELS } from '../../constants/asset'
import { createAsset } from '../../services/assetService'
import { getAllCustomers } from '../../services/customerService'
import type { AssetResponse, CreateAssetRequest } from '../../types/asset'
import type {
  CustomerResponse,
  ValidationProblemDetails,
} from '../../types/customer'

// The seven editable fields - exactly the create request, since the server owns
// the id and both timestamps.
type AssetFormValues = CreateAssetRequest

// assetType defaults to a real value rather than '' so the form state matches
// AssetType exactly and no cast is needed at submit time. customerId cannot do
// the same - the list is not known until it loads - so it starts blank and the
// select carries a placeholder option.
const EMPTY_FORM: AssetFormValues = {
  customerId: '',
  assetType: ASSET_TYPES[0],
  model: '',
  serialNumber: '',
  installationDate: '',
  location: '',
  notes: '',
}

function AssetForm() {
  const [values, setValues] = useState<AssetFormValues>(EMPTY_FORM)
  // Keyed by field name, exactly as the API returns them - the server's JSON is
  // camelCased, so these keys line up with the input names without translation.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<AssetResponse | null>(null)

  // Loading the customers is its own concern, with its own loading and error
  // state: it is a second request that can fail on its own, and the dropdown is
  // the only part of the form that depends on it.
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [customersLoading, setCustomersLoading] = useState(true)
  const [customersError, setCustomersError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        // Only active customers: the server refuses an asset against an
        // inactive one, so offering them would be offering a guaranteed 409.
        setCustomers(await getAllCustomers('ACTIVE'))
      } catch {
        setCustomersError(
          'Could not load customers. Check that the customer service is running.',
        )
      } finally {
        setCustomersLoading(false)
      }
    }

    void load()
  }, [])

  // No active customer means no valid value for a required field, so there is
  // nothing submittable here - said outright rather than left as an empty
  // dropdown the Agent would keep clicking at.
  const noActiveCustomers =
    !customersLoading && customersError === null && customers.length === 0

  const disabled =
    submitting || customersLoading || customersError !== null || noActiveCustomers

  function handleChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = event.target

    setValues((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setFieldErrors({})
    setFormError(null)
    setCreated(null)
    setSubmitting(true)

    const request = {
      ...values,
      // Blank means "not supplied", stored as NULL rather than ''.
      notes: values.notes?.trim() ? values.notes.trim() : null,
      // Same rule, for a different reason: '' is not a date the server can
      // parse, and sending it costs every other field its error message.
      installationDate: values.installationDate || null,
    }

    try {
      setCreated(await createAsset(request))
      setValues(EMPTY_FORM)
    } catch (error) {
      if (axios.isAxiosError<ValidationProblemDetails>(error)) {
        const problem = error.response?.data

        if (problem?.errors) {
          // Every expected failure lands here: the 400 on any field, the 409
          // keyed on serialNumber for a duplicate, and the 409 keyed on
          // customerId for a customer that is missing or no longer active.
          // The API keys all three, so one branch renders all three.
          setFieldErrors(problem.errors)
        } else {
          setFormError(
            [problem?.title, problem?.detail].filter(Boolean).join(' ') ||
              'Could not reach the customer service. Try again.',
          )
        }
      } else {
        setFormError('Something went wrong while creating the asset.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function errorsFor(field: string) {
    const messages = fieldErrors[field]

    if (!messages?.length) {
      return null
    }

    return (
      <ul className="invalid-feedback list-unstyled mb-0">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && (
        <p className="alert alert-danger" role="alert">
          {formError}
        </p>
      )}

      {customersError && (
        <p className="alert alert-danger" role="alert">
          {customersError}
        </p>
      )}

      {noActiveCustomers && (
        <p className="alert alert-warning" role="alert">
          There are no active customers. An asset has to belong to one, so
          register a customer before adding assets.
        </p>
      )}

      {created && (
        <p className="alert alert-success" role="status">
          Created {created.model} ({created.serialNumber}).
        </p>
      )}

      <div className="mb-3">
        <label className="form-label" htmlFor="customerId">Customer</label>
        <select
          id="customerId"
          name="customerId"
          className={`form-select${fieldErrors.customerId ? ' is-invalid' : ''}`}
          value={values.customerId}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={Boolean(fieldErrors.customerId)}
        >
          <option value="">
            {customersLoading ? 'Loading customers...' : 'Select a customer'}
          </option>
          {/* Phone as well as name: two customers can share a name, and the
              phone is what tells them apart at a glance. */}
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} - {customer.phone}
            </option>
          ))}
        </select>
        {errorsFor('customerId')}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="assetType">Asset type</label>
        <select
          id="assetType"
          name="assetType"
          className={`form-select${fieldErrors.assetType ? ' is-invalid' : ''}`}
          value={values.assetType}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.assetType)}
        >
          {ASSET_TYPES.map((assetType) => (
            <option key={assetType} value={assetType}>
              {ASSET_TYPE_LABELS[assetType]}
            </option>
          ))}
        </select>
        {errorsFor('assetType')}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="model">Model</label>
        <input
          id="model"
          name="model"
          className={`form-control${fieldErrors.model ? ' is-invalid' : ''}`}
          type="text"
          maxLength={100}
          value={values.model}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.model)}
        />
        {errorsFor('model')}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="serialNumber">Serial number</label>
        <input
          id="serialNumber"
          name="serialNumber"
          className={`form-control${fieldErrors.serialNumber ? ' is-invalid' : ''}`}
          type="text"
          maxLength={100}
          value={values.serialNumber}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.serialNumber)}
        />
        {errorsFor('serialNumber')}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="installationDate">Installation date</label>
        <input
          id="installationDate"
          name="installationDate"
          className={`form-control${fieldErrors.installationDate ? ' is-invalid' : ''}`}
          type="date"
          value={values.installationDate ?? ''}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.installationDate)}
        />
        {errorsFor('installationDate')}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="location">Location</label>
        <input
          id="location"
          name="location"
          className={`form-control${fieldErrors.location ? ' is-invalid' : ''}`}
          type="text"
          maxLength={255}
          value={values.location}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.location)}
        />
        {errorsFor('location')}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="notes">Notes (optional)</label>
        <textarea
          id="notes"
          name="notes"
          className={`form-control${fieldErrors.notes ? ' is-invalid' : ''}`}
          rows={3}
          maxLength={1000}
          value={values.notes ?? ''}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.notes)}
        />
        {errorsFor('notes')}
      </div>

      <button type="submit" className="btn btn-primary" disabled={disabled}>
        {submitting ? 'Creating...' : 'Create asset'}
      </button>
    </form>
  )
}

export default AssetForm
