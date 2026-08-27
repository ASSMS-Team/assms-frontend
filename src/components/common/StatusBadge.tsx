// One place for the status-to-colour rule, so the list and the detail page
// cannot drift apart. Anything that is not ACTIVE renders grey - the database
// only allows ACTIVE and INACTIVE, but an unknown value should not go green.
function StatusBadge({ status }: { status: string }) {
  const variant = status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'

  return <span className={`badge rounded-pill ${variant}`}>{status}</span>
}

export default StatusBadge
