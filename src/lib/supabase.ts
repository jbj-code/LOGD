// src/lib/supabase.ts — browser client; URL + anon key from Vite env.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export function isSupabaseConfigured(): boolean {
  return url.length > 0 && anonKey.length > 0;
}

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('[supabase] Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }
  if (!client) {
    client = createClient(url, anonKey);
  }
  return client;
}
