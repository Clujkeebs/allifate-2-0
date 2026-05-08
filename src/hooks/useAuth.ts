import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

export function useAuth() {
  const { user, session, profile, subscription, loading, initialized,
    setUser, setSession, setLoading, setInitialized, fetchProfile } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
      setInitialized(true)
    })

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id)
        setLoading(false)
      }
    )
    return () => authSub.unsubscribe()
  }, [])

  return { user, session, profile, subscription, loading, initialized }
}
