import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  initialized: boolean

  // Call once from App on mount — sets up session + listener
  initialize: () => void

  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuth = create<AuthState>(set => ({
  user: null,
  initialized: false,

  initialize: () => {
    if (!supabase) {
      set({ initialized: true })
      return
    }
    // Restore existing session from storage
    void supabase.auth.getSession().then(({ data }) => {
      set({ user: data.session?.user ?? null, initialized: true })
    })
    // Keep store in sync with any future auth events (sign in, sign out, token refresh)
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null })
    })
  },

  signInWithGoogle: async () => {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  },

  signInWithApple: async () => {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    })
  },

  signInWithEmail: async (email, password) => {
    if (!supabase) throw new Error('Auth not configured.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  signUpWithEmail: async (email, password) => {
    if (!supabase) throw new Error('Auth not configured.')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut()
    set({ user: null })
  },
}))
