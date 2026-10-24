import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { api } from '../lib/api'
import { translateError } from '../lib/errors'
import { signInLocal } from '../lib/localApi'
import { isCloud, supabase } from '../lib/supabaseClient'
import type { OfficeSummary, Role, Session } from '../types'

const LOCAL_SESSION_KEY = 'diwan-session'

type AppContextValue = {
  ready: boolean
  session: Session | null
  offices: OfficeSummary[]
  officesLoading: boolean
  officesError: string | null
  refreshOffices: () => Promise<void>
  signIn: (identifier: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

function defaultName(role: Role) {
  return role === 'entry' ? 'مدخل البيانات' : 'المشاهد'
}

async function sessionFromUser(user: User): Promise<Session> {
  let role: Role = user.user_metadata?.role === 'viewer' ? 'viewer' : 'entry'
  let name = String(user.user_metadata?.full_name || '')

  if (supabase) {
    const { data, error } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle()
    if (!error && data) {
      if (data.role === 'viewer' || data.role === 'entry') role = data.role
      if (data.full_name) name = String(data.full_name)
    }
  }

  const email = user.email ?? undefined
  return {
    role,
    name: name.trim() || email || defaultName(role),
    username: email?.split('@')[0],
    email,
    mode: 'cloud',
  }
}

function sameSession(prev: Session | null, next: Session) {
  return Boolean(
    prev &&
      prev.role === next.role &&
      prev.name === next.name &&
      prev.username === next.username &&
      prev.email === next.email &&
      prev.mode === next.mode,
  )
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [offices, setOffices] = useState<OfficeSummary[]>([])
  const [officesLoading, setOfficesLoading] = useState(false)
  const [officesError, setOfficesError] = useState<string | null>(null)

  const refreshOffices = useCallback(async () => {
    const list = await api.listOffices()
    setOffices(list)
    setOfficesError(null)
  }, [])

  useEffect(() => {
    let live = true
    const finish = () => {
      if (live) setReady(true)
    }

    if (!isCloud || !supabase) {
      const raw = sessionStorage.getItem(LOCAL_SESSION_KEY)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<Session>
          if ((parsed.role === 'entry' || parsed.role === 'viewer') && parsed.username) {
            setSession({
              role: parsed.role,
              name: parsed.name?.trim() || defaultName(parsed.role),
              username: parsed.username,
              mode: 'local',
            })
          } else {
            sessionStorage.removeItem(LOCAL_SESSION_KEY)
          }
        } catch {
          sessionStorage.removeItem(LOCAL_SESSION_KEY)
        }
      }
      finish()
      return () => {
        live = false
      }
    }

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!live) return
        if (data.session?.user) setSession(await sessionFromUser(data.session.user))
      })
      .catch((error) => {
        if (live) setOfficesError(translateError(error))
      })
      .finally(finish)

    const { data: auth } = supabase.auth.onAuthStateChange((_event, next) => {
      window.setTimeout(() => {
        if (!live) return
        if (!next?.user) {
          setSession(null)
          setOffices([])
          return
        }
        void sessionFromUser(next.user).then((resolved) => {
          if (!live) return
          setSession((prev) => (sameSession(prev, resolved) ? prev : resolved))
        })
      }, 0)
    })

    return () => {
      live = false
      auth.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) return
    let live = true
    setOfficesLoading(true)
    refreshOffices()
      .catch((error) => {
        if (live) setOfficesError(translateError(error))
      })
      .finally(() => {
        if (live) setOfficesLoading(false)
      })

    const unsubscribe = api.subscribe(() => {
      void refreshOffices().catch((error) => {
        if (live) setOfficesError(translateError(error))
      })
    })

    return () => {
      live = false
      unsubscribe()
    }
  }, [session, refreshOffices])

  const signIn = useCallback(async (identifier: string, password: string) => {
    if (!isCloud || !supabase) {
      const next = await signInLocal(identifier, password)
      sessionStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(next))
      setSession(next)
      return
    }
    const email = identifier.trim().toLowerCase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.includes('@') ? email : `${email}@diwan.app`,
      password,
    })
    if (error) throw new Error(translateError(error))
    if (!data.user) throw new Error('تعذر الدخول.')
    setSession(await sessionFromUser(data.user))
  }, [])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    sessionStorage.removeItem(LOCAL_SESSION_KEY)
    setSession(null)
    setOffices([])
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      session,
      offices,
      officesLoading,
      officesError,
      refreshOffices,
      signIn,
      signOut,
    }),
    [ready, session, offices, officesLoading, officesError, refreshOffices, signIn, signOut],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp خارج المزود')
  return context
}
