interface LoadingStateProps {
  message?: string
  className?: string
}

export default function LoadingState({ message = 'Loading...', className = '' }: LoadingStateProps) {
  return (
    <div className={`state-block ${className}`} role="status" aria-live="polite">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="state-text">{message}</p>
    </div>
  )
}
