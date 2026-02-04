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
    <nav className="absolute bottom-3 left-3 right-3 z-50">
      <div className="max-w-md mx-auto">
        <div className="bg-surface dark:bg-panel backdrop-blur-xl flex items-center justify-around rounded-2xl border border-border/30 px-2 py-2 shadow-lg">
          {tabs.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                `group flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors touch-feedback ${
                  isActive ? 'text-primary' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 ${
                      isActive ? 'bg-primary/15 text-primary' : 'bg-transparent'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="truncate max-w-[48px]">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
