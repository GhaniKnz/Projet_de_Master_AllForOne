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
    <div className="min-h-screen bg-bg text-txt">
      <Header />
      <div className="mt-2">
        <EnvBanner />
      </div>
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-32 pt-6">
        <Outlet />
      </main>
      <GameLauncher />
      <BottomNav />
    </div>
  )
}

