import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/MainLayout'

const Splash = lazy(() => import('./routes/Splash'))
const Auth = lazy(() => import('./routes/Auth'))
const Home = lazy(() => import('./routes/Home'))
const Channels = lazy(() => import('./routes/Channels'))
const Games = lazy(() => import('./routes/Games'))
const Profile = lazy(() => import('./routes/Profile'))
const Messages = lazy(() => import('./routes/Messages'))
const Notifications = lazy(() => import('./routes/Notifications'))
const Boutique = lazy(() => import('./routes/Boutique'))
const Search = lazy(() => import('./routes/Search'))
const Settings = lazy(() => import('./routes/Settings'))

const UnoLobby = lazy(() => import('./games/uno/Lobby'))
const UnoGame = lazy(() => import('./games/uno/UI'))
const UnoResults = lazy(() => import('./games/uno/Results'))
const DerocherLobby = lazy(() => import('./games/derocher/Lobby'))
const DerocherBoard = lazy(() => import('./games/derocher/Board'))

export default function App() {
  return (
    <div className="min-h-screen bg-bg text-txt">
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted">Chargement…</div>}>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/auth" element={<Auth />} />

          <Route element={<MainLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/games" element={<Games />} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/messages/:id" element={<Messages />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/boutique" element={<Boutique />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/recherche" element={<Search />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="/uno/lobby" element={<UnoLobby />} />
          <Route path="/uno/game" element={<UnoGame />} />
          <Route path="/uno/results" element={<UnoResults />} />
          <Route path="/derocher/lobby" element={<DerocherLobby />} />
          <Route path="/derocher/game" element={<DerocherBoard />} />

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>
    </div>
  )
}
