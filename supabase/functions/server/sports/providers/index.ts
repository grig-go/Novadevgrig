/**
 * Provider Registry
 * 
 * Central registry for all sports data providers.
 * Handles provider instantiation, capability checking, and routing.
 */

import type { SportsProvider, ProviderConfig } from "../domain.ts";
import { UnsupportedFeatureError } from "../domain.ts";
import createSportMonksProvider from "./sportmonks.ts";
import createSportsradarProvider from "./sportsradar.ts";

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
  const providerType = config.type.toLowerCase();

  switch (providerType) {
    case "sportmonks":
      return createSportMonksProvider(config.apiKey);

    case "sportsradar":
      return createSportsradarProvider(config.apiKey, {
        accessLevel: config.accessLevel,
        locale: config.locale,
        baseUrl: config.baseUrl,
      });

    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}

// ============================================================================
// PROVIDER REGISTRY
// ============================================================================

/**
 * Provider Registry - Manages active provider instances
 */
export class ProviderRegistry {
  private providers: Map<string, SportsProvider> = new Map();

  /**
   * Register a provider instance
   */
  register(id: string, provider: SportsProvider): void {
    this.providers.set(id, provider);
    console.log(`[Registry] Registered provider: ${id} (${provider.id})`);
  }

  /**
   * Get a provider by ID
   */
  get(id: string): SportsProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get a provider or throw error if not found
   */
  getOrThrow(id: string): SportsProvider {
    const provider = this.get(id);
    if (!provider) {
      throw new Error(`Provider not found: ${id}`);
    }
    return provider;
  }

  /**
   * List all registered providers
   */
  list(): SportsProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Unregister a provider
   */
  unregister(id: string): boolean {
    return this.providers.delete(id);
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear();
  }

  /**
   * Get the count of registered providers
   */
  get size(): number {
    return this.providers.size;
  }
}

// ============================================================================
// CAPABILITY CHECKING
// ============================================================================

/**
 * Check if a provider type supports a feature
 * 
 * @param providerType - Provider type ("sportmonks", "sportsradar", etc.)
 * @param feature - Feature name
 * @returns true if supported, false otherwise
 */
export function providerSupportsFeature(providerType: string, feature: string): boolean {
  const type = providerType.toLowerCase();

  // Feature support matrix
  const capabilities: Record<string, Set<string>> = {
    sportmonks: new Set([
      "teamsBySeason",
      "teamStatsBySeason",
      "seasonsByCompetition",
      "competitionsList",
    ]),
    sportsradar: new Set([
      "teamsBySeason",
      "teamStatsBySeason",
      "standingsBySeason",
      "seasonsByCompetition",
    ]),
  };

  const providerCaps = capabilities[type];
  if (!providerCaps) {
    return false;
  }

  return providerCaps.has(feature);
}

/**
 * Assert that a provider supports a feature (throws if not)
 * 
 * @param provider - Provider instance
 * @param feature - Feature name
 * @throws UnsupportedFeatureError if feature is not supported
 */
export function assertFeatureSupport(provider: SportsProvider, feature: keyof SportsProvider["caps"]): void {
  if (!provider.caps[feature]) {
    throw new UnsupportedFeatureError(provider.id, feature);
  }
}

// ============================================================================
// SINGLETON REGISTRY
// ============================================================================

/**
 * Global provider registry instance
 */
export const globalRegistry = new ProviderRegistry();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get provider from config ID
 * 
 * Looks up the provider in the global registry, or creates a new instance
 * if not found.
 * 
 * @param configId - Provider config ID
 * @param config - Provider configuration
 * @returns SportsProvider instance
 */
export function getOrCreateProvider(configId: string, config: ProviderConfig): SportsProvider {
  let provider = globalRegistry.get(configId);
  
  if (!provider) {
    provider = createProvider(config);
    globalRegistry.register(configId, provider);
  }
  
  return provider;
}

/**
 * Get active provider by type
 * 
 * @param providerType - Provider type ("sportmonks", "sportsradar")
 * @returns First matching provider or undefined
 */
export function getProviderByType(providerType: string): SportsProvider | undefined {
  const providers = globalRegistry.list();
  return providers.find(p => p.id === providerType.toLowerCase());
}
