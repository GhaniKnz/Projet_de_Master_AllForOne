import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'
import GameLauncher from './GameLauncher'
import EnvBanner from './EnvBanner'

export default function MainLayout() {
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
