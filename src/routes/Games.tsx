import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Users, Clock, Sparkles, Star, StarOff, Search, Plus, Settings2, ShieldCheck } from 'lucide-react'
import Card from '../components/Card'
import Tabs from '../components/Tabs'
import { useGamesStore, GameId, SessionMode, SessionType, GameSession } from '../store/games'
import { api, isBackendConfigured, getCurrentUser } from '../lib/api'
import { useAppStore } from '../store/app'
import { buildSessionPlayer } from '../utils/sessionPlayer'

type CreationState = {
  title: string
  sessionType: SessionType
  mode: SessionMode
  allowBots: boolean
  allowStacking: boolean
  allowWildChallenge: boolean
  timerPerTurn: number
}

const DEFAULT_CATEGORY = 'all'

export default function Games() {
  const navigate = useNavigate()
  const user = useAppStore((state) => state.user)
  const {
    catalog,
    sessions,
    favorites,
    quickPlay,
    createSession,
    joinSession,
    markFavorite,
    unmarkFavorite,
    setActiveSession,
    setLocalPlayerId
  } = useGamesStore((state) => ({
    catalog: state.catalog,
    sessions: state.sessions,
    favorites: state.favorites,
    quickPlay: state.quickPlay,
    createSession: state.createSession,
    joinSession: state.joinSession,
    markFavorite: state.markFavorite,
    unmarkFavorite: state.unmarkFavorite,
    setActiveSession: state.setActiveSession,
    setLocalPlayerId: state.setLocalPlayerId
  }))

  const categories = React.useMemo(() => {
    const unique = new Set<string>()
    catalog.forEach((game) => {
      game.categories.forEach((cat) => unique.add(cat))
    })
    return [DEFAULT_CATEGORY, ...Array.from(unique)]
  }, [catalog])

  const [category, setCategory] = React.useState<string>(DEFAULT_CATEGORY)
  const [search, setSearch] = React.useState('')
  const [selectedGameId, setSelectedGameId] = React.useState<GameId>(catalog[0]?.id ?? 'uno')
  const [showCreation, setShowCreation] = React.useState(false)
  const [creationState, setCreationState] = React.useState<CreationState | null>(null)
  const [showSessionSheet, setShowSessionSheet] = React.useState<GameSession | null>(null)

  const [remoteCatalog, setRemoteCatalog] = React.useState<any[] | null>(null)
  const [remoteSessions, setRemoteSessions] = React.useState<any[] | null>(null)
  const remote = isBackendConfigured()

  // Load catalog/sessions from backend if configured
  React.useEffect(() => {
    if (!remote) return
    api.getCatalog().then((res) => setRemoteCatalog(res.items)).catch(() => setRemoteCatalog([]))
  }, [remote])

  React.useEffect(() => {
    if (!remote || !selectedGameId) return
    api.listSessions(selectedGameId).then((res) => setRemoteSessions(res.items)).catch(() => setRemoteSessions([]))
  }, [remote, selectedGameId])

  const effectiveCatalog = remote ? (remoteCatalog && remoteCatalog.length ? remoteCatalog : catalog) : catalog

  const filteredCatalog = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    return effectiveCatalog.filter((game) => {
      const categoriesList = Array.isArray(game.categories) ? game.categories : []
      const tagsList = Array.isArray(game.tags) ? game.tags : []
      const name = typeof game.name === 'string' ? game.name : ''
      const summary = typeof game.summary === 'string' ? game.summary : ''
      const matchesCategory =
        category === DEFAULT_CATEGORY ||
        categoriesList.includes(category) ||
        tagsList.includes(category)
      const matchesSearch =
        term.length === 0 ||
        name.toLowerCase().includes(term) ||
        summary.toLowerCase().includes(term) ||
        tagsList.some((tag) => typeof tag === 'string' && tag.toLowerCase().includes(term))
      return matchesCategory && matchesSearch
    })
  }, [effectiveCatalog, category, search])

  React.useEffect(() => {
    if (!filteredCatalog.some((game) => game.id === selectedGameId) && filteredCatalog.length > 0) {
      setSelectedGameId(filteredCatalog[0].id)
    }
  }, [filteredCatalog, selectedGameId])

  const selectedGame = React.useMemo(
    () => filteredCatalog.find((game) => game.id === selectedGameId) ?? effectiveCatalog[0],
    [filteredCatalog, selectedGameId, effectiveCatalog]
  )

  React.useEffect(() => {
    if (!selectedGame) return
    const defaults = (selectedGame.defaultOptions ?? {}) as Record<string, unknown>
    const availableModes = Array.isArray(selectedGame.modes) && selectedGame.modes.length > 0 ? selectedGame.modes : ['realtime']
    const visibility = (defaults.visibility as SessionType) ?? 'public'
    const defaultMode = (defaults.mode as SessionMode) ?? (availableModes[0] as SessionMode)
    setCreationState({
      title: `${selectedGame.name} entre amis`,
      sessionType: visibility,
      mode: defaultMode,
      allowBots: Boolean(defaults.allowBots),
      allowStacking: Boolean(defaults.allowStacking),
      allowWildChallenge: Boolean(defaults.allowWildChallenge),
      timerPerTurn: typeof defaults.timerPerTurn === 'number' ? (defaults.timerPerTurn as number) : 20
    })
  }, [selectedGame])

  const selectedGameKey = selectedGame?.id ?? ''
  const sessionsForGame = React.useMemo(
    () =>
      remote
        ? remoteSessions && remoteSessions.length
          ? remoteSessions
          : sessions.filter((session) => session.gameId === selectedGameKey)
        : sessions.filter((session) => session.gameId === selectedGameKey),
    [remote, remoteSessions, sessions, selectedGameKey]
  )

  const handleQuickPlay = async (gameId: GameId) => {
    if (remote) {
      if (!api.isAuthenticated()) {
        navigate('/auth')
        return
      }
      const current = getCurrentUser()
      if (current) setLocalPlayerId(current.userId)
      // Try to join first waiting session, else create
      const found = (remoteSessions || []).find((s) => s.status === 'waiting' && s.gameId === gameId)
      let target = found
      if (found) {
        target = await api.joinSession(found.id)
      } else if (selectedGame) {
        target = await api.createSession({ gameId, title: `${selectedGame.name} - rapide` })
      }
      if (target) {
        setActiveSession(target.id)
        setRemoteSessions((prev) => updateRemoteSessions(prev, target))
        routeToLobby(target, navigate)
      }
      return
    }
    const session = quickPlay({ gameId, player: buildSessionPlayer(user) })
    setActiveSession(session.id)
    routeToLobby(session, navigate)
  }

  const handleCreateSession = async () => {
    if (!selectedGame || !creationState) return
    if (remote) {
      if (!api.isAuthenticated()) {
        navigate('/auth')
        return
      }
      const current = getCurrentUser()
      if (current) setLocalPlayerId(current.userId)
      const session = await api.createSession({
        gameId: selectedGame.id,
        title: creationState.title,
        mode: creationState.mode,
        type: creationState.sessionType,
        maxPlayers: selectedGame.playerRange[1],
        options: {
          allowBots: creationState.allowBots,
          allowStacking: creationState.allowStacking,
          allowWildChallenge: creationState.allowWildChallenge,
          timerPerTurn: creationState.timerPerTurn
        }
      })
      setShowCreation(false)
      setActiveSession(session.id)
      setRemoteSessions((prev) => updateRemoteSessions(prev, session))
      routeToLobby(session, navigate)
      return
    }
    const session = createSession({
      gameId: selectedGame.id,
      sessionType: creationState.sessionType,
      mode: creationState.mode,
      title: creationState.title,
      maxPlayers: selectedGame.playerRange[1],
      options: {
        allowBots: creationState.allowBots,
        allowStacking: creationState.allowStacking,
        allowWildChallenge: creationState.allowWildChallenge,
        timerPerTurn: creationState.timerPerTurn
      },
      host: buildSessionPlayer(user, { isHost: true, status: 'ready' })
    })
    setShowCreation(false)
    setActiveSession(session.id)
    routeToLobby(session, navigate)
  }

  const handleJoinSession = (session: GameSession) => {
    const joined = joinSession(session.id, buildSessionPlayer(user))
    if (joined) {
      routeToLobby(joined, navigate)
    }
  }

  const toggleFavorite = (gameId: GameId) => {
    if (favorites.includes(gameId)) unmarkFavorite(gameId)
    else markFavorite(gameId)
  }

  if (!selectedGame) {
    return (
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">Catalogue indisponible</h1>
        <p className="text-sm text-muted">Aucun jeu n est configure pour le moment.</p>
      </section>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-white to-accent/10 p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-primary">Jouer ensemble</p>
            <h1 className="text-2xl font-semibold text-txt">Des parties sociales en un tap</h1>
            <p className="text-sm text-muted">
              Lancez un match rapide avec la communaute, creez un salon prive ou grimpez le classement en mode
              classe. Les parametres sont adaptes a chaque jeu.
            </p>
          </div>
          <button
            onClick={() => handleQuickPlay(selectedGame.id)}
            className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring"
          >
            <Flame className="h-5 w-5" />
            Match rapide
          </button>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            type="search"
            placeholder="Rechercher un jeu"
            className="w-full rounded-2xl border border-border/60 bg-surface py-3 pl-11 pr-4 text-sm text-txt placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </div>
        <Tabs
          items={categories.map((cat) => (cat === DEFAULT_CATEGORY ? 'Tout' : formatCategory(cat)))}
          current={category === DEFAULT_CATEGORY ? 'Tout' : formatCategory(category)}
          onChange={(label) => {
            setCategory(label === 'Tout' ? DEFAULT_CATEGORY : categories.find((cat) => formatCategory(cat) === label) ?? DEFAULT_CATEGORY)
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filteredCatalog.map((game) => {
          const isSelected = game.id === selectedGame.id
          const isFavorite = favorites.includes(game.id)
          const categoriesLabel = (Array.isArray(game.categories) ? game.categories : []).join(' / ')
          const tagList = Array.isArray(game.tags) ? game.tags : []
          const playerRange = Array.isArray(game.playerRange) && game.playerRange.length >= 2 ? game.playerRange : [1, 4]
          const durationHint = typeof game.durationHint === 'string' ? game.durationHint : '15 min'
          return (
            <Card
              key={game.id}
              onClick={() => setSelectedGameId(game.id)}
              ariaLabel={`Afficher ${game.name}`}
              className={`flex flex-col gap-3 ${isSelected ? 'border-primary/50 shadow-card' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">{categoriesLabel}</p>
                  <h2 className="mt-1 text-lg font-semibold text-txt">{game.name}</h2>
                </div>
                <button
                  className="rounded-full border border-border/60 p-2 text-muted transition hover:text-primary focus-ring"
                  aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleFavorite(game.id)
                  }}
                >
                  {isFavorite ? <Star className="h-4 w-4 text-primary" /> : <StarOff className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-sm text-muted">{game.summary}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {playerRange[0]}-{playerRange[1]} joueurs
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {durationHint}
                </span>
                {game.highlight ? (
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-accent" />
                    {game.highlight}
                  </span>
                ) : null}
              </div>
            </Card>
          )
        })}
      </div>

      {selectedGame && creationState ? (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Configuration</p>
              <h3 className="text-lg font-semibold text-txt">{selectedGame.name}</h3>
            </div>
            <button
              onClick={() => setShowCreation(true)}
              className="flex items-center gap-2 rounded-2xl border border-border/60 px-4 py-2 text-xs font-semibold text-muted transition hover:border-primary/50 hover:text-primary focus-ring"
            >
              <Plus className="h-4 w-4" />
              Creer une partie
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted">
            {(Array.isArray(selectedGame.tags) ? selectedGame.tags : []).map((tag) => (
              <span key={tag} className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                #{tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted">{selectedGame.description}</p>
        </Card>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Sessions en attente</h2>
          <button
            onClick={() => setShowSessionSheet(null)}
            className="hidden items-center gap-2 text-xs font-semibold text-primary hover:underline focus-ring sm:flex"
          >
            <Settings2 className="h-4 w-4" />
            Parametres
          </button>
        </div>
        {sessionsForGame.length === 0 ? (
          <Card className="text-sm text-muted">Aucune session pour le moment. Lancez la premiere.</Card>
        ) : (
          <div className="space-y-3">
            {sessionsForGame.map((session) => {
              const pills: React.ReactNode[] = []
              if (session.options?.allowStacking) pills.push(<TagPill key={`${session.id}-stack`} label="Stack +2" />)
              if (session.options?.allowWildChallenge) pills.push(<TagPill key={`${session.id}-challenge`} label="Challenge +4" />)
              if (session.options?.allowBots) pills.push(<TagPill key={`${session.id}-bots`} label="Bots autorises" />)
              if (typeof session.options?.timerPerTurn === 'number') {
                pills.push(<TagPill key={`${session.id}-timer`} label={`${session.options.timerPerTurn}s par tour`} />)
              }
              if (session.options?.visibility === 'ranked' || session.type === 'ranked') {
                pills.push(<TagPill key={`${session.id}-ranked`} label="Classe" />)
              }
              return (
                <Card key={session.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-txt">{session.title}</p>
                    <p className="text-xs text-muted">
                      {session.players.length}/{session.maxPlayers} joueurs - {renderSessionType(session.type)} -{' '}
                      {session.mode === 'realtime' ? 'Temps reel' : 'Tour par tour'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">{pills}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSessionSheet(session)}
                      className="rounded-2xl border border-border/60 px-4 py-2 text-xs font-semibold text-muted transition hover:border-primary/50 hover:text-primary focus-ring"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => handleJoinSession(session)}
                      className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring"
                    >
                      Rejoindre
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {showCreation && creationState ? (
        <CreationForm
          state={creationState}
          setState={setCreationState}
          gameId={selectedGame.id}
          modes={Array.isArray(selectedGame.modes) && selectedGame.modes.length ? selectedGame.modes : ['realtime']}
          onCreate={handleCreateSession}
          onCancel={() => setShowCreation(false)}
        />
      ) : null}

      {showSessionSheet ? (
        <SessionDetailsSheet
          session={showSessionSheet}
          onClose={() => setShowSessionSheet(null)}
          onJoin={() => handleJoinSession(showSessionSheet)}
        />
      ) : null}
    </div>
  )
}

function formatCategory(category: string) {
  return category
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function renderSessionType(sessionType: SessionType) {
  switch (sessionType) {
    case 'private':
      return 'Prive'
    case 'ranked':
      return 'Classe'
    default:
      return 'Public'
  }
}

function routeToLobby(session: GameSession, navigate: ReturnType<typeof useNavigate>) {
  const state = { session }
  if (session.gameId === 'uno' || session.gameId === 'uno-no-mercy') {
    navigate(`/uno/lobby?session=${session.id}`, { state })
    return
  }
  if (session.gameId === 'derocher') {
    navigate(`/derocher/lobby?session=${session.id}`, { state })
    return
  }
  navigate('/games')
}

function updateRemoteSessions(prev: any[] | null, session: any) {
  const list = prev ? prev.filter((s) => s.id !== session.id) : []
  list.push(session)
  return list
}

function TagPill({ label }: { label: string }) {
  return <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{label}</span>
}

type CreationFormProps = {
  state: CreationState
  setState: React.Dispatch<React.SetStateAction<CreationState | null>>
  gameId: GameId
  modes: SessionMode[]
  onCreate: () => void
  onCancel: () => void
}

function CreationForm({ state, setState, modes, gameId, onCreate, onCancel }: CreationFormProps) {
  return (
    <Card className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Parametres de la partie</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Titre">
          <input
            value={state.title}
            onChange={(event) => setState((prev) => (prev ? { ...prev, title: event.target.value } : prev))}
            className="w-full rounded-2xl border border-border/60 bg-bg px-3 py-2 text-sm text-txt focus:border-primary focus:outline-none"
          />
        </Field>
        <Field label="Type de session">
          <select
            value={state.sessionType}
            onChange={(event) =>
              setState((prev) => (prev ? { ...prev, sessionType: event.target.value as SessionType } : prev))
            }
            className="w-full rounded-2xl border border-border/60 bg-bg px-3 py-2 text-sm text-txt focus:border-primary focus:outline-none"
          >
            <option value="public">Public</option>
            <option value="private">Prive</option>
            <option value="ranked" disabled={gameId !== 'uno-no-mercy'}>
              Classe
            </option>
          </select>
        </Field>
        <Field label="Mode">
          <select
            value={state.mode}
            onChange={(event) =>
              setState((prev) => (prev ? { ...prev, mode: event.target.value as SessionMode } : prev))
            }
            className="w-full rounded-2xl border border-border/60 bg-bg px-3 py-2 text-sm text-txt focus:border-primary focus:outline-none"
          >
            {modes.map((mode) => (
              <option key={mode} value={mode}>
                {mode === 'realtime' ? 'Temps reel' : 'Tour par tour'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Timer par tour (secondes)">
          <input
            type="number"
            min={0}
            max={600}
            value={state.timerPerTurn}
            onChange={(event) =>
              setState((prev) =>
                prev ? { ...prev, timerPerTurn: Number(event.target.value) || 0 } : prev
              )
            }
            className="w-full rounded-2xl border border-border/60 bg-bg px-3 py-2 text-sm text-txt focus:border-primary focus:outline-none"
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Toggle
          label="Autoriser les bots"
          checked={state.allowBots}
          onChange={(value) => setState((prev) => (prev ? { ...prev, allowBots: value } : prev))}
        />
        <Toggle
          label="Stack +2"
          checked={state.allowStacking}
          onChange={(value) => setState((prev) => (prev ? { ...prev, allowStacking: value } : prev))}
          disabled={gameId === 'derocher'}
        />
        <Toggle
          label="Challenge +4"
          checked={state.allowWildChallenge}
          onChange={(value) => setState((prev) => (prev ? { ...prev, allowWildChallenge: value } : prev))}
          disabled={gameId === 'derocher'}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          onClick={onCreate}
          className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring"
        >
          Creer maintenant
        </button>
        <button
          onClick={onCancel}
          className="rounded-2xl border border-border/60 px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/50 hover:text-primary focus-ring"
        >
          Annuler
        </button>
      </div>
    </Card>
  )
}

function SessionDetailsSheet({
  session,
  onClose,
  onJoin
}: {
  session: GameSession
  onClose: () => void
  onJoin: () => void
}) {
  const optionLabels: string[] = []
  if (session.options.allowStacking) optionLabels.push('Stack +2')
  if (session.options.allowWildChallenge) optionLabels.push('Challenge +4')
  if (session.options.allowBots) optionLabels.push('Bots autorises')
  if (typeof session.options.timerPerTurn === 'number') optionLabels.push(`Timer ${session.options.timerPerTurn}s`)
  if (session.type === 'ranked' || session.options.visibility === 'ranked') optionLabels.push('Classe')

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/30 backdrop-blur-sm md:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="safe-area relative w-full max-w-md rounded-t-3xl border border-border/60 bg-surface p-6 shadow-soft md:rounded-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Session</p>
            <h3 className="text-lg font-semibold text-txt">{session.title}</h3>
          </div>
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <p className="mt-2 text-sm text-muted">
          {session.players.length}/{session.maxPlayers} joueurs - {renderSessionType(session.type)} -{' '}
          {session.mode === 'realtime' ? 'Temps reel' : 'Tour par tour'}
        </p>
        <div className="mt-4 space-y-2 text-sm text-muted">
          {session.accessCode ? <p>Code: {session.accessCode}</p> : null}
          <p>Options: {optionLabels.length ? optionLabels.join(' - ') : 'Configuration standard'}</p>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={onJoin}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring"
          >
            Rejoindre
          </button>
          <button
            onClick={onClose}
            className="rounded-2xl border border-border/60 px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/50 hover:text-primary focus-ring"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
      {label}
      {children}
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  disabled
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={`flex items-center justify-between rounded-2xl border px-4 py-2 text-xs font-semibold transition focus-ring ${
        disabled
          ? 'cursor-not-allowed border-border/60 text-muted/60'
          : checked
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border/60 text-muted hover:border-primary/50 hover:text-primary'
      }`}
      aria-pressed={checked}
      disabled={disabled}
    >
      {label}
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
          checked ? 'bg-primary' : 'bg-border'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            checked ? 'translate-x-4' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  )
}



