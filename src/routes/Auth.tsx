import React from "react"
import { useNavigate } from "react-router-dom"
import { api, AuthUser, isApiError } from "../lib/api"
import { Mail, Lock, LogIn, User, RefreshCw } from "lucide-react"
import { useAppStore } from "../store/app"

declare global {
  interface Window {
    google?: any
  }
}

function TextField({
  id,
  label,
  type,
  value,
  onChange,
  required = true
}: {
  id: string
  label: string
  type: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
        {type === "email" ? <Mail className="h-4 w-4" /> : type === "password" ? <Lock className="h-4 w-4" /> : <User className="h-4 w-4" />}
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 w-full rounded-2xl border border-border/60 bg-bg px-4 py-3 text-sm text-txt focus:border-primary focus:outline-none"
      />
    </div>
  )
}

export default function Auth() {
  const navigate = useNavigate()
  const setUser = useAppStore((state) => state.setUser)
  const enterAsGuest = useAppStore((state) => state.enterAsGuest)
  const [mode, setMode] = React.useState<"login" | "register">("login")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [displayName, setDisplayName] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [info, setInfo] = React.useState<string | null>(null)
  const [showReset, setShowReset] = React.useState(false)
  const [resetToken, setResetToken] = React.useState("")
  const [resetPasswordValue, setResetPasswordValue] = React.useState("")

  React.useEffect(() => {
    if (!api.isAuthenticated()) return
    api
      .getCurrentProfile()
      .then((profile) => {
        if (profile) {
          setUser(profile)
          navigate("/home")
        }
      })
      .catch((err) => {
        if (isApiError(err) && err.status === 401) {
          api.logout()
          setUser(null)
          return
        }
        console.warn("Unable to retrieve current profile", err)
      })
  }, [navigate, setUser])

  const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined
  const [googleReady, setGoogleReady] = React.useState(false)

  React.useEffect(() => {
    if (!googleClientId) return
    let cancelled = false
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.onload = () => {
      if (cancelled) return
      const google = window.google
      if (!google?.accounts?.id) return
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: any) => {
          if (response?.error) {
            setError(
              `Google sign-in failed (${response.error}). Verifiez que http://localhost:5173 figure dans les origines autorisees de votre console Google.`
            )
            return
          }
          if (!response?.credential) {
            setError("Google n'a pas renvoye de jeton. Verifiez la configuration OAuth.")
            return
          }
          try {
            const user = await api.loginWithGoogle({ idToken: response.credential })
            handleSuccess(user)
          } catch (err: any) {
            if (isApiError(err) && err.status === 503) {
              setError("Google OAuth n'est pas configure sur le serveur.")
              return
            }
            setError(err?.message || "Google sign-in failed")
          }
        },
        ux_mode: "popup"
      })
      setGoogleReady(true)
    }
    script.onerror = () => {
      if (cancelled) return
      setError("Impossible de charger les services Google. Verifiez votre connexion.")
    }
    document.body.appendChild(script)
    return () => {
      cancelled = true
      document.body.removeChild(script)
    }
  }, [googleClientId])

  function handleSuccess(user: AuthUser) {
    setUser(user)
    setError(null)
    setInfo(null)
    navigate("/home")
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setInfo(null)
    try {
      setLoading(true)
      let user: AuthUser
      if (mode === "register") {
        user = await api.register({ email, password, displayName })
      } else {
        user = await api.login({ email, password })
      }
      handleSuccess(user)
    } catch (err: any) {
      if (isApiError(err)) {
        if (err.status === 401) {
          setError("Email ou mot de passe incorrect.")
        } else if (err.status === 0 || err.status >= 500) {
          setError("Serveur inaccessible. Vérifie que l'API (port 3001) est lancée.")
        } else {
          setError(err.message || "Échec de l'authentification")
        }
      } else {
        setError(err?.message || "Échec de l'authentification")
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Entre d'abord ton email")
      return
    }
    try {
      setError(null)
      await api.forgotPassword(email)
      setInfo("Jeton de réinitialisation généré (voir console backend). Utilise le formulaire ci-dessous pour définir un nouveau mot de passe.")
      setShowReset(true)
    } catch (err: any) {
      if (isApiError(err) && (err.status === 0 || err.status >= 500)) {
        setError("Serveur inaccessible. Vérifie que l'API (port 3001) est lancée.")
        return
      }
      setError(err?.message || "Impossible d'envoyer l'email de réinitialisation")
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setError(null)
      await api.resetPassword({ token: resetToken, password: resetPasswordValue })
      setInfo("Mot de passe mis à jour. Tu peux maintenant te connecter.")
      setShowReset(false)
      setMode("login")
    } catch (err: any) {
      if (isApiError(err) && (err.status === 0 || err.status >= 500)) {
        setError("Serveur inaccessible. Vérifie que l'API est lancée.")
        return
      }
      setError(err?.message || "Impossible de réinitialiser le mot de passe")
    }
  }

  const handleGoogleLogin = React.useCallback(() => {
    if (!googleClientId) {
      setError("Google OAuth non configuré")
      return
    }
    if (!googleReady) {
      setError("Services Google pas encore prêts. Réessaye dans une seconde.")
      return
    }
    const google = window.google
    if (!google?.accounts?.id) {
      setError("Services Google non disponibles")
      return
    }
    setError(null)
    google.accounts.id.prompt()
  }, [googleClientId, googleReady])

  function handleEnterGuest() {
    api.logout()
    enterAsGuest("Guest")
    navigate("/home")
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-10 bg-bg px-6 py-10">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-muted">AllForOne</p>
        <h1 className="mt-2 text-3xl font-semibold text-txt">Bon retour !</h1>
        <p className="mt-3 text-sm text-muted">
          Crée un compte ou connecte-toi pour synchroniser ta progression et jouer avec la communauté.
        </p>
      </header>

      {error && <p className="rounded-2xl bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>}
      {info && <p className="rounded-2xl bg-primary/10 px-4 py-2 text-sm text-primary">{info}</p>}

      <section className="space-y-3">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={!googleClientId || !googleReady}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border/80 bg-surface py-3 text-sm font-semibold text-txt transition hover:border-primary/60 hover:text-primary focus-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogIn className="h-5 w-5" />
          Continuer avec Google
        </button>
      </section>

      <div className="relative flex items-center gap-3 text-xs text-muted">
        <span className="flex-1 border-t border-border/60" aria-hidden />
        <span aria-label="ou">ou</span>
        <span className="flex-1 border-t border-border/60" aria-hidden />
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login")
            setError(null)
            setInfo(null)
          }}
          className="text-sm font-semibold text-primary hover:underline focus-ring"
        >
          {mode === "login" ? 'Créer un compte' : 'Déjà inscrit ? Connexion'}
        </button>
        <button type="button" onClick={handleForgotPassword} className="text-sm font-semibold text-muted hover:text-primary focus-ring">
          Mot de passe oublié ?
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-border/70 bg-surface p-5 shadow-soft">
        {mode === "register" && (
          <TextField id="display-name" label="Nom d'affichage" type="text" value={displayName} onChange={setDisplayName} />
        )}
        <TextField id="email" label="Email" type="email" value={email} onChange={setEmail} />
        <TextField id="password" label="Mot de passe" type="password" value={password} onChange={setPassword} />

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-base font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring disabled:cursor-not-allowed disabled:bg-primary/50"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {mode === "register" ? 'Créer le compte' : 'Se connecter'}
        </button>
      </form>

      {showReset ? (
        <form onSubmit={handleResetPassword} className="space-y-3 rounded-3xl border border-border/60 bg-bg px-4 py-3">
          <p className="text-sm text-muted">Colle le jeton de réinitialisation affiché dans les logs du backend, puis choisis un nouveau mot de passe.</p>
          <TextField id="reset-token" label="Jeton de réinitialisation" type="text" value={resetToken} onChange={setResetToken} />
          <TextField
            id="reset-password"
            label="Nouveau mot de passe"
            type="password"
            value={resetPasswordValue}
            onChange={setResetPasswordValue}
          />
          <button type="submit" className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring">
            Mettre à jour le mot de passe
          </button>
        </form>
      ) : null}

      <button
        type="button"
        onClick={handleEnterGuest}
        className="self-center text-sm font-medium text-muted transition hover:text-primary focus-ring"
      >
        Continuer en invité
      </button>
    </div>
  )
}



