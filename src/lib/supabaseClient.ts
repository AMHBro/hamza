import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export const isCloud = Boolean(url && key)

export const supabase: SupabaseClient | null = isCloud ? createClient(url, key) : null
