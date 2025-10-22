import React from 'react'
import { Search, Users, Hash } from 'lucide-react'
import Card from '../components/Card'

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          placeholder="Rechercher un joueur, un salon ou un jeu"
          className="w-full rounded-2xl border border-border/60 bg-surface py-3 pl-11 pr-4 text-sm text-txt placeholder:text-muted focus:border-primary focus:outline-none"
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Suggestions</h2>
        <Card className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-txt">Retrouvez vos amis</p>
            <p className="text-xs text-muted">Synchronisez vos contacts pour voir qui joue sur AllForOne.</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Hash className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-txt">Salons populaires</p>
            <p className="text-xs text-muted">#uno-fr · #derocher-pro · #no-mercy</p>
          </div>
        </Card>
      </section>
    </div>
  )
}
