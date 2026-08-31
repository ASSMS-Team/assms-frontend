import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import axios from 'axios'

import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from '../../constants/customer'
import { createCustomer, updateCustomer } from '../../services/customerService'
import type {
  CreateCustomerRequest,
  CustomerResponse,
  ValidationProblemDetails,
} from '../../types/customer'

// The five editable fields. CreateCustomerRequest and UpdateCustomerRequest are
// the same shape today, so one piece of state serves both modes; the parameter
// type on each service function is what would break loudly if they diverge.
type CustomerFormValues = CreateCustomerRequest

// A discriminated union rather than a bag of optional props: "edit" cannot be
// asked for without the id, the values to start from, and somewhere to report
// a save or a customer that has been deleted since the form was loaded.
type CustomerFormProps =
  | { mode: 'create' }
  | {
      mode: 'edit'
      customerId: string
      initialValues: CustomerFormValues
      onSaved: (customer: CustomerResponse) => void
      onNotFound: () => void
    }

// customerType defaults to a real value rather than '' so the form state matches
// CustomerType exactly and no cast is needed at submit time.
const EMPTY_FORM: CustomerFormValues = {
  name: '',
  phone: '',
  address: '',
  customerType: CUSTOMER_TYPES[0],
  email: '',
}

function CustomerForm(props: CustomerFormProps) {
  // Read once, on the first render: the edit page only mounts the form after the
  // customer has loaded, so there is nothing to sync afterwards.
  const [values, setValues] = useState<CustomerFormValues>(
    props.mode === 'edit' ? props.initialValues : EMPTY_FORM,
  )
  // Keyed by field name, exactly as the API returns them - the server's JSON is
  // camelCased, so these keys line up with the input names without translation.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<CustomerResponse | null>(null)

  const isEdit = props.mode === 'edit'

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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
      // Blank means "not supplied". '' would fail the server's email rule.
      email: values.email?.trim() ? values.email.trim() : null,
    }

    try {
      if (props.mode === 'edit') {
        props.onSaved(await updateCustomer(props.customerId, request))
      } else {
        setCreated(await createCustomer(request))
        setValues(EMPTY_FORM)
      }
    } catch (error) {
      if (axios.isAxiosError<ValidationProblemDetails>(error)) {
        const problem = error.response?.data

        if (props.mode === 'edit' && error.response?.status === 404) {
          // The customer was deleted between loading the form and saving it.
          props.onNotFound()
        } else if (problem?.errors) {
          // Both the 400 and the duplicate-phone 409: the API keys the conflict
          // on "phone" so it lands on the input like any other field error.
          setFieldErrors(problem.errors)
        } else {
          // A 409 with no errors object is the other conflict - the customer is
          // no longer active - and belongs to the form as a whole, not a field.
          setFormError(
            [problem?.title, problem?.detail].filter(Boolean).join(' ') ||
              'Could not reach the customer service. Try again.',
          )
        }
      } else {
        setFormError(
          isEdit
            ? 'Something went wrong while saving the customer.'
            : 'Something went wrong while creating the customer.',
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

      {created && (
        <p className="alert alert-success" role="status">
          Created {created.name} ({created.id}).
        </p>
      )}

      <div className="mb-3">
        <label className="form-label" htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          className={`form-control${fieldErrors.name ? ' is-invalid' : ''}`}
          type="text"
          maxLength={100}
          value={values.name}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.name)}
        />
        {errorsFor('name')}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="phone">Phone</label>
        <input
          id="phone"
          name="phone"
          className={`form-control${fieldErrors.phone ? ' is-invalid' : ''}`}
          type="tel"
          maxLength={20}
          value={values.phone}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.phone)}
        />
        {errorsFor('phone')}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="address">Address</label>
        <input
          id="address"
          name="address"
          className={`form-control${fieldErrors.address ? ' is-invalid' : ''}`}
          type="text"
          maxLength={255}
          value={values.address}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.address)}
        />
        {errorsFor('address')}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="customerType">Customer type</label>
        <select
          id="customerType"
          name="customerType"
          className={`form-select${fieldErrors.customerType ? ' is-invalid' : ''}`}
          value={values.customerType}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.customerType)}
        >
          {CUSTOMER_TYPES.map((customerType) => (
            <option key={customerType} value={customerType}>
              {CUSTOMER_TYPE_LABELS[customerType]}
            </option>
          ))}
        </select>
        {errorsFor('customerType')}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="email">Email (optional)</label>
        <input
          id="email"
          name="email"
          className={`form-control${fieldErrors.email ? ' is-invalid' : ''}`}
          type="email"
          maxLength={255}
          value={values.email ?? ''}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.email)}
        />
        {errorsFor('email')}
      </div>

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting
          ? isEdit
            ? 'Saving...'
            : 'Creating...'
          : isEdit
            ? 'Save changes'
            : 'Create customer'}
      </button>
    </form>
  )
}

export default CustomerForm
