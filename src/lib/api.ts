const API_BASE = (import.meta as any).env?.VITE_API_URL || ''

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

function getToken() {
  return localStorage.getItem('afo_token') || ''
}

function setToken(token: string) {
  localStorage.setItem('afo_token', token)
}

async function request<T = any>(method: HttpMethod, path: string, body?: any, auth = false): Promise<T> {
  if (!API_BASE) throw new Error('VITE_API_URL is not set')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || res.statusText)
  }
  return (await res.json()) as T
}

export const api = {
  async ensureDemoToken() {
    if (getToken()) return getToken()
    const data = await request<{ accessToken: string }>('POST', '/api/v1/auth/google', { code: 'dev' })
    setToken(data.accessToken)
    return data.accessToken
  },
  getCatalog() {
    return request<{ items: any[] }>('GET', '/api/v1/games')
  },
  getSession(id: string) {
    return request<any>('GET', `/api/v1/sessions/${id}`)
  },
  listSessions(gameId: string) {
    const q = encodeURIComponent(gameId)
    return request<{ items: any[] }>('GET', `/api/v1/sessions?gameId=${q}`)
  },
  createSession(payload: { gameId: string; title?: string; type?: string; mode?: string; maxPlayers?: number; options?: any }) {
    return request<any>('POST', '/api/v1/sessions', payload, true)
  },
  joinSession(id: string) {
    return request<any>('POST', `/api/v1/sessions/${id}/join`, {}, true)
  },
  toggleReady(id: string) {
    return request<any>('POST', `/api/v1/sessions/${id}/ready`, {}, true)
  },
  startSession(id: string) {
    return request<any>('POST', `/api/v1/sessions/${id}/start`, {}, true)
  }
}

export function isBackendConfigured() {
  return Boolean(API_BASE)
}

export function getStoredToken() {
  return getToken()
}

export function getCurrentUser() {
  const token = getToken()
  if (!token) return null
  try {
    const [, payload = ''] = token.split('.')
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return { userId: json.userId as string, displayName: json.displayName as string | undefined }
  } catch (err) {
    return null
  }
}
