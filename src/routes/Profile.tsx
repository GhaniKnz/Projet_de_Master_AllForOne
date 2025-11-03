import React from "react"
import { useParams, useNavigate } from "react-router-dom"
import Card from "../components/Card"
import Tabs from "../components/Tabs"
import {
  api,
  isBackendConfigured,
  getCurrentUser,
  type FriendSummary
} from "../lib/api"
import { useFeedStore } from "../store/feed"
import { useAppStore } from "../store/app"
import { useChatStore } from "../store/chat"

const SECTIONS = ["Aperçu", "Historique", "Classements", "Publications"]

type ActivityItem = {
  id: string
  kind: string
  createdAt: string
  content: string
  media?: any
  postId?: string
}

type ProfileSummary = {
  id: string
  displayName: string
  handle: string
  avatarUrl?: string
  bannerUrl?: string
  bio?: string
  xp: number
  level: number
  stats: { wins: number; losses: number }
  friends: string[]
  postsCount: number
  commentsCount: number
  createdAt: string
}

type ProfileState = {
  loading: boolean
  data: ProfileSummary | null
  activity: ActivityItem[]
  progression?: {
    xp: number
    level: number
    nextLevelAt: number
    progressToNext: number
    xpForNext: number
  } | null
  error?: string
}

const initialState: ProfileState = {
  loading: false,
  data: null,
  activity: [],
  progression: null
}

const offlineProfile: ProfileSummary = {
  id: "demo-user",
  displayName: "Guest",
  handle: "@guest",
  avatarUrl: undefined,
  bannerUrl: undefined,
  bio: "Connectez-vous pour personnaliser votre profil.",
  xp: 0,
  level: 1,
  stats: { wins: 0, losses: 0 },
  friends: [],
  postsCount: 0,
  commentsCount: 0,
  createdAt: new Date().toISOString()
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Invalid image data"))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

export default function Profile() {
  const params = useParams<{ username?: string }>()
  const navigate = useNavigate()
  const current = getCurrentUser()
  const remote = isBackendConfigured()
  const { user, setUser } = useAppStore((state) => ({
    user: state.user,
    setUser: state.setUser
  }))
  const { createConversation } = useChatStore((state) => ({
    createConversation: state.createConversation
  }))
  const refreshFeed = useFeedStore((feed) => feed.refresh)

  const profileId = params.username ?? current?.userId ?? "demo-user"
  const [state, setState] = React.useState<ProfileState>(initialState)
  const [currentSection, setCurrentSection] = React.useState<string>(SECTIONS[0])
  const [editing, setEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [friendActionLoading, setFriendActionLoading] = React.useState(false)
  const [friendsDetail, setFriendsDetail] = React.useState<FriendSummary[]>([])
  const [editForm, setEditForm] = React.useState({
    displayName: "",
    bio: "",
    avatarUrl: "",
    bannerUrl: ""
  })
  const avatarInputRef = React.useRef<HTMLInputElement | null>(null)
  const bannerInputRef = React.useRef<HTMLInputElement | null>(null)

  const isMe = current?.userId === profileId
  const isFriend = Boolean(user?.friends?.includes(profileId))

  const loadProfile = React.useCallback(async () => {
    if (!remote) {
      setState({ loading: false, data: offlineProfile, activity: [], progression: null })
      setFriendsDetail([])
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: undefined }))
    try {
      const [profile, activity] = await Promise.all([api.getUserProfile(profileId), api.getUserActivity(profileId)])
      let progression = null
      if (current?.userId === profileId) {
        progression = await api.getProgression().catch(() => null)
      }

      setState({
        loading: false,
        data: profile,
        activity: activity.items ?? [],
        progression
      })

      if (current?.userId === profileId) {
        const friends = await api.getFriends().catch(() => ({ items: [] }))
        setFriendsDetail(friends.items ?? [])
        if (user) {
          setUser({
            ...user,
            displayName: profile.displayName,
            handle: profile.handle,
            avatarUrl: profile.avatarUrl,
            bannerUrl: profile.bannerUrl,
            bio: profile.bio,
            xp: profile.xp,
            level: profile.level,
            stats: profile.stats,
            friends: profile.friends
          })
        }
      } else {
        setFriendsDetail([])
      }
    } catch (err: any) {
      const message = err?.message || ""
      if (message.includes("Failed to fetch")) {
        setState({ loading: false, data: offlineProfile, activity: [], progression: null })
        setFriendsDetail([])
        return
      }
      if (message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("missing token")) {
        setState({
          loading: false,
          data: offlineProfile,
          activity: [],
          progression: null,
          error: "Connectez-vous pour consulter ce profil."
        })
        setFriendsDetail([])
        return
      }
      setState({
        loading: false,
        data: null,
        activity: [],
        progression: null,
        error: err?.message ?? "Impossible de charger le profil"
      })
      setFriendsDetail([])
    }
  }, [remote, profileId, current?.userId, user, setUser])

  React.useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  React.useEffect(() => {
    if (!state.data) return
    setEditForm({
      displayName: state.data.displayName,
      bio: state.data.bio ?? "",
      avatarUrl: state.data.avatarUrl ?? "",
      bannerUrl: state.data.bannerUrl ?? ""
    })
  }, [state.data])

  const handleEditFormChange = (field: "displayName" | "bio" | "avatarUrl" | "bannerUrl", value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (file.size > 1024 * 1024) {
      window.alert("Image trop lourde (1 Mo maximum).")
      return
    }
    try {
      const dataUrl = await fileToDataUrl(file)
      setEditForm((prev) => ({ ...prev, avatarUrl: dataUrl }))
    } catch {
      window.alert("Impossible de charger cette image.")
    }
  }

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      window.alert("Bannière trop lourde (2 Mo maximum).")
      return
    }
    try {
      const dataUrl = await fileToDataUrl(file)
      setEditForm((prev) => ({ ...prev, bannerUrl: dataUrl }))
    } catch {
      window.alert("Impossible de charger cette image.")
    }
  }

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!remote || current?.userId !== profileId) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      const payload = {
        displayName: editForm.displayName.trim() || undefined,
        bio: editForm.bio.trim() || undefined,
        avatarUrl: editForm.avatarUrl || undefined,
        bannerUrl: editForm.bannerUrl || undefined
      }
      const updated = await api.updateProfile(payload)
      setState((prev) =>
        prev.data
          ? {
              ...prev,
              data: {
                ...prev.data,
                displayName: updated.displayName,
                handle: updated.handle,
                avatarUrl: updated.avatarUrl,
                bannerUrl: updated.bannerUrl,
                bio: updated.bio
              }
            }
          : prev
      )
      if (user) {
        setUser({
          ...user,
          displayName: updated.displayName,
          handle: updated.handle,
          avatarUrl: updated.avatarUrl,
          bannerUrl: updated.bannerUrl,
          bio: updated.bio
        })
      }
      setEditing(false)
      await refreshFeed()
    } catch (err: any) {
      window.alert(err?.message ?? "Impossible de mettre à jour le profil")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleFriend = async () => {
    if (!remote || !current) {
      navigate("/auth")
      return
    }
    if (current.userId === profileId) return
    setFriendActionLoading(true)
    try {
      const response = isFriend ? await api.removeFriend(profileId) : await api.addFriend(profileId)
      if (user) {
        setUser({ ...user, friends: response.friends })
      }
      await loadProfile()
    } catch (err: any) {
      window.alert(err?.message ?? "Impossible de mettre à jour vos amis")
    } finally {
      setFriendActionLoading(false)
    }
  }

  const handleStartConversation = async (targetId: string, title?: string) => {
    try {
      const conversation = await createConversation([targetId], title)
      navigate(`/messages/${conversation.id}`)
    } catch (err: any) {
      window.alert(err?.message ?? "Impossible d'ouvrir la conversation")
    }
  }

  const displayedFriends = React.useMemo<FriendSummary[]>(() => {
    if (isMe) return friendsDetail
    const fallback = state.data?.friends ?? []
    return fallback.map((friendId) => ({
      id: friendId,
      displayName: friendId,
      handle: `@${friendId}`,
      avatarUrl: undefined,
      level: 0
    }))
  }, [isMe, friendsDetail, state.data?.friends])

  const profile = state.data

  if (state.loading && !profile) {
    return <Card className="p-6 text-sm text-muted">Chargement du profil...</Card>
  }

  if (state.error) {
    return <Card className="p-6 text-sm text-danger">{state.error}</Card>
  }

  if (!profile) {
    return <Card className="p-6 text-sm text-muted">Profil introuvable.</Card>
  }

  return (
    <div className="space-y-6 pb-24">
      <section className="overflow-hidden rounded-3xl border border-border/60 bg-surface shadow-soft">
        <div className="h-32 w-full bg-primary/10 sm:h-44">
          {profile.bannerUrl ? (
            <img src={profile.bannerUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-primary/30 via-primary/5 to-transparent" />
          )}
        </div>
        <div className="flex flex-col gap-4 px-6 pb-6 pt-0 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-10 flex items-start gap-4 sm:-mt-12">
            <span className="flex h-20 w-20 items-center justify-center rounded-3xl border border-border/80 bg-bg text-lg font-semibold text-primary shadow-card sm:h-24 sm:w-24">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="h-full w-full rounded-3xl object-cover" />
              ) : (
                profile.displayName.slice(0, 2).toUpperCase()
              )}
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-txt">{profile.displayName}</h1>
              <p className="text-sm text-muted">{profile.handle}</p>
              {profile.bio ? <p className="mt-2 text-sm text-txt">{profile.bio}</p> : null}
              <p className="mt-2 text-xs text-muted">
                Niveau {profile.level} · {profile.xp} XP
              </p>
              <p className="text-xs text-muted">Membre depuis le {formatDate(profile.createdAt)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pb-2 sm:pb-0">
            {isMe && remote ? (
              <button
                onClick={() => setEditing(true)}
                className="rounded-2xl border border-border/70 px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/60 hover:text-primary focus-ring"
              >
                Modifier le profil
              </button>
            ) : null}
            {!isMe && remote ? (
              <>
                <button
                  onClick={handleToggleFriend}
                  disabled={friendActionLoading}
                  className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {friendActionLoading ? "Patientez..." : isFriend ? "Retirer des amis" : "Ajouter aux amis"}
                </button>
                <button
                  onClick={() => handleStartConversation(profile.id, profile.displayName)}
                  className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring"
                >
                  Discuter
                </button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {editing ? (
        <Card className="space-y-6">
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Avatar</p>
                <div className="flex items-center gap-3">
                  <span className="flex h-16 w-16 items-center justify-center rounded-3xl border border-border/70 bg-bg text-base font-semibold text-primary shadow-card">
                    {editForm.avatarUrl ? (
                      <img src={editForm.avatarUrl} alt="" className="h-full w-full rounded-3xl object-cover" />
                    ) : profile.displayName.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="rounded-2xl border border-border/60 px-3 py-2 text-xs font-semibold text-muted transition hover:border-primary/60 hover:text-primary focus-ring"
                    >
                      Importer depuis la galerie
                    </button>
                    {editForm.avatarUrl ? (
                      <button
                        type="button"
                        onClick={() => handleEditFormChange("avatarUrl", "")}
                        className="rounded-2xl border border-border/60 px-3 py-2 text-xs font-semibold text-muted transition hover:border-danger/40 hover:text-danger focus-ring"
                      >
                        Supprimer l&apos;image
                      </button>
                    ) : null}
                  </div>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <input
                  type="url"
                  value={editForm.avatarUrl.startsWith("data:") ? "" : editForm.avatarUrl}
                  onChange={(event) => handleEditFormChange("avatarUrl", event.target.value)}
                  placeholder="https://..."
                  className="rounded-2xl border border-border/60 bg-bg px-3 py-2 text-sm text-txt focus:border-primary focus:outline-none"
                />
                {editForm.avatarUrl.startsWith("data:") ? (
                  <p className="text-xs text-muted">Image importée depuis votre appareil.</p>
                ) : (
                  <p className="text-xs text-muted">Choisissez une image ou collez l’URL d’un avatar.</p>
                )}
              </div>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Bannière</p>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-full overflow-hidden rounded-3xl border border-border/70 bg-bg shadow-card">
                    {editForm.bannerUrl ? (
                      <img src={editForm.bannerUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted">
                        Aucun visuel
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="rounded-2xl border border-border/60 px-3 py-2 text-xs font-semibold text-muted transition hover:border-primary/60 hover:text-primary focus-ring"
                  >
                    Importer une bannière
                  </button>
                  {editForm.bannerUrl ? (
                    <button
                      type="button"
                      onClick={() => handleEditFormChange("bannerUrl", "")}
                      className="rounded-2xl border border-border/60 px-3 py-2 text-xs font-semibold text-muted transition hover:border-danger/40 hover:text-danger focus-ring"
                    >
                      Supprimer la bannière
                    </button>
                  ) : null}
                </div>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerUpload}
                />
                <input
                  type="url"
                  value={editForm.bannerUrl.startsWith("data:") ? "" : editForm.bannerUrl}
                  onChange={(event) => handleEditFormChange("bannerUrl", event.target.value)}
                  placeholder="https://..."
                  className="rounded-2xl border border-border/60 bg-bg px-3 py-2 text-sm text-txt focus:border-primary focus:outline-none"
                />
                <p className="text-xs text-muted">PNG ou JPG 2 Mo maximum.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                Nom d&apos;affichage
                <input
                  value={editForm.displayName}
                  onChange={(event) => handleEditFormChange("displayName", event.target.value)}
                  className="rounded-2xl border border-border/60 bg-bg px-3 py-2 text-sm text-txt focus:border-primary focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted sm:col-span-2">
                Bio
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(event) => handleEditFormChange("bio", event.target.value)}
                  className="rounded-2xl border border-border/60 bg-bg px-3 py-2 text-sm text-txt focus:border-primary focus:outline-none"
                  placeholder="Quelques mots pour décrire votre style ou vos jeux préférés."
                />
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-2xl border border-border/60 px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/50 hover:text-primary focus-ring"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring disabled:cursor-not-allowed disabled:bg-primary/40"
              >
                {saving ? "Sauvegarde..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="flex items-center justify-between">
        <Tabs items={SECTIONS} current={currentSection} onChange={setCurrentSection} />
      </div>

      {currentSection === "Aperçu" ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Expérience</p>
              <p className="mt-3 text-2xl font-semibold text-txt">{profile.xp}</p>
              <p className="text-sm text-muted">Total de points XP</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Progression</p>
              <p className="mt-3 text-2xl font-semibold text-txt">Niveau {profile.level}</p>
              <p className="text-sm text-muted">
                {state.progression
                  ? `${state.progression.progressToNext.toFixed(0)} XP / ${state.progression.xpForNext} vers le prochain niveau`
                  : "Connectez-vous pour suivre votre progression en direct."}
              </p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Statistiques</p>
              <p className="mt-3 text-2xl font-semibold text-txt">{profile.stats.wins} victoires</p>
              <p className="text-sm text-muted">{profile.stats.losses} défaites</p>
            </Card>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Amis</h2>
              <span className="text-xs text-muted">{profile.friends.length} ami(s)</span>
            </div>
            <Card className="space-y-3">
              {displayedFriends.length === 0 ? (
                <p className="text-sm text-muted">
                  {isMe ? "Ajoutez des amis pour les retrouver rapidement ici." : "Aucun ami affiché pour le moment."}
                </p>
              ) : (
                displayedFriends.map((friend) => (
                  <div key={friend.id} className="flex flex-col gap-3 rounded-2xl bg-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {friend.avatarUrl ? (
                          <img src={friend.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          friend.displayName.slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-txt">{friend.displayName}</p>
                        <p className="text-xs text-muted">{friend.handle}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => navigate(`/profile/${friend.id}`)}
                        className="rounded-2xl border border-border/60 px-3 py-2 text-xs font-semibold text-muted transition hover:border-primary/50 hover:text-primary focus-ring"
                      >
                        Voir le profil
                      </button>
                      {isMe ? (
                        <button
                          onClick={() => handleStartConversation(friend.id, friend.displayName)}
                          className="rounded-2xl bg-primary px-3 py-2 text-xs font-semibold text-white shadow-soft transition hover:bg-primary/90 focus-ring"
                        >
                          Discuter
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </Card>
          </section>
        </div>
      ) : null}

      {currentSection === "Historique" ? (
        <Card className="space-y-4">
          {state.activity.length === 0 ? (
            <p className="text-sm text-muted">Aucune activité récente.</p>
          ) : (
            state.activity.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/60 bg-panel px-4 py-3">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">{item.kind}</p>
                <p className="mt-2 text-sm text-txt">{item.content}</p>
                <p className="mt-1 text-xs text-muted">{formatDate(item.createdAt)}</p>
              </div>
            ))
          )}
        </Card>
      ) : null}

      {currentSection === "Classements" ? (
        <Card>
          <p className="text-sm text-muted">
            Les classements détaillés arrivent bientôt. Continuez à jouer pour gagner de l&apos;XP et gravir les rangs !
          </p>
        </Card>
      ) : null}

      {currentSection === "Publications" ? (
        <Card className="space-y-4">
          {state.activity.filter((item) => item.kind === "post").length === 0 ? (
            <p className="text-sm text-muted">Aucune publication publique pour l&apos;instant.</p>
          ) : (
            state.activity
              .filter((item) => item.kind === "post")
              .map((item) => (
                <div key={item.id} className="rounded-2xl border border-border/60 bg-panel px-4 py-3">
                  <p className="text-sm text-txt">{item.content}</p>
                  <p className="mt-1 text-xs text-muted">{formatDate(item.createdAt)}</p>
                </div>
              ))
          )}
        </Card>
      ) : null}
    </div>
  )
}
