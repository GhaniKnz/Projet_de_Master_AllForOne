import React from 'react'

type Action = {
  label: string
  onClick: () => void
  destructive?: boolean
}

type ActionSheetProps = {
  open: boolean
  onClose: () => void
  actions: Action[]
}

export default function ActionSheet({ open, onClose, actions }: ActionSheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/30 backdrop-blur-sm transition">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="safe-area relative w-full max-w-xl rounded-t-3xl border border-border/70 bg-surface p-4 shadow-soft">
        <ul className="space-y-2">
          {actions.map((action, index) => (
            <li key={index}>
              <button
                onClick={() => {
                  action.onClick()
                  onClose()
                }}
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition focus-ring ${
                  action.destructive
                    ? 'text-danger hover:bg-danger/10'
                    : 'text-txt hover:bg-primaryMuted/60'
                }`}
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-border/60 pt-3 text-right">
          <button onClick={onClose} className="text-sm font-medium text-muted hover:text-primary focus-ring">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
