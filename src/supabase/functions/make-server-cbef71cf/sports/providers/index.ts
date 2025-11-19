/**
 * Provider Registry
 * 
 * Central registry for all sports data providers.
 * Handles provider instantiation, capability checking, and routing.
 */

import type { SportsProvider, ProviderConfig } from "../domain.ts";
import { UnsupportedFeatureError } from "../domain.ts";

// Minimal stubs - full providers are in /supabase/functions/server/sports/providers/

// ============================================================================
// PROVIDER FACTORY
// ============================================================================

/**
 * Create a provider instance from configuration
 * 
 * @param config - Provider configuration
 * @returns Initialized SportsProvider instance
 */
export function createProvider(config: ProviderConfig): SportsProvider {
  throw new Error("Provider creation not configured in make-server-cbef71cf stub");
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get provider from config ID
 * 
 * @param configId - Provider config ID
 * @param config - Provider configuration
 * @returns SportsProvider instance
 */
export function getOrCreateProvider(configId: string, config?: ProviderConfig): SportsProvider | null {
  return null;
}
