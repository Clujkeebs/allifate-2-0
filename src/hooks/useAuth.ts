import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { identifyUser, resetUser } from '@/lib/monitoring'

export function useAuth() {
  const { user, session, profile, subscription, loading, initialized,
    setUser, setSession, setLoading, setInitialized, fetchProfile } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        identifyUser(session.user.id, session.user.email)
      }
      setLoading(false)
      setInitialized(true)
    })

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id)
          identifyUser(session.user.id, session.user.email)
        } else if (event === 'SIGNED_OUT') {
          resetUser()
        }
        setLoading(false)
      }
    )
    return () => authSub.unsubscribe()
  }, [fetchProfile, setInitialized, setLoading, setSession, setUser])

  return { user, session, profile, subscription, loading, initialized }
}
