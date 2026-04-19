import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch, clearTokens, getAccessToken, setTokens, setWorkspaceId } from '../api'

type UserMe = {
  id: string
  email: string
  display_name: string
  workspaces: { id: string; name: string; slug: string; role: string }[]
}

type Ctx = {
  user: UserMe | null
  loading: boolean
  refreshMe: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<Ctx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const me = (await apiFetch('/api/v1/users/me', { skipWorkspace: true })) as UserMe
      setUser(me)
      if (me.workspaces?.length && !localStorage.getItem('thmp_workspace_id')) {
        setWorkspaceId(me.workspaces[0].id)
      }
    } catch {
      clearTokens()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshMe()
  }, [refreshMe])

  const login = useCallback(
    async (email: string, password: string) => {
      const body = JSON.stringify({ email, password })
      const data = (await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body,
        skipWorkspace: true,
        skipAuth: true,
      })) as { access_token: string; refresh_token: string }
      setTokens(data.access_token, data.refresh_token)
      await refreshMe()
    },
    [refreshMe],
  )

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const body = JSON.stringify({ email, password, display_name: displayName })
      const data = (await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        body,
        skipWorkspace: true,
        skipAuth: true,
      })) as { access_token: string; refresh_token: string }
      setTokens(data.access_token, data.refresh_token)
      await refreshMe()
    },
    [refreshMe],
  )

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, refreshMe, login, register, logout }),
    [user, loading, refreshMe, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
