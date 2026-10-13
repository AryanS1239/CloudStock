import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    const { data, error } = await supabase.from('profiles').select('id,email,full_name,role').eq('id', userId).maybeSingle()
    setProfile(error ? null : data)
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      if (active) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      // Defer to avoid awaiting inside the auth callback
      setTimeout(() => loadProfile(next?.user?.id), 0)
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [loadProfile])

  const value = useMemo(() => ({
    session,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password, fullName) =>
      supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin } }),
    signOut: () => supabase.auth.signOut(),
    refreshProfile: () => loadProfile(session?.user?.id),
  }), [session, profile, loading, loadProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
