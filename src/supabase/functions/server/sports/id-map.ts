/**
 * ID Mapping Utilities
 * 
 * Handles canonical ID generation and mapping between different provider ID formats.
 * 
 * Providers use different ID formats:
 * - Sportsradar: "sr:team:12345", "sr:competition:8", "sr:season:105353"
 * - SportMonks: "1234", "5678" (numeric IDs)
 * 
 * We namespace them to prevent collisions and enable cross-provider operations:
 * - Sportsradar: "sportsradar:sr:team:12345"
 * - SportMonks: "sportmonks:1234"
 */

// ============================================================================
// CANONICAL ID GENERATION
// ============================================================================

/**
 * Generate a canonical ID by namespacing a provider's native ID
 * 
 * @param provider - Provider name ("sportmonks", "sportsradar", etc.)
 * @param nativeId - Provider's native ID
 * @returns Namespaced canonical ID
 * 
 * @example
 * mkKey("sportmonks", "1234") => "sportmonks:1234"
 * mkKey("sportsradar", "sr:team:5678") => "sportsradar:sr:team:5678"
 */
export const mkKey = (provider: string, nativeId: string | number): string => {
  return `${provider}:${nativeId}`;
};

/**
 * Parse a canonical ID back into its components
 * 
 * @param canonicalId - Namespaced ID
 * @returns Object with provider and native ID
 * 
 * @example
 * parseKey("sportmonks:1234") => { provider: "sportmonks", nativeId: "1234" }
 * parseKey("sportsradar:sr:team:5678") => { provider: "sportsradar", nativeId: "sr:team:5678" }
 */
export const parseKey = (canonicalId: string): { provider: string; nativeId: string } => {
  const colonIndex = canonicalId.indexOf(":");
  if (colonIndex === -1) {
    // No namespace - assume it's a raw ID
    return { provider: "unknown", nativeId: canonicalId };
  }
  
  const provider = canonicalId.substring(0, colonIndex);
  const nativeId = canonicalId.substring(colonIndex + 1);
  
  return { provider, nativeId };
};

// ============================================================================
// SPORTSRADAR ID NORMALIZATION
// ============================================================================

/**
 * Sportsradar ID types
 */
export type SportsradarIdType =
  | { kind: "season"; id: string }
  | { kind: "stage"; id: string }
  | { kind: "tournament"; id: string }
  | { kind: "competition"; id: string }
  | { kind: "team"; id: string }
  | { kind: "match"; id: string };

/**
 * Normalize Sportsradar IDs
 * 
 * Fixes common ID issues:
 * - "sr-sr:team:123" => "sr:team:123" (removes duplicate prefix)
 * - "SR:team:123" => "sr:team:123" (normalizes case)
 * 
 * @param srId - Raw Sportsradar ID
 * @returns Normalized ID with type information
 */
export function normalizeSrId(srId: string): SportsradarIdType {
  // Clean the ID
  const cleanId = srId
    .trim()
    .replace(/^sr-/, '')       // fixes "sr-sr:*" -> "sr:*"
    .replace(/^SR:/, 'sr:');   // case-normalize
  
  // Determine type
  if (cleanId.startsWith("sr:season:")) return { kind: "season", id: cleanId };
  if (cleanId.startsWith("sr:stage:")) return { kind: "stage", id: cleanId };
  if (cleanId.startsWith("sr:tournament:")) return { kind: "tournament", id: cleanId };
  if (cleanId.startsWith("sr:competition:")) return { kind: "competition", id: cleanId };
  if (cleanId.startsWith("sr:team:")) return { kind: "team", id: cleanId };
  if (cleanId.startsWith("sr:match:")) return { kind: "match", id: cleanId };
  
  // Fallback: assume it's a tournament
  console.warn(`[ID Map] Unknown Sportsradar ID format: ${srId}, treating as tournament`);
  return { kind: "tournament", id: cleanId };
}

/**
 * Get simple string ID (for backward compatibility)
 * 
 * @param id - Sportsradar ID
 * @returns Normalized ID string
 */
export function normalizeSrIdSimple(id: string): string {
  const norm = normalizeSrId(id);
  return norm.id;
}

// ============================================================================
// SPORTMONKS ID NORMALIZATION
// ============================================================================

/**
 * Parse SportMonks composite ID format
 * 
 * SportMonks uses composite IDs like "sm_leagueId_seasonId"
 * Example: "sm_501_25598" = League 501, Season 25598
 * 
 * @param compositeId - SportMonks composite ID
 * @returns Parsed components or null if invalid
 */
export function parseSmCompositeId(compositeId: string): { leagueId: string; seasonId: string } | null {
  const match = compositeId.match(/^sm_(\d+)_(\d+)$/);
  if (!match) {
    return null;
  }
  
  return {
    leagueId: match[1],
    seasonId: match[2],
  };
}

/**
 * Create SportMonks composite ID
 * 
 * @param leagueId - League ID
 * @param seasonId - Season ID
 * @returns Composite ID in format "sm_leagueId_seasonId"
 */
export function mkSmCompositeId(leagueId: string | number, seasonId: string | number): string {
  return `sm_${leagueId}_${seasonId}`;
}

// ============================================================================
// CROSS-PROVIDER ID MAPPING
// ============================================================================

/**
 * ID Mapping Table - Maps provider IDs to canonical IDs
 * 
 * In the future, this could be backed by a database table for durability.
 * For now, we generate canonical IDs on-the-fly using the namespace approach.
 */
export class IdMapper {
  private map: Map<string, string> = new Map();

  /**
   * Register a mapping from external key to canonical ID
   */
  register(provider: string, externalId: string, canonicalId: string): void {
    const key = mkKey(provider, externalId);
    this.map.set(key, canonicalId);
  }

  /**
   * Lookup canonical ID from external key
   */
  lookup(provider: string, externalId: string): string | undefined {
    const key = mkKey(provider, externalId);
    return this.map.get(key);
  }

  /**
   * Get or create canonical ID
   * If mapping exists, return it. Otherwise, generate a new canonical ID.
   */
  getOrCreate(provider: string, externalId: string): string {
    const existing = this.lookup(provider, externalId);
    if (existing) {
      return existing;
    }
    
    // Generate canonical ID by namespacing
    const canonicalId = mkKey(provider, externalId);
    this.register(provider, externalId, canonicalId);
    return canonicalId;
  }

  /**
   * Clear all mappings
   */
  clear(): void {
    this.map.clear();
  }

  /**
   * Get all mappings for a provider
   */
  getByProvider(provider: string): Map<string, string> {
    const result = new Map<string, string>();
    for (const [key, value] of this.map.entries()) {
      if (key.startsWith(`${provider}:`)) {
        const externalId = key.substring(provider.length + 1);
        result.set(externalId, value);
      }
    }
    return result;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Global ID mapper instance
 * 
 * In production, this should be replaced with a durable storage solution
 * (database table or KV store) to persist mappings across server restarts.
 */
export const globalIdMapper = new IdMapper();
