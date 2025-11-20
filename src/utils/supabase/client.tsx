import { createClient } from '@jsr/supabase__supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey } from './config';

/**
 * Singleton Supabase client for frontend use
 * This prevents multiple instances and the associated warnings
 * 
 * Configuration priority:
 * 1. Environment variables (.env file or .env.local)
 * 2. Hardcoded values from info.tsx (fallback)
 * 
 * For local development, create a .env.local file with:
 *   VITE_SUPABASE_URL=http://localhost:54321
 *   VITE_SUPABASE_ANON_KEY=your-local-anon-key
 */
let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    
    // Log configuration in development (helps with debugging)
    // Check if import.meta exists before accessing DEV property
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
      const hasEnvVars = typeof import.meta !== 'undefined' && 
                         import.meta.env && 
                         !!import.meta.env.VITE_SUPABASE_URL;
      
      console.log('🔧 Supabase Configuration:', {
        url: url,
        usingEnvVars: hasEnvVars,
        mode: url.includes('localhost') || url.includes('127.0.0.1') ? 'LOCAL' : 'REMOTE'
      });
    }
    
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

// Default export for convenience
export const supabase = getSupabaseClient();