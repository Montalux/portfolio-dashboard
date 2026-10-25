import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Tables } from './database.types'

type AuthState = {
  session: Session | null
  appUser: Tables<'app_user'> | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ session: null, appUser: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, appUser: null, loading: true })

  useEffect(() => {
    const load = async (session: Session | null) => {
      if (!session) {
        setState({ session: null, appUser: null, loading: false })
        return
      }
      // RLS only returns the row if the user is on the allowlist
      const { data } = await supabase
        .from('app_user')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()
      setState({ session, appUser: data, loading: false })
    }

    supabase.auth.getSession().then(({ data }) => load(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
