import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { getAllCustomers, createCustomer } from '../../services/customerService'
import type { CustomerResponse } from '../../types/customer'
import { useAuth } from '../../auth/useAuth'
import { parseApiError } from '../../utils/formatApiError'
import './CustomerListPage.css'

function getInitials(name: string): string {
  if (!name) return ''
  const words = name.split(/\s+/).filter(Boolean)
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase()
}

// Development fallback data matching the prototype when backend is offline
const DEV_FALLBACK_CUSTOMERS: CustomerResponse[] = [
  { id: '1', name: 'Bean', phone: '0787644996', address: '123 Park Ave', customerType: 'INDIVIDUAL', email: null, status: 'INACTIVE', createdAt: '', updatedAt: '' },
  { id: '2', name: 'Ben Dover', phone: '0797834567', address: '456 Hill Rd', customerType: 'INDIVIDUAL', email: null, status: 'ACTIVE', createdAt: '', updatedAt: '' },
  { id: '3', name: 'Staging Mismatch 1788095477', phone: '0768095477', address: '789 Lake Way', customerType: 'INDIVIDUAL', email: null, status: 'INACTIVE', createdAt: '', updatedAt: '' },
  { id: '4', name: 'Staging Job Smoke 1788095442', phone: '0778095442', address: '101 Pine St', customerType: 'INDIVIDUAL', email: null, status: 'INACTIVE', createdAt: '', updatedAt: '' },
  { id: '5', name: 'Hirusha', phone: '0762001635', address: '202 Corporate Blvd', customerType: 'BUSINESS', email: null, status: 'ACTIVE', createdAt: '', updatedAt: '' },
  { id: '6', name: 'ASSMS Asset Staging 20260828073805', phone: '+94762001631', address: '303 Oak St', customerType: 'INDIVIDUAL', email: null, status: 'INACTIVE', createdAt: '', updatedAt: '' },
  { id: '7', name: 'ASSMS Staging Smoke 20260827121742', phone: '+947720260827121742', address: '404 Elm St', customerType: 'INDIVIDUAL', email: null, status: 'INACTIVE', createdAt: '', updatedAt: '' },
]

function CustomerListPage() {
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  // New Customer Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newType, setNewType] = useState<'INDIVIDUAL' | 'BUSINESS'>('INDIVIDUAL')
  const [modalErrors, setModalErrors] = useState({ name: false, phone: false })
  const [savingCustomer, setSavingCustomer] = useState(false)

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const canRegisterCustomer = hasRole('Agent', 'Manager')

  function showToast(message: string) {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setToastMessage(message)
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null)
    }, 2200)
  }

  useEffect(() => {
    async function load() {
      try {
        const data = await getAllCustomers()
        setCustomers(data)
      } catch (caught) {
        const parsed = parseApiError(caught, 'Could not load customers. Check that the customer service is running.')
        setError(parsed.message)
        if (import.meta.env.DEV) {
          setCustomers(DEV_FALLBACK_CUSTOMERS)
        }
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  // Close modal on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && modalOpen) {
        setModalOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [modalOpen])

  function closeModal() {
    setModalOpen(false)
    setModalErrors({ name: false, phone: false })
  }

  async function handleSaveCustomer() {
    const trimmedName = newName.trim()
    const trimmedPhone = newPhone.trim()
    const isPhoneValid = /^[+\d][\d\s-]{6,}$/.test(trimmedPhone)
    const hasNameError = !trimmedName
    const hasPhoneError = !isPhoneValid

    setModalErrors({ name: hasNameError, phone: hasPhoneError })

    if (hasNameError || hasPhoneError) {
      showToast('Add a name and a valid phone number')
      return
    }

    setSavingCustomer(true)
    try {
      const created = await createCustomer({
        name: trimmedName,
        phone: trimmedPhone,
        address: newAddress.trim() || 'Not provided',
        customerType: newType,
        email: null,
      })
      setCustomers((prev) => [created, ...prev])
      setNewName('')
      setNewPhone('')
      setNewAddress('')
      setNewType('INDIVIDUAL')
      closeModal()
      showToast(`${trimmedName} added`)
    } catch (caught) {
      if (import.meta.env.DEV) {
        // In local development when backend is offline, update local state gracefully
        const fallbackCreated: CustomerResponse = {
          id: String(Date.now()),
          name: trimmedName,
          phone: trimmedPhone,
          address: newAddress.trim() || 'Not provided',
          customerType: newType,
          email: null,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setCustomers((prev) => [fallbackCreated, ...prev])
        setNewName('')
        setNewPhone('')
        setNewAddress('')
        setNewType('INDIVIDUAL')
        closeModal()
        showToast(`${trimmedName} added`)
      } else {
        const parsed = parseApiError(caught, 'Could not create customer.')
        showToast(parsed.message)
      }
    } finally {
      setSavingCustomer(false)
    }
  }

  // Calculate summary stats
  const totalCount = customers.length
  const activeCount = customers.filter((c) => c.status?.toUpperCase() === 'ACTIVE').length
  const inactiveCount = totalCount - activeCount
  const businessCount = customers.filter((c) => c.customerType?.toUpperCase() === 'BUSINESS').length
  const individualCount = totalCount - businessCount

  // Filtered customer list
  const filteredCustomers = customers.filter((c) => {
    const isBiz = c.customerType?.toUpperCase() === 'BUSINESS'
    const matchesType =
      typeFilter === 'All' ||
      (typeFilter === 'Business' && isBiz) ||
      (typeFilter === 'Individual' && !isBiz)

    const isActive = c.status?.toUpperCase() === 'ACTIVE'
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && isActive) ||
      (statusFilter === 'Inactive' && !isActive)

    const q = searchTerm.toLowerCase().trim()
    const matchesQuery =
      !q ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q))

    return matchesType && matchesStatus && matchesQuery
  })

  return (
    <div className="customer-list-container">
      <div className="head">
        <div>
          <h1>Customers</h1>
          <p>Everyone registered with the service, newest first.</p>
        </div>
        {canRegisterCustomer && (
          <button
            className="btn btn-create"
            id="openNew"
            type="button"
            onClick={() => setModalOpen(true)}
          >
            + New customer
          </button>
        )}
      </div>

      <section className="stats" id="stats" aria-label="Summary">
        <div className="stat">
          <span>Total customers</span>
          <b>{totalCount}</b>
          <small>Registered with the service</small>
        </div>
        <div className="stat">
          <span>Active</span>
          <b>{activeCount}</b>
          <small>Currently active</small>
        </div>
        <div className="stat">
          <span>Inactive</span>
          <b>{inactiveCount}</b>
          <small>Not active</small>
        </div>
        <div className="stat">
          <span>Businesses</span>
          <b>{businessCount}</b>
          <small>{individualCount} individual</small>
        </div>
      </section>

      <section className="panel">
        <div className="tools">
          <div className="search">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              className="field"
              id="q"
              type="search"
              placeholder="Search by name or phone"
              aria-label="Search customers"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="field"
            id="ft"
            aria-label="Filter by type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="All">All types</option>
            <option value="Individual">Individual</option>
            <option value="Business">Business</option>
          </select>

          <select
            className="field"
            id="fs"
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="tr th">
          <div>Name</div>
          <div>Phone</div>
          <div>Customer type</div>
          <div>Status</div>
        </div>

        <div id="list">
          {loading ? (
            <div className="empty">Loading customers...</div>
          ) : filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => {
              const isBiz = customer.customerType?.toUpperCase() === 'BUSINESS'
              const isActive = customer.status?.toUpperCase() === 'ACTIVE'
              const typeClass = isBiz ? 'business' : 'individual'
              const typeLabel = isBiz ? 'Business' : 'Individual'
              const statusLabel = isActive ? 'Active' : 'Inactive'

              return (
                <div
                  key={customer.id}
                  className="tr row-item"
                  onClick={() => navigate(`/customers/${customer.id}`)}
                >
                  <div className="person">
                    <div
                      className="av"
                      style={{
                        background: isBiz
                          ? 'linear-gradient(145deg, #5db8ff, #0b5aa6)'
                          : 'linear-gradient(145deg, #2cc487, #0f7a53)',
                      }}
                    >
                      {getInitials(customer.name)}
                    </div>
                    <b>{customer.name}</b>
                  </div>
                  <div className="phone" data-l="Phone">
                    {customer.phone}
                  </div>
                  <div data-l="Customer type">
                    <span className={`type t-${typeClass}`}>{typeLabel}</span>
                  </div>
                  <div data-l="Status">
                    <span className={`st ${isActive ? '' : 'in'}`}>{statusLabel}</span>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="empty">
              <b>No customers match your search</b>
              <br />
              {error ? error : 'Try a different name or clear the filters.'}
            </div>
          )}
        </div>

        <div className="foot" id="count" aria-live="polite">
          Showing {filteredCustomers.length} of {customers.length} customers
        </div>
      </section>

      {/* New Customer Modal */}
      <div
        className={`customer-modal ${modalOpen ? 'open' : ''}`}
        id="m"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mt"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal()
        }}
      >
        <div className="card">
          <h2 id="mt">New customer</h2>
          <p>Add someone to the service.</p>
          <label className="f">
            Name
            <input
              className={`field ${modalErrors.name ? 'bad' : ''}`}
              id="nn"
              placeholder="e.g. Hirusha Sipara"
              autoComplete="off"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                if (modalErrors.name) setModalErrors((prev) => ({ ...prev, name: false }))
              }}
            />
          </label>
          <label className="f">
            Phone
            <input
              className={`field ${modalErrors.phone ? 'bad' : ''}`}
              id="np"
              type="tel"
              placeholder="e.g. 0762001635"
              autoComplete="off"
              value={newPhone}
              onChange={(e) => {
                setNewPhone(e.target.value)
                if (modalErrors.phone) setModalErrors((prev) => ({ ...prev, phone: false }))
              }}
            />
          </label>
          <label className="f">
            Address
            <input
              className="field"
              id="na"
              placeholder="e.g. 123 Main St, Colombo"
              autoComplete="off"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
            />
          </label>
          <label className="f">
            Customer type
            <select
              className="field"
              id="nt"
              value={newType}
              onChange={(e) => setNewType(e.target.value as 'INDIVIDUAL' | 'BUSINESS')}
            >
              <option value="INDIVIDUAL">Individual</option>
              <option value="BUSINESS">Business</option>
            </select>
          </label>
          <div className="btns">
            <button
              type="button"
              className="ghost"
              id="cx"
              onClick={closeModal}
              disabled={savingCustomer}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn"
              id="sv"
              onClick={handleSaveCustomer}
              disabled={savingCustomer}
            >
              {savingCustomer ? 'Saving…' : 'Save customer'}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <div
        className={`customer-toast ${toastMessage ? 'show' : ''}`}
        id="toast"
        role="status"
      >
        {toastMessage}
      </div>
    </div>
  )
}

export default CustomerListPage
