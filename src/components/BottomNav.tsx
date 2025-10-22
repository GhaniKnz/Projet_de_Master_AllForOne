import React from 'react'
import { NavLink } from 'react-router-dom'
import { MessageCircle, Users, Gamepad2, Home, ShoppingBag } from 'lucide-react'

type TabConfig = {
  to: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

const tabs: TabConfig[] = [
  { to: '/home', label: 'Accueil', Icon: Home },
  { to: '/channels', label: 'Chat', Icon: MessageCircle },
  { to: '/games', label: 'Jeux', Icon: Gamepad2 },
  { to: '/boutique', label: 'Boutique', Icon: ShoppingBag },
  { to: '/profile', label: 'Profil', Icon: Users }
]

export default function BottomNav() {

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-4 flex justify-center px-4 sm:px-6 lg:px-0">
      <div className="pointer-events-auto w-full max-w-xl">
        <div className="glass-surface relative flex items-center justify-between rounded-3xl border border-white/60 px-3 py-2 shadow-soft sm:px-6 sm:py-3">
          {tabs.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                `group flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200 ${
                      isActive ? 'bg-primary/10 text-primary shadow-card' : 'bg-transparent'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
