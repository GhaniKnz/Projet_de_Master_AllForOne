import React from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'
import GameLauncher from './GameLauncher'
import EnvBanner from './EnvBanner'
import { api, isApiError } from '../lib/api'
import { useAppStore } from '../store/app'

export default function MainLayout() {
  const navigate = useNavigate()
  const { user, setUser } = useAppStore((state) => ({
    user: state.user,
    setUser: state.setUser
  }))

  React.useEffect(() => {
    if (!api.isAuthenticated()) {
      if (user) setUser(null)
      return
    }
    if (user) return
    api
      .getCurrentProfile()
      .then((profile) => {
        if (profile) setUser(profile)
      })
      .catch((err) => {
        if (isApiError(err) && err.status === 401) {
          api.logout()
          setUser(null)
          navigate('/auth')
          return
        }
        if (isApiError(err) && (err.status === 0 || err.status >= 500)) {
          console.warn('API unreachable while fetching profile')
          return
        }
        console.warn('Unexpected profile error', err)
      })
  }, [user, setUser, navigate])

  return (
    <div className="h-screen bg-bg text-txt flex flex-col no-select overflow-hidden relative">
      <Header />
      <div className="px-4 py-1">
        <EnvBanner />
      </div>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-4 pb-20 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
      <GameLauncher />
      <BottomNav />
    </div>
  )
}

