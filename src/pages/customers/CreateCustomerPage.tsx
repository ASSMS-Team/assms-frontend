import { useState, useRef, type FormEvent, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

import { createCustomer } from '../../services/customerService'
import type { CustomerResponse, ValidationProblemDetails } from '../../types/customer'
import './CreateCustomerPage.css'

export default function CreateCustomerPage() {
  const navigate = useNavigate()

  // Form field state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [customerType, setCustomerType] = useState<'INDIVIDUAL' | 'BUSINESS'>('INDIVIDUAL')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')

  // Validation & status state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<CustomerResponse | null>(null)

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(message: string) {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setToastMessage(message)
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null)
    }, 2200)
  }

  // Live checklist evaluations
  const isNameValid = name.trim().length > 1
  const isPhoneValid = /^[+\d][\d\s-]{6,}$/.test(phone.trim())
  const isAddrValid = address.trim().length > 2
  const isEmailValid = email.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const isEmailProvidedAndValid = email.trim() !== '' && isEmailValid

  function clearFieldError(field: string) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  function handleNameChange(e: ChangeEvent<HTMLInputElement>) {
    setName(e.target.value)
    clearFieldError('name')
  }

  function handlePhoneChange(e: ChangeEvent<HTMLInputElement>) {
    setPhone(e.target.value)
    clearFieldError('phone')
  }

  function handleAddressChange(e: ChangeEvent<HTMLInputElement>) {
    setAddress(e.target.value)
    clearFieldError('address')
  }

  function handleEmailChange(e: ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value)
    clearFieldError('email')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const errors: Record<string, string> = {}
    if (!isNameValid) errors.name = 'Enter the customer’s name.'
    if (!isPhoneValid) errors.phone = 'Enter a valid phone number.'
    if (!isAddrValid) errors.address = 'Enter the customer’s address.'
    if (!isEmailValid) errors.email = 'Enter a valid email address, or leave it empty.'

    setFieldErrors(errors)
    setFormError(null)

    if (Object.keys(errors).length > 0) {
      showToast('Please fix the highlighted fields')
      // Focus first bad input
      const firstKey = Object.keys(errors)[0]
      const elementId = firstKey === 'address' ? 'addr' : firstKey
      document.getElementById(elementId)?.focus()
      return
    }

    setSubmitting(true)

    const request = {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      customerType,
      email: email.trim() ? email.trim() : null,
    }

    try {
      const response = await createCustomer(request)
      setCreated(response)
      showToast(`${response.name} registered`)
    } catch (caught) {
      if (axios.isAxiosError<ValidationProblemDetails>(caught)) {
        const problem = caught.response?.data
        if (problem?.errors) {
          const apiFieldErrors: Record<string, string> = {}
          Object.entries(problem.errors).forEach(([key, messages]) => {
            if (messages && messages.length > 0) {
              apiFieldErrors[key.toLowerCase()] = messages[0]
            }
          })
          setFieldErrors(apiFieldErrors)
          showToast('Please fix the highlighted fields')
        } else {
          const detail = [problem?.title, problem?.detail].filter(Boolean).join(' ') ||
            'Could not reach customer service. Please try again.'
          setFormError(detail)
          showToast(detail)
        }
      } else {
        const message = 'Something went wrong while creating the customer.'
        setFormError(message)
        showToast(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleRegisterAnother() {
    setName('')
    setPhone('')
    setAddress('')
    setEmail('')
    setCustomerType('INDIVIDUAL')
    setFieldErrors({})
    setFormError(null)
    setCreated(null)
    setTimeout(() => {
      document.getElementById('name')?.focus()
    }, 50)
  }

  return (
    <div className="create-customer-container">
      <Link className="back" to="/customers">
        ← Back to customers
      </Link>
      <h1>New customer</h1>
      <p className="sub">Register a customer with the service.</p>

      <div className="stage">
        <div className="layout">
          <div className="card">
            <div className="legend">
              Fields marked with <span className="star">*</span> are required.
            </div>

            {formError && (
              <div style={{ padding: '16px 28px 0' }}>
                <p className="alert alert-danger" role="alert" style={{ margin: 0 }}>
                  {formError}
                </p>
              </div>
            )}

            {!created ? (
              <form id="form" onSubmit={handleSubmit} noValidate>
                {/* Section 1: Customer Details */}
                <div className="sec">
                  <h2>Customer details</h2>
                  <p>Who are we registering?</p>
                  <div className="grid2">
                    <label className="f">
                      <span>
                        Name<b className="star" aria-hidden="true">*</b>
                      </span>
                      <input
                        className={`inp ${fieldErrors.name ? 'bad' : ''}`}
                        id="name"
                        name="name"
                        autoComplete="off"
                        aria-required="true"
                        placeholder="e.g. Hirusha Sipara"
                        value={name}
                        onChange={handleNameChange}
                      />
                      <em className="err">
                        {fieldErrors.name || 'Enter the customer’s name.'}
                      </em>
                    </label>

                    <label className="f">
                      <span>
                        Phone<b className="star" aria-hidden="true">*</b>
                      </span>
                      <input
                        className={`inp ${fieldErrors.phone ? 'bad' : ''}`}
                        id="phone"
                        name="phone"
                        type="tel"
                        autoComplete="off"
                        aria-required="true"
                        placeholder="e.g. 0762001635"
                        value={phone}
                        onChange={handlePhoneChange}
                      />
                      <em className="err">
                        {fieldErrors.phone || 'Enter a valid phone number.'}
                      </em>
                    </label>
                  </div>
                </div>

                {/* Section 2: Customer Type */}
                <div className="sec">
                  <h2>
                    Customer type<b className="star" aria-hidden="true"> *</b>
                  </h2>
                  <p>Is this a person or a company?</p>
                  <div className="types" role="radiogroup" aria-label="Customer type" aria-required="true">
                    <label className="type">
                      <input
                        type="radio"
                        name="type"
                        value="INDIVIDUAL"
                        checked={customerType === 'INDIVIDUAL'}
                        onChange={() => setCustomerType('INDIVIDUAL')}
                      />
                      <div>
                        <b>Individual</b>
                        <small>A person using the service for themselves.</small>
                      </div>
                    </label>
                    <label className="type">
                      <input
                        type="radio"
                        name="type"
                        value="BUSINESS"
                        checked={customerType === 'BUSINESS'}
                        onChange={() => setCustomerType('BUSINESS')}
                      />
                      <div>
                        <b>Business</b>
                        <small>A company or organisation.</small>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Section 3: Contact */}
                <div className="sec" style={{ borderBottom: 0 }}>
                  <h2>Contact</h2>
                  <p>Where can we reach and find them?</p>
                  <div className="grid2">
                    <label className="f" style={{ gridColumn: '1 / -1' }}>
                      <span>
                        Address<b className="star" aria-hidden="true">*</b>
                      </span>
                      <input
                        className={`inp ${fieldErrors.address ? 'bad' : ''}`}
                        id="addr"
                        name="address"
                        autoComplete="off"
                        aria-required="true"
                        placeholder="Street, city"
                        value={address}
                        onChange={handleAddressChange}
                      />
                      <em className="err">
                        {fieldErrors.address || 'Enter the customer’s address.'}
                      </em>
                    </label>

                    <label className="f" style={{ gridColumn: '1 / -1' }}>
                      <span>
                        Email
                        <i className="opt" style={{ fontStyle: 'normal' }}>
                          (optional)
                        </i>
                      </span>
                      <input
                        className={`inp ${fieldErrors.email ? 'bad' : ''}`}
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="off"
                        placeholder="name@company.com"
                        value={email}
                        onChange={handleEmailChange}
                      />
                      <em className="err">
                        {fieldErrors.email || 'Enter a valid email address, or leave it empty.'}
                      </em>
                    </label>
                  </div>
                </div>

                {/* Section 4: Actions */}
                <div className="actions">
                  <button
                    type="button"
                    className="ghost"
                    id="cancel"
                    onClick={() => navigate('/customers')}
                  >
                    Cancel
                  </button>
                  <button className="btn" type="submit" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create customer'}
                  </button>
                </div>
              </form>
            ) : (
              /* Success Confirmation Card */
              <div className="done show" id="done">
                <div className="tick">✓</div>
                <h2 id="dt">{created.name} registered</h2>
                <p>They’re now registered with the service.</p>
                <div className="btns">
                  <button
                    type="button"
                    className="btn"
                    id="again"
                    onClick={handleRegisterAnother}
                  >
                    Register another
                  </button>
                  <Link className="ghost" to="/customers">
                    View customers
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right Checklist Sidebar */}
          <aside className="card aside" aria-label="Checklist">
            <h3>Before you create</h3>
            <ul className="chk" id="chk">
              <li className={isNameValid ? 'ok' : ''} data-k="name">
                Name added
              </li>
              <li className={isPhoneValid ? 'ok' : ''} data-k="phone">
                Valid phone number
              </li>
              <li className={isAddrValid ? 'ok' : ''} data-k="addr">
                Address added
              </li>
              <li className="ok">Customer type chosen</li>
              <li
                className={`optl ${isEmailProvidedAndValid ? 'ok' : ''}`}
                data-k="email"
              >
                Email (optional)
              </li>
            </ul>
            <div className="tip">
              The phone number is how the team will reach the customer about their jobs.
            </div>
          </aside>
        </div>
      </div>

      {/* Floating Toast Notification */}
      <div
        className={`create-customer-toast ${toastMessage ? 'show' : ''}`}
        id="toast"
        role="status"
      >
        {toastMessage}
      </div>
    </div>
  )
}
