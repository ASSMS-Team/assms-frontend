import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import axios from 'axios'

import { ASSET_TYPE_LABELS } from '../../constants/asset'
import {
  PRIORITIES,
  PRIORITY_LABELS,
  REGIONS,
  REGION_LABELS,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
} from '../../constants/job'
import { getAssetsByCustomerId } from '../../services/assetService'
import { getAllCustomers } from '../../services/customerService'
import { createJob } from '../../services/jobService'
import type { AssetResponse } from '../../types/asset'
import type {
  CustomerResponse,
  ValidationProblemDetails,
} from '../../types/customer'
import type { CreateJobRequest, JobResponse, Region } from '../../types/job'

// The six fields the create request carries, except that region can be blank
// while the Agent has not picked one. The other two unions default to a real
// value, so only this one needs widening - see EMPTY_FORM.
type JobFormValues = Omit<CreateJobRequest, 'region'> & { region: Region | '' }

// serviceCategory and priority default to real values so the form state matches
// their unions and no cast is needed for them at submit time. customerId and
// assetId cannot - neither list is known until it loads - and region will not:
// there is no province that is a safe guess, so it carries a placeholder option
// and the server reports it if the Agent skips it.
const EMPTY_FORM: JobFormValues = {
  customerId: '',
  assetId: '',
  serviceCategory: SERVICE_CATEGORIES[0],
  problemDescription: '',
  // MEDIUM rather than PRIORITIES[0]. Priority is a triage field, and
  // defaulting it to the lowest value would quietly under-prioritise every job
  // an Agent did not think to change.
  priority: 'MEDIUM',
  region: '',
}

const ACTIVE = 'ACTIVE'

function JobForm() {
  const [values, setValues] = useState<JobFormValues>(EMPTY_FORM)
  // Keyed by field name, exactly as the API returns them - the server's JSON is
  // camelCased, so these keys line up with the input names without translation.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<JobResponse | null>(null)

  // Loading the customers is its own concern, with its own loading and error
  // state: it is a separate request that can fail on its own, and only the
  // first dropdown depends on it.
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [customersLoading, setCustomersLoading] = useState(true)
  const [customersError, setCustomersError] = useState<string | null>(null)

  // And the assets are a third, refetched every time the customer changes.
  const [assets, setAssets] = useState<AssetResponse[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [assetsError, setAssetsError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        // Only active customers: the job service refuses a job against an
        // inactive one, so offering them would be offering a guaranteed 409.
        setCustomers(await getAllCustomers(ACTIVE))
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

  const selectedCustomerId = values.customerId

  useEffect(() => {
    // Nothing to fetch until a customer is picked. Clearing the previous
    // customer's assets is not done here: that belongs to the event that
    // invalidated them, so it lives in clearAssetState below.
    if (!selectedCustomerId) {
      return
    }

    // Guards against the Agent changing customer while a fetch is in flight:
    // without it a slow response for the previous customer could land after the
    // new one's and fill the dropdown with the wrong equipment.
    let cancelled = false

    async function load() {
      try {
        const owned = await getAssetsByCustomerId(selectedCustomerId)

        if (cancelled) {
          return
        }

        // Filtered here rather than asked for: the endpoint returns the
        // customer's whole equipment history, deactivated units included, and
        // the job service refuses a job against an inactive asset.
        setAssets(owned.filter((asset) => asset.status === ACTIVE))
      } catch {
        if (cancelled) {
          return
        }

        setAssets([])
        setAssetsError(
          'Could not load this customer’s assets. Check that the customer service is running.',
        )
      } finally {
        if (!cancelled) {
          setAssetsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [selectedCustomerId])

  // No active customer means no valid value for a required field, so there is
  // nothing submittable here - said outright rather than left as an empty
  // dropdown the Agent would keep clicking at.
  const noActiveCustomers =
    !customersLoading && customersError === null && customers.length === 0

  // The same for the customer that has been picked: every one of their units is
  // deactivated, so no job can be raised against any of them.
  const noActiveAssets =
    selectedCustomerId !== '' &&
    !assetsLoading &&
    assetsError === null &&
    assets.length === 0

  const disabled =
    submitting ||
    customersLoading ||
    customersError !== null ||
    noActiveCustomers ||
    noActiveAssets

  // Until a customer is chosen there is nothing to choose from, so the select
  // is closed rather than shown empty.
  const assetSelectDisabled =
    submitting ||
    selectedCustomerId === '' ||
    assetsLoading ||
    assetsError !== null ||
    noActiveAssets

  function assetPlaceholder() {
    if (!selectedCustomerId) {
      return 'Select a customer first'
    }

    if (assetsLoading) {
      return 'Loading assets...'
    }

    if (noActiveAssets) {
      return 'No active assets'
    }

    return 'Select an asset'
  }

  // Drops the assets belonging to whichever customer was selected before, and
  // says whether a fetch for a new one is now on its way. Called from the events
  // that invalidate the list rather than from the effect that fills it: setting
  // state inside an effect body is what causes the cascading renders the React
  // guidance warns about, and the event already knows everything needed.
  function clearAssetState(nextCustomerId: string) {
    setAssets([])
    setAssetsError(null)
    // True the moment the customer changes, so the select reads "Loading
    // assets..." from the same render rather than flashing "No active assets"
    // for one frame before the request has even started.
    setAssetsLoading(nextCustomerId !== '')
  }

  function handleChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = event.target

    if (name === 'customerId') {
      // Changing the customer invalidates the asset: the one that was picked
      // belongs to the customer that was picked, and carrying it over would
      // submit someone else's equipment.
      setValues((current) => ({ ...current, customerId: value, assetId: '' }))
      clearAssetState(value)

      return
    }

    setValues((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setFieldErrors({})
    setFormError(null)
    setCreated(null)
    setSubmitting(true)

    try {
      const job = await createJob({
        ...values,
        // Cast because region can still be '' here. That is deliberate: a blank
        // is sent and the server reports it keyed on "region", exactly as it
        // reports every other missing field, rather than the form inventing a
        // second validation message of its own.
        region: values.region as Region,
      })

      setCreated(job)
      setValues(EMPTY_FORM)
      // The reset clears the customer, so the assets it owned are stale too -
      // without this they would sit behind the now-disabled select.
      clearAssetState('')
    } catch (error) {
      if (axios.isAxiosError<ValidationProblemDetails>(error)) {
        const problem = error.response?.data

        if (problem?.errors) {
          // Every expected refusal lands here: the 400 on any field, and the
          // 409s keyed on assetId for an asset that is missing, owned by
          // someone else or inactive, and on customerId for a customer that is
          // no longer active. The API keys all of them, so one branch renders
          // them all.
          setFieldErrors(problem.errors)
        } else {
          // No errors object means a plain ProblemDetails - in practice the 503
          // raised when the job service could not reach the customer service to
          // validate. Nothing about the request was found to be wrong, so the
          // message says to try again rather than to change something.
          setFormError(
            [problem?.title, problem?.detail].filter(Boolean).join(' ') ||
              'Could not reach the job service. Try again.',
          )
        }
      } else {
        setFormError('Something went wrong while creating the job.')
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

      {assetsError && (
        <p className="alert alert-danger" role="alert">
          {assetsError}
        </p>
      )}

      {noActiveCustomers && (
        <p className="alert alert-warning" role="alert">
          There are no active customers. A job has to be raised for one, so
          register a customer before raising jobs.
        </p>
      )}

      {noActiveAssets && (
        <p className="alert alert-warning" role="alert">
          This customer has no active assets. A job is raised against a unit, so
          register one for them - or pick a different customer - before
          continuing.
        </p>
      )}

      {created && (
        // The reference is the point of the whole form: it is what the Agent
        // reads back to the customer, so it is the largest thing on the page
        // once the job exists.
        <div className="alert alert-success" role="status">
          <p className="mb-1">Job created. Give the customer this reference:</p>
          <p className="display-6 font-monospace mb-2">{created.jobReference}</p>
          <p className="mb-0">
            {SERVICE_CATEGORY_LABELS[created.serviceCategory]} &middot;{' '}
            {PRIORITY_LABELS[created.priority]} priority &middot;{' '}
            {REGION_LABELS[created.region]}
          </p>
        </div>
      )}

      <div className="mb-3">
        <label className="form-label" htmlFor="customerId">Customer</label>
        <select
          id="customerId"
          name="customerId"
          className={`form-select${fieldErrors.customerId ? ' is-invalid' : ''}`}
          value={values.customerId}
          onChange={handleChange}
          disabled={submitting || customersLoading || customersError !== null || noActiveCustomers}
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
        <label className="form-label" htmlFor="assetId">Asset</label>
        <select
          id="assetId"
          name="assetId"
          className={`form-select${fieldErrors.assetId ? ' is-invalid' : ''}`}
          value={values.assetId}
          onChange={handleChange}
          disabled={assetSelectDisabled}
          aria-invalid={Boolean(fieldErrors.assetId)}
        >
          <option value="">{assetPlaceholder()}</option>
          {/* Serial as well as type and model: a customer can own two of the
              same unit, and the serial is what tells them apart. */}
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {ASSET_TYPE_LABELS[asset.assetType]} - {asset.model} ({asset.serialNumber})
            </option>
          ))}
        </select>
        {errorsFor('assetId')}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="serviceCategory">Service category</label>
        <select
          id="serviceCategory"
          name="serviceCategory"
          className={`form-select${fieldErrors.serviceCategory ? ' is-invalid' : ''}`}
          value={values.serviceCategory}
          onChange={handleChange}
          disabled={submitting}
          aria-invalid={Boolean(fieldErrors.serviceCategory)}
        >
          {SERVICE_CATEGORIES.map((serviceCategory) => (
            <option key={serviceCategory} value={serviceCategory}>
              {SERVICE_CATEGORY_LABELS[serviceCategory]}
            </option>
          ))}
        </select>
        {errorsFor('serviceCategory')}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="priority">Priority</label>
        <select
          id="priority"
          name="priority"
          className={`form-select${fieldErrors.priority ? ' is-invalid' : ''}`}
          value={values.priority}
          onChange={handleChange}
          disabled={submitting}
          aria-invalid={Boolean(fieldErrors.priority)}
        >
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
        {errorsFor('priority')}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="region">Region</label>
        <select
          id="region"
          name="region"
          className={`form-select${fieldErrors.region ? ' is-invalid' : ''}`}
          value={values.region}
          onChange={handleChange}
          disabled={submitting}
          aria-invalid={Boolean(fieldErrors.region)}
        >
          <option value="">Select a province</option>
          {REGIONS.map((region) => (
            <option key={region} value={region}>
              {REGION_LABELS[region]}
            </option>
          ))}
        </select>
        <p className="form-text mb-0">
          The province the work is in. Dispatch uses it to find a technician who
          covers the area.
        </p>
        {errorsFor('region')}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="problemDescription">Problem description</label>
        <textarea
          id="problemDescription"
          name="problemDescription"
          className={`form-control${fieldErrors.problemDescription ? ' is-invalid' : ''}`}
          rows={4}
          maxLength={1000}
          value={values.problemDescription}
          onChange={handleChange}
          disabled={submitting}
          aria-invalid={Boolean(fieldErrors.problemDescription)}
        />
        {errorsFor('problemDescription')}
      </div>

      <button type="submit" className="btn btn-primary" disabled={disabled}>
        {submitting ? 'Creating...' : 'Create job'}
      </button>
    </form>
  )
}

export default JobForm
