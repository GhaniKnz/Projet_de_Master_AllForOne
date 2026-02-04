import React from "react"
import { useParams, useNavigate } from "react-router-dom"
import Card from "../components/Card"
import Trophies from "../components/Trophies"
import {
  api,
  isBackendConfigured,
  getCurrentUser,
  type FriendSummary
} from "../lib/api"
import { useFeedStore } from "../store/feed"
import { useAppStore } from "../store/app"
import { useChatStore } from "../store/chat"

const SECTIONS = ["Aperçu", "Trophées", "Historique", "Publications"]

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

// Lit un fichier et retourne un data URL
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Invalid result'))
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// Compresse et redimensionne une image pour un stockage optimisé
function compressImage(file: File, maxWidth: number, maxHeight: number, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    // D'abord lire le fichier
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Impossible de lire le fichier"))
    reader.onload = () => {
      const dataUrl = reader.result as string
      
      // Créer l'image
      const img = new Image()
      img.onerror = () => reject(new Error("Impossible de charger l'image"))
      img.onload = () => {
        try {
          // Calculer les nouvelles dimensions en gardant le ratio
          let width = img.width
          let height = img.height
          
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
          
          // Créer le canvas
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error("Canvas context not available"))
            return
          }
          
          // Dessiner l'image redimensionnée
          ctx.drawImage(img, 0, 0, width, height)
          
          // Convertir en JPEG compressé
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
          resolve(compressedDataUrl)
        } catch (err) {
          reject(err)
        }
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}

type EditModalType = 'avatar' | 'banner' | 'name' | 'bio' | null

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
  const [editModal, setEditModal] = React.useState<EditModalType>(null)
  const [saving, setSaving] = React.useState(false)
  const [uploadingImage, setUploadingImage] = React.useState<'avatar' | 'banner' | null>(null)
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
    // Reset immédiatement pour permettre de re-sélectionner le même fichier
    event.target.value = ""
    
    if (!file) {
      console.log("Aucun fichier sélectionné")
      return
    }
    
    console.log("Avatar sélectionné:", file.name, file.type, file.size)
    
    // Vérifier que c'est bien une image
    if (!file.type.startsWith('image/')) {
      window.alert("Veuillez sélectionner une image.")
      return
    }
    
    // Limite de 10 Mo pour le fichier original (sera compressé)
    if (file.size > 10 * 1024 * 1024) {
      window.alert("Image trop lourde (10 Mo maximum).")
      return
    }
    
    setUploadingImage('avatar')
    try {
      // Compresser et redimensionner l'avatar (400x400 max)
      const compressedDataUrl = await compressImage(file, 400, 400, 0.85)
      console.log("Avatar compressé, taille:", compressedDataUrl.length)
      setEditForm((prev) => ({ ...prev, avatarUrl: compressedDataUrl }))
    } catch (err) {
      console.error("Erreur upload avatar:", err)
      window.alert("Impossible de charger cette image. Essayez un autre format (JPG, PNG, WEBP, GIF).")
    } finally {
      setUploadingImage(null)
    }
  }

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Reset immédiatement pour permettre de re-sélectionner le même fichier
    event.target.value = ""
    
    if (!file) {
      console.log("Aucun fichier sélectionné")
      return
    }
    
    console.log("Banner sélectionné:", file.name, file.type, file.size)
    
    // Vérifier que c'est bien une image
    if (!file.type.startsWith('image/')) {
      window.alert("Veuillez sélectionner une image.")
      return
    }
    
    // Limite de 10 Mo pour le fichier original (sera compressé)
    if (file.size > 10 * 1024 * 1024) {
      window.alert("Image trop lourde (10 Mo maximum).")
      return
    }
    
    setUploadingImage('banner')
    try {
      // Compresser et redimensionner la bannière (1200x400 max)
      const compressedDataUrl = await compressImage(file, 1200, 400, 0.8)
      console.log("Banner compressé, taille:", compressedDataUrl.length)
      setEditForm((prev) => ({ ...prev, bannerUrl: compressedDataUrl }))
    } catch (err) {
      console.error("Erreur upload bannière:", err)
      window.alert("Impossible de charger cette image. Essayez un autre format (JPG, PNG, WEBP, GIF).")
    } finally {
      setUploadingImage(null)
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
    <div className="pb-24 -mx-4 sm:-mx-6">
      {/* Header avec bannière style X/Twitter */}
      <section className="relative">
        {/* Bannière - pleine largeur */}
        <div className="h-28 w-full sm:h-36">
          {profile.bannerUrl ? (
            <img src={profile.bannerUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/40 via-primary/20 to-accent/30" />
          )}
        </div>

        {/* Photo de profil - bulle qui chevauche */}
        <div className="relative px-4">
          <div className="absolute -top-12 left-4 sm:-top-14 sm:left-5">
            <div className="relative">
              <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-bg bg-surface text-lg font-bold text-primary shadow-xl sm:h-24 sm:w-24">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  profile.displayName.slice(0, 2).toUpperCase()
                )}
              </span>
            </div>
          </div>

          {/* Actions - alignées à droite */}
          <div className="flex justify-end gap-2 pt-3 pb-2">
            {isMe && remote ? (
              <button
                onClick={() => setEditing(!editing)}
                className="rounded-full border border-border/70 px-4 py-1.5 text-sm font-semibold text-txt transition active:scale-95 active:opacity-70"
              >
                Modifier le profil
              </button>
            ) : null}
            {!isMe && remote ? (
              <>
                <button
                  onClick={handleToggleFriend}
                  disabled={friendActionLoading}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition active:scale-95 disabled:opacity-50 ${
                    isFriend 
                      ? 'border border-border/70 text-txt' 
                      : 'bg-txt text-bg'
                  }`}
                >
                  {friendActionLoading ? "..." : isFriend ? "Abonné" : "S'abonner"}
                </button>
                <button
                  onClick={() => handleStartConversation(profile.id, profile.displayName)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-txt transition active:scale-95"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Infos du profil */}
        <div className="px-4 pb-4">
          {/* Nom et handle */}
          <div className="mt-6 sm:mt-8">
            <h1 className="text-xl font-bold text-txt sm:text-2xl">{profile.displayName}</h1>
            <p className="text-sm text-muted">{profile.handle}</p>
          </div>

          {/* Bio */}
          {profile.bio ? (
            <p className="mt-3 text-sm text-txt leading-relaxed">{profile.bio}</p>
          ) : null}

          {/* Infos secondaires - Date, niveau */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              Inscrit en {new Date(profile.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </span>
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
              Niveau {profile.level} · {profile.xp} XP
            </span>
          </div>

          {/* Abonnements / Abonnés */}
          <div className="mt-4 flex items-center gap-5 text-sm">
            <button className="group">
              <span className="font-bold text-txt">{profile.friends.length}</span>
              <span className="text-muted group-hover:underline"> abonnements</span>
            </button>
            <button className="group">
              <span className="font-bold text-txt">{profile.friends.length}</span>
              <span className="text-muted group-hover:underline"> abonnés</span>
            </button>
          </div>
        </div>
      </section>

      {/* Tabs style X/Twitter */}
      <div className="flex border-b border-border/20">
        {SECTIONS.map((section) => (
          <button
            key={section}
            onClick={() => setCurrentSection(section)}
            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
              currentSection === section ? 'text-txt' : 'text-muted'
            }`}
          >
            {section}
            {currentSection === section && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-12 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {editing ? (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4" 
          onClick={() => setEditing(false)}
        >
          <div
            className="relative w-full max-w-sm max-h-[75vh] overflow-hidden rounded-3xl bg-surface shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header style iOS */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/30 bg-surface/95 backdrop-blur-xl px-5 py-4">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-sm font-medium text-primary active:opacity-60"
              >
                Annuler
              </button>
              <h2 className="text-base font-semibold text-txt">Modifier le profil</h2>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  const form = document.getElementById('profile-edit-form') as HTMLFormElement
                  form?.requestSubmit()
                }}
                disabled={saving}
                className="text-sm font-semibold text-primary active:opacity-60 disabled:opacity-40"
              >
                {saving ? "..." : "OK"}
              </button>
            </div>

            {/* Contenu scrollable */}
            <div className="overflow-y-auto max-h-[calc(75vh-56px)] overscroll-contain">
              <form id="profile-edit-form" onSubmit={handleEditSubmit} className="space-y-6 p-5">
                {/* Section Avatar */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-border/50 bg-bg text-xl font-semibold text-primary shadow-lg overflow-hidden">
                      {uploadingImage === 'avatar' ? (
                        <div className="flex items-center justify-center">
                          <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        </div>
                      ) : editForm.avatarUrl ? (
                        <img src={editForm.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : profile.displayName.slice(0, 2).toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingImage === 'avatar'}
                      className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingImage === 'avatar'}
                    className="text-sm font-medium text-primary active:opacity-60"
                  >
                    Changer la photo
                  </button>
                  {editForm.avatarUrl ? (
                    <button
                      type="button"
                      onClick={() => handleEditFormChange("avatarUrl", "")}
                      className="text-sm font-medium text-danger active:opacity-60"
                    >
                      Supprimer la photo
                    </button>
                  ) : null}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>

                {/* Section Bannière */}
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted px-1">Bannière</p>
                  <div className="relative h-24 w-full overflow-hidden rounded-2xl border border-border/40 bg-bg">
                    {uploadingImage === 'banner' ? (
                      <div className="flex h-full items-center justify-center">
                        <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    ) : editForm.bannerUrl ? (
                      <img src={editForm.bannerUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-r from-primary/20 via-primary/5 to-transparent">
                        <span className="text-xs text-muted">Aucune bannière</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={uploadingImage === 'banner'}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 active:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-txt">
                        Modifier
                      </span>
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={uploadingImage === 'banner'}
                      className="flex-1 rounded-xl bg-bg py-3 text-sm font-medium text-txt active:bg-border/50 transition-colors disabled:opacity-50"
                    >
                      {uploadingImage === 'banner' ? 'Chargement...' : 'Changer'}
                    </button>
                    {editForm.bannerUrl ? (
                      <button
                        type="button"
                        onClick={() => handleEditFormChange("bannerUrl", "")}
                        className="flex-1 rounded-xl bg-bg py-3 text-sm font-medium text-danger active:bg-danger/10 transition-colors"
                      >
                        Supprimer
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,image/*"
                    className="hidden"
                    onChange={handleBannerUpload}
                  />
                </div>

                {/* Champs de formulaire style iOS */}
                <div className="space-y-1 rounded-2xl bg-bg overflow-hidden">
                  <label className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
                    <span className="text-sm text-muted w-20 shrink-0">Nom</span>
                    <input
                      value={editForm.displayName}
                      onChange={(event) => handleEditFormChange("displayName", event.target.value)}
                      className="flex-1 bg-transparent text-sm text-txt placeholder:text-muted/50 focus:outline-none"
                      placeholder="Votre nom"
                    />
                  </label>
                  <label className="flex items-start gap-3 px-4 py-3">
                    <span className="text-sm text-muted w-20 shrink-0 pt-0.5">Bio</span>
                    <textarea
                      rows={3}
                      value={editForm.bio}
                      onChange={(event) => handleEditFormChange("bio", event.target.value)}
                      className="flex-1 bg-transparent text-sm text-txt placeholder:text-muted/50 focus:outline-none resize-none"
                      placeholder="Décrivez-vous en quelques mots..."
                    />
                  </label>
                </div>

                {/* Espace en bas pour le safe area */}
                <div className="h-safe-bottom" />
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {currentSection === "Aperçu" ? (
        <div className="space-y-4 px-4 pt-4">
          {/* Stats en grille */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-surface p-4 text-center">
              <p className="text-2xl font-bold text-txt">{profile.xp}</p>
              <p className="text-xs text-muted mt-1">XP Total</p>
            </div>
            <div className="rounded-2xl bg-surface p-4 text-center">
              <p className="text-2xl font-bold text-txt">{profile.stats.wins}</p>
              <p className="text-xs text-muted mt-1">Victoires</p>
            </div>
            <div className="rounded-2xl bg-surface p-4 text-center">
              <p className="text-2xl font-bold text-txt">{profile.stats.losses}</p>
              <p className="text-xs text-muted mt-1">Défaites</p>
            </div>
          </div>

          {/* Progression */}
          {state.progression ? (
            <div className="rounded-2xl bg-surface p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-txt">Progression niveau {profile.level}</span>
                <span className="text-xs text-muted">{state.progression.progressToNext.toFixed(0)} / {state.progression.xpForNext} XP</span>
              </div>
              <div className="h-2 w-full rounded-full bg-border/30 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                  style={{ width: `${(state.progression.progressToNext / state.progression.xpForNext) * 100}%` }}
                />
              </div>
            </div>
          ) : null}

          {/* Section Amis */}
          <div className="rounded-2xl bg-surface overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <h2 className="text-base font-semibold text-txt">Amis</h2>
              <span className="text-sm text-muted">{profile.friends.length}</span>
            </div>
            <div className="divide-y divide-border/30">
              {displayedFriends.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted text-center">
                  {isMe ? "Ajoutez des amis pour les voir ici" : "Aucun ami"}
                </p>
              ) : (
                displayedFriends.slice(0, 5).map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {friend.avatarUrl ? (
                          <img src={friend.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          friend.displayName.slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-txt truncate">{friend.displayName}</p>
                        <p className="text-xs text-muted truncate">{friend.handle}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/profile/${friend.id}`)}
                      className="shrink-0 rounded-full bg-bg px-3 py-1.5 text-xs font-medium text-txt active:opacity-70"
                    >
                      Voir
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {currentSection === "Trophées" ? (
        <div className="px-4 pt-4">
          <Trophies userId={isMe ? undefined : profileId} showStats={true} />
        </div>
      ) : null}

      {currentSection === "Historique" ? (
        <div className="px-4 pt-4 space-y-3">
          {state.activity.length === 0 ? (
            <div className="rounded-2xl bg-surface p-6 text-center">
              <p className="text-sm text-muted">Aucune activité récente</p>
            </div>
          ) : (
            state.activity.map((item) => (
              <div key={item.id} className="rounded-2xl bg-surface p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{item.kind}</span>
                  <span className="text-xs text-muted">{formatDate(item.createdAt)}</span>
                </div>
                <p className="text-sm text-txt">{item.content}</p>
              </div>
            ))
          )}
        </div>
      ) : null}

      {currentSection === "Publications" ? (
        <div className="px-4 pt-4 space-y-3">
          {state.activity.filter((item) => item.kind === "post").length === 0 ? (
            <div className="rounded-2xl bg-surface p-6 text-center">
              <p className="text-sm text-muted">Aucune publication</p>
            </div>
          ) : (
            state.activity
              .filter((item) => item.kind === "post")
              .map((item) => (
                <div key={item.id} className="rounded-2xl bg-surface p-4">
                  <p className="text-sm text-txt">{item.content}</p>
                  <p className="mt-2 text-xs text-muted">{formatDate(item.createdAt)}</p>
                </div>
              ))
          )}
        </div>
      ) : null}
    </div>
  )
}
