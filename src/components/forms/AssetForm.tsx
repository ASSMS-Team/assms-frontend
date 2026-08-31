import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

import { ASSET_TYPES, ASSET_TYPE_LABELS } from '../../constants/asset'
import { createAsset, updateAsset } from '../../services/assetService'
import { getAllCustomers } from '../../services/customerService'
import type { AssetResponse, CreateAssetRequest } from '../../types/asset'
import type {
  CustomerResponse,
  ValidationProblemDetails,
} from '../../types/customer'

// The seven fields the create request carries. Edit works from the same shape
// even though UpdateAssetRequest has six: the owner is held so the form can
// show which customer the asset belongs to, and is dropped at submit time.
type AssetFormValues = CreateAssetRequest

// A discriminated union rather than a bag of optional props: "edit" cannot be
// asked for without the id, the values to start from, and somewhere to report
// a save or an asset that has been deleted since the form was loaded.
type AssetFormProps =
  | { mode: 'create' }
  | {
      mode: 'edit'
      assetId: string
      initialValues: AssetFormValues
      // The owner's name, for the read-only display. Null while the page is
      // still fetching it, or if that fetch failed - the form falls back to the
      // id, which it already holds, rather than showing nothing.
      customerName: string | null
      onSaved: (asset: AssetResponse) => void
      onNotFound: () => void
    }

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

function AssetForm(props: AssetFormProps) {
  const isEdit = props.mode === 'edit'

  // Read once, on the first render: the edit page only mounts the form after
  // the asset has loaded, so there is nothing to sync afterwards.
  const [values, setValues] = useState<AssetFormValues>(
    props.mode === 'edit' ? props.initialValues : EMPTY_FORM,
  )
  // Keyed by field name, exactly as the API returns them - the server's JSON is
  // camelCased, so these keys line up with the input names without translation.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<AssetResponse | null>(null)

  // Loading the customers is its own concern, with its own loading and error
  // state: it is a second request that can fail on its own, and the dropdown is
  // the only part of the form that depends on it. Edit mode has no dropdown, so
  // it never loads and starts out of the loading state rather than stuck in it.
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [customersLoading, setCustomersLoading] = useState(!isEdit)
  const [customersError, setCustomersError] = useState<string | null>(null)

  useEffect(() => {
    // An asset does not change hands, so edit mode offers no owner to pick and
    // has nothing to fetch.
    if (isEdit) {
      return
    }

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
  }, [isEdit])

  // No active customer means no valid value for a required field, so there is
  // nothing submittable here - said outright rather than left as an empty
  // dropdown the Agent would keep clicking at. Only ever true on create: an
  // asset being edited already has an owner, whatever that customer's status.
  const noActiveCustomers =
    !isEdit && !customersLoading && customersError === null && customers.length === 0

  const disabled = isEdit
    ? submitting
    : submitting || customersLoading || customersError !== null || noActiveCustomers

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
      if (props.mode === 'edit') {
        // Listed field by field rather than spread: customerId is not part of
        // the update body at all, and this is what keeps it out of the wire.
        props.onSaved(
          await updateAsset(props.assetId, {
            assetType: request.assetType,
            model: request.model,
            serialNumber: request.serialNumber,
            installationDate: request.installationDate,
            location: request.location,
            notes: request.notes,
          }),
        )
      } else {
        setCreated(await createAsset(request))
        setValues(EMPTY_FORM)
      }
    } catch (error) {
      if (axios.isAxiosError<ValidationProblemDetails>(error)) {
        const problem = error.response?.data

        if (props.mode === 'edit' && error.response?.status === 404) {
          // The asset was deleted between loading the form and saving it.
          props.onNotFound()
        } else if (problem?.errors) {
          // Every expected failure lands here: the 400 on any field, the 409
          // keyed on serialNumber for a duplicate, and - on create only - the
          // 409 keyed on customerId for a customer that is missing or no longer
          // active. The API keys all of them, so one branch renders them all.
          setFieldErrors(problem.errors)
        } else {
          setFormError(
            [problem?.title, problem?.detail].filter(Boolean).join(' ') ||
              'Could not reach the customer service. Try again.',
          )
        }
      } else {
        setFormError(
          isEdit
            ? 'Something went wrong while saving the asset.'
            : 'Something went wrong while creating the asset.',
        )
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

      {props.mode === 'edit' ? (
        // Read-only rather than hidden: the owner is what confirms this is the
        // right asset. A div, not a label - there is no control to label.
        <div className="mb-3">
          <div className="form-label">Customer</div>
          <p className="form-control-plaintext mb-0">
            {/* The name is what identifies the customer to an Agent. The id is
                the fallback, and only shows while the name is on its way or if
                it could not be fetched. */}
            {props.customerName ?? <code className="detail-id">{values.customerId}</code>}
          </p>
          <p className="form-text mb-0">
            An asset does not change hands, so its owner is not editable here.{' '}
            <Link to={`/customers/${values.customerId}`}>View owning customer</Link>
          </p>
        </div>
      ) : (
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
      )}

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
        {submitting
          ? isEdit
            ? 'Saving...'
            : 'Creating...'
          : isEdit
            ? 'Save changes'
            : 'Create asset'}
      </button>
    </form>
  )
}

export default AssetForm
