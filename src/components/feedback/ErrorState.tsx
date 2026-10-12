import type { ReactNode } from 'react'

interface ErrorStateProps {
  title?: string
  message: string
  action?: ReactNode
  className?: string
}

export default function ErrorState({
  title,
  message,
  action,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`state-block ${className}`}>
      {title && <p className="state-title text-danger mb-2">{title}</p>}
      <div className="alert alert-danger mb-0 text-start" role="alert">
        {message}
      </div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
