import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Settings2 } from 'lucide-react'

type TopbarProps = {
  title?: string
  subtitle?: string
  back?: boolean
  right?: React.ReactNode
}

export default function Topbar({ title, subtitle, back, right }: TopbarProps) {
  const navigate = useNavigate()

  return (
    <div className="sticky top-0 z-30 border-b border-border/60 bg-bg/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {back ? (
            <button
              onClick={() => navigate(-1)}
              aria-label="Revenir en arrière"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-surface text-muted transition hover:text-primary focus-ring"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted">
              {subtitle ?? 'AllForOne'}
            </p>
            <h2 className="text-lg font-semibold text-txt">{title ?? 'AllForOne'}</h2>
          </div>
        </div>
        {right ?? (
          <div className="flex items-center gap-2 text-muted">
            <button
              aria-label="Notifications"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-surface/80 transition hover:text-primary focus-ring"
            >
              <Bell className="h-4 w-4" />
            </button>
            <button
              aria-label="Paramètres"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-surface/80 transition hover:text-primary focus-ring"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
