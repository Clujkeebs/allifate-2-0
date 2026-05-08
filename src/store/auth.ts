import { create } from 'zustand'
import { supabase, db } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile, Subscription } from '@/types/database'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  subscription: Subscription | null
  loading: boolean
  initialized: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setSubscription: (subscription: Subscription | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  fetchProfile: (userId: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  subscription: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setSubscription: (subscription) => set({ subscription }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),

  fetchProfile: async (userId: string) => {
    const [profileRes, subRes] = await Promise.all([
      db.from('profiles').select('*').eq('id', userId).single(),
      db.from('subscriptions').select('*').eq('user_id', userId).single(),
    ])
    if (profileRes.data) set({ profile: profileRes.data as Profile })
    if (subRes.data) set({ subscription: subRes.data as Subscription })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null, subscription: null })
  },
}))
