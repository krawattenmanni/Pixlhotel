import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const envObj: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, string | undefined> }).env
    ? ((import.meta as { env?: Record<string, string | undefined> }).env as Record<string, string | undefined>)
    : {};

export const SUPABASE_URL =
  envObj.VITE_SUPABASE_URL || 'https://bdomjnxggrkmwmvhpotm.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  envObj.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_4JvUhfHlQ83Ln-ojR5UGSg_qE8HAsgp';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});
