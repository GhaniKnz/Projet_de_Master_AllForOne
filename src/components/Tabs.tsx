import React from 'react'

type TabsProps = {
  items: string[]
  current: string
  onChange: (id: string) => void
  className?: string
}

export default function Tabs({ items, current, onChange, className = '' }: TabsProps) {
  return (
    <div className={`inline-flex items-center gap-1 rounded-full border border-border/70 bg-panel/60 p-1 text-sm font-medium text-muted shadow-soft ${className}`}>
      {items.map((item) => {
        const isActive = current === item
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={isActive ? 'page' : undefined}
            className={`rounded-full px-4 py-2 transition-all focus-ring ${
              isActive ? 'bg-surface shadow-soft text-primary' : 'hover:text-primary'
            }`}
          >
            {item}
          </button>
        )
      })}
    </div>
  )
}
