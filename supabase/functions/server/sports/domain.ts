/**
 * Sports Domain Contract - Provider-Agnostic Types
 * 
 * These types define the unified interface that all sports data providers
 * (Sportsradar, SportMonks, etc.) must conform to.
 */

// ============================================================================
// CORE DOMAIN TYPES
// ============================================================================

/**
 * Team - The canonical team representation used throughout the application
 */
export type Team = {
  id: string;                    // Internal canonical ID (e.g., "sportmonks:1234" or "sportsradar:sr:team:5678")
  ext: {                         // External provider reference
    provider: string;            // "sportmonks" | "sportsradar"
    key: string;                 // Raw provider ID
  };
  name: string;                  // Team name (e.g., "Manchester City FC")
  shortCode?: string | null;     // Abbreviation (e.g., "MCI")
  logo?: string | null;          // Logo URL
  city?: string | null;          // City (e.g., "Manchester")
  country?: string | null;       // Country (e.g., "England")
  countryCode?: string | null;   // ISO country code (e.g., "GB")
  founded?: number | null;       // Founded year
  venue?: Venue | null;          // Home venue
  brand?: TeamBrand | null;      // Branding (colors, logos)
  manager?: string | null;       // Current manager
};

/**
 * Team Brand - Visual identity
 */
export type TeamBrand = {
  primary_color: string;         // Hex color (e.g., "#6CABDD")
  secondary_color: string;       // Hex color (e.g., "#1C2C5B")
  logos: Array<{
    role: string;                // "primary" | "secondary" | "icon"
    url: string;                 // Logo URL
  }>;
};

/**
 * Venue - Stadium/arena information
 */
export type Venue = {
  id: string;
  name: string;
  city?: string | null;
  capacity?: number | null;
};

/**
 * Team Statistics - Flexible stats object
 */
export type TeamStats = {
  played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  points?: number;
  goals_for?: number;
  gf?: number;
  goals_against?: number;
  ga?: number;
  goal_difference?: number;
  position?: number;
  // Allow additional provider-specific stats
  [key: string]: unknown;
};

/**
 * Season - Competition season information
 */
export type Season = {
  id: string;                    // Canonical season ID
  ext: {
    provider: string;
    key: string;
  };
  name: string;                  // e.g., "2024/2025"
  year?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  current?: boolean;
};

/**
 * Competition/League - Tournament information
 */
export type Competition = {
  id: string;                    // Canonical competition ID
  ext: {
    provider: string;
    key: string;
  };
  name: string;                  // e.g., "Premier League"
  category?: string | null;      // e.g., "England", "International"
  sport?: string | null;         // e.g., "soccer", "basketball"
};

/**
 * Standing Entry - Single row in a league table
 */
export type StandingEntry = {
  team: Team;
  stats: TeamStats;
  form?: string[];               // Last 5 results: ["W", "W", "D", "L", "W"]
};

// ============================================================================
// PROVIDER CAPABILITY SYSTEM
// ============================================================================

/**
 * Provider Capabilities - Declares what features each provider supports
 * 
 * This enables graceful degradation and clear error messages when a feature
 * is not available from a particular provider.
 */
export type ProviderCaps = {
  teamsBySeason: boolean;        // Can fetch teams for a season
  teamStatsBySeason: boolean;    // Can fetch detailed stats for a team
  standingsBySeason: boolean;    // Can fetch league standings
  seasonsByCompetition: boolean; // Can list seasons for a competition
  competitionsList: boolean;     // Can list all available competitions
  matchesBySeason: boolean;      // Can fetch match schedule/results
  playersByTeam: boolean;        // Can fetch team roster
};

// ============================================================================
// PROVIDER INTERFACE
// ============================================================================

/**
 * SportsProvider - The contract that all provider adapters must implement
 * 
 * This interface defines the methods that the application can call.
 * Each provider adapter translates these calls into provider-specific API requests.
 */
export interface SportsProvider {
  id: string;                                    // "sportmonks" | "sportsradar" | "espn" | etc.
  caps: ProviderCaps;                            // Declare supported features
  
  // Core team data
  teamsBySeason(seasonId: string): Promise<Team[]>;
  teamStats(teamId: string, seasonId: string): Promise<TeamStats>;
  
  // Standings
  standingsBySeason?(seasonId: string): Promise<StandingEntry[]>;
  
  // Season/Competition discovery
  seasonsByCompetition?(competitionId: string): Promise<Season[]>;
  competitionsList?(): Promise<Competition[]>;
  
  // Optional: Matches
  matchesBySeason?(seasonId: string, teamId?: string): Promise<any[]>;
  
  // Optional: Players
  playersByTeam?(teamId: string): Promise<any[]>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Provider Error - Standardized error for provider operations
 */
export class ProviderError extends Error {
  constructor(
    public provider: string,
    public feature: string,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/**
 * Unsupported Feature Error - Thrown when a provider doesn't support a feature
 */
export class UnsupportedFeatureError extends ProviderError {
  constructor(provider: string, feature: string) {
    super(
      provider,
      feature,
      "UNSUPPORTED_FEATURE",
      `Provider "${provider}" does not support feature: ${feature}`
    );
    this.name = "UnsupportedFeatureError";
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Provider Config - Configuration stored for each provider
 */
export type ProviderConfig = {
  id: string;
  name: string;
  type: string;                  // "sportmonks" | "sportsradar"
  sport: string;                 // "soccer" | "basketball"
  apiKey: string;
  apiSecret?: string | null;
  baseUrl: string;
  selectedLeagues: string[];     // Competition IDs enabled for this provider
  isActive: boolean;
  accessLevel?: string;          // "trial" | "production"
  locale?: string;               // "en" | "es" | etc.
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string | null;
};

/**
 * Sync Result - Result of a provider sync operation
 */
export type SyncResult = {
  provider: string;
  competitions: number;
  teams: number;
  errors: number;
  duration_ms: number;
};
