import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  message?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  title,
  message,
  icon = '0',
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`state-block ${className}`}>
      <div className="empty-mark" aria-hidden="true">{icon}</div>
      <p className="state-title">{title}</p>
      {message && <div className="state-text">{message}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
