import { createClient } from '@jsr/supabase__supabase-js';
import { projectId, publicAnonKey } from './info';

/**
 * Singleton Supabase client for frontend use
 * This prevents multiple instances and the associated warnings
 */
let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey
    );
  }
  return supabaseClient;
}

// Default export for convenience
export const supabase = getSupabaseClient();
