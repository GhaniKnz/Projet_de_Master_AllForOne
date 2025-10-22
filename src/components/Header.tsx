import React from 'react'
import { Bell, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const TITLES: Array<{ match: (path: string) => boolean; eyebrow: string; title: string }> = [
  { match: (path) => path.startsWith('/home'), eyebrow: 'AllForOne', title: 'Fil d’actualité' },
  { match: (path) => path.startsWith('/channels'), eyebrow: 'Discussions', title: 'Messages et salons' },
  { match: (path) => path.startsWith('/messages'), eyebrow: 'Conversation', title: 'Échanges en direct' },
  { match: (path) => path.startsWith('/games'), eyebrow: 'Jouer ensemble', title: 'Catalogue de jeux' },
  { match: (path) => path.startsWith('/profile'), eyebrow: 'Mon espace', title: 'Profil & progression' },
  { match: (path) => path.startsWith('/boutique'), eyebrow: 'Boutique', title: 'Récompenses et items' },
  { match: (path) => path.startsWith('/notifications'), eyebrow: 'Centre d’alertes', title: 'Notifications' },
  { match: (path) => path.startsWith('/recherche'), eyebrow: 'Explorer', title: 'Recherche' }
]

export default function Header() {
  const location = useLocation()
  const current = TITLES.find((item) => item.match(location.pathname)) ?? TITLES[0]

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted">{current.eyebrow}</p>
          <h1 className="text-xl font-semibold text-txt">{current.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/recherche"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/80 bg-surface/80 text-muted transition hover:text-primary focus-ring"
            aria-label="Rechercher"
          >
            <Search className="h-4 w-4" />
          </Link>
          <Link
            to="/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-border/80 bg-surface/80 text-muted transition hover:text-primary focus-ring"
            aria-label="Ouvrir les notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
              3
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}
