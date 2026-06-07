import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Supabase is optional — the app works fully offline without it.
// Auth and cloud sync become available once env vars are provided.
export const supabase = url && key ? createClient(url, key) : null

export const supabaseConfigured = !!supabase
