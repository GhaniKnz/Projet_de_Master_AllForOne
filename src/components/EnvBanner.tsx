import React from 'react'
import { isBackendConfigured } from '../lib/api'

export default function EnvBanner() {
  const remote = isBackendConfigured()
  if (!remote) return null
  const base = (import.meta as any).env?.VITE_API_URL
  return (
    <div className="mx-auto w-full max-w-xl px-4">
      <div className="rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
        Connecté à l’API: {base}
      </div>
    </div>
  )
}

