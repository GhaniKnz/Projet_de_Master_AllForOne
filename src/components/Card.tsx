import React from 'react'

type CardProps = {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  role?: 'button' | 'region'
  ariaLabel?: string
}

export default function Card({ children, onClick, className = '', role, ariaLabel }: CardProps) {
  const interactive = typeof onClick === 'function'
  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-border/60 rounded-2xl p-4 shadow-soft transition-transform duration-150 ${
        interactive ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0' : ''
      } ${className}`}
      role={role}
      aria-label={ariaLabel}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(event) => {
        if (!interactive || !onClick) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
    >
      {children}
    </div>
  )
}
