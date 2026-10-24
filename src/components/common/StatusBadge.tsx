// Shared status badge component for consistent styling and high contrast across all role views.
function getStatusVariant(normalized: string): string {
  if (normalized === 'ACTIVE' || normalized === 'COMPLETED') {
    return 'bg-success'
  }
  if (normalized === 'ASSIGNED') {
    return 'bg-primary'
  }
  if (normalized === 'IN_PROGRESS' || normalized === 'IN PROGRESS') {
    return 'bg-warning text-dark'
  }
  if (normalized === 'CANCELLED' || normalized === 'FAILED') {
    return 'bg-danger'
  }
  if (normalized === 'CREATED' || normalized === 'UNASSIGNED') {
    return 'bg-info text-dark'
  }
  return 'bg-secondary'
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status ? status.toUpperCase() : ''
  const variant = getStatusVariant(normalized)

  return <span className={`badge rounded-pill ${variant}`}>{status}</span>
}

export default StatusBadge
