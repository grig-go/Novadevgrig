/**
 * Sportsradar Provider Adapter
 * 
 * Implements the SportsProvider interface for Sportsradar API (v3/v4).
 * Translates Sportsradar API responses into our canonical domain types.
 */

import type {
  SportsProvider,
  Team,
  TeamStats,
  StandingEntry,
  Season,
  Competition,
  TeamBrand,
  Venue,
} from "../domain.ts";
import { mkKey, normalizeSrId, normalizeSrIdSimple } from "../id-map.ts";
import { ProviderError, UnsupportedFeatureError } from "../domain.ts";

// ============================================================================
// SPORTSRADAR PROVIDER
// ============================================================================

/**
 * Create Sportsradar provider instance
 */
export function createSportsradarProvider(
  apiKey: string,
  options: {
    accessLevel?: string;  // "trial" | "production"
    locale?: string;       // "en" | "es" | etc.
    baseUrl?: string;      // Override base URL
  } = {}
): SportsProvider {
  const accessLevel = options.accessLevel || "trial";
  const locale = options.locale || "en";
  const baseUrl = options.baseUrl || "https://api.sportradar.com/soccer";

  // Helper to fetch with version fallback (v4 -> v3)
  const fetchWithVersionFallback = async (endpoint: string): Promise<any> => {
    const versions = ["v4", "v3"];
    const errors: Array<{ version: string; error: string }> = [];

    for (const version of versions) {
      const url = `${baseUrl}/${accessLevel}/${version}/${locale}${endpoint}?api_key=${apiKey}`;
      console.log(`[Sportsradar] Trying ${version}: ${url.replace(apiKey, "***")}`);

      try {
        const response = await fetch(url);

        if (response.ok) {
          console.log(`[Sportsradar] ✅ ${version} succeeded`);
          return await response.json();
        }

        // Handle 403 Forbidden (Authentication Error)
        if (response.status === 403) {
          const errorText = await response.text();
          throw new ProviderError(
            "sportsradar",
            endpoint,
            "AUTH_ERROR",
            `Authentication failed (403 Forbidden). Please verify your API key.`,
            { status: 403, response: errorText }
          );
        }

        // 404 - try next version
        if (response.status === 404) {
          const errorText = await response.text();
          errors.push({ version, error: `404 - ${errorText}` });
          console.log(`[Sportsradar] ❌ ${version} returned 404, trying next version...`);
          continue;
        }

        // Other errors - throw immediately
        const errorText = await response.text();
        throw new ProviderError(
          "sportsradar",
          endpoint,
          `HTTP_${response.status}`,
          `Sportsradar API error: ${response.status} ${response.statusText}`,
          { status: response.status, response: errorText }
        );
      } catch (error) {
        // Re-throw ProviderError
        if (error instanceof ProviderError) {
          throw error;
        }

        // Log and try next version for other errors
        errors.push({ version, error: String(error) });
        console.error(`[Sportsradar] ❌ ${version} failed:`, error);
      }
    }

    // All versions failed
    throw new ProviderError(
      "sportsradar",
      endpoint,
      "ALL_VERSIONS_FAILED",
      `No valid API version found for ${endpoint}. Tried: ${versions.join(", ")}`,
      { errors }
    );
  };

  // Helper to sleep (rate limiting)
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return {
    id: "sportsradar",

    caps: {
      teamsBySeason: true,
      teamStatsBySeason: true,
      standingsBySeason: true,
      seasonsByCompetition: true,
      competitionsList: false,      // Not commonly used
      matchesBySeason: false,       // Not yet implemented
      playersByTeam: false,         // Not yet implemented
    },

    // ========================================================================
    // TEAMS BY SEASON
    // ========================================================================
    async teamsBySeason(seasonId: string): Promise<Team[]> {
      console.log(`[Sportsradar] Fetching teams for season ${seasonId}...`);

      // Normalize ID
      const normalized = normalizeSrId(seasonId);
      console.log(`[Sportsradar] Normalized ID:`, normalized);

      // Use /seasons/{id}/competitors.json endpoint
      const endpoint = `/seasons/${normalized.id}/competitors.json`;
      const data = await fetchWithVersionFallback(endpoint);

      // Extract teams from response
      const competitors = data?.season_competitors || [];
      console.log(`[Sportsradar] Fetched ${competitors.length} teams`);

      return competitors.map((c: any): Team => {
        // Extract branding
        const brand: TeamBrand = {
          primary_color: c.jersey?.primary || "#000000",
          secondary_color: c.jersey?.secondary || "#FFFFFF",
          logos: [],
        };

        // Add logo if available
        if (c.logo) {
          brand.logos.push({ role: "primary", url: c.logo });
        }

        return {
          id: mkKey("sportsradar", c.id),
          ext: {
            provider: "sportsradar",
            key: c.id,
          },
          name: c.name,
          shortCode: c.abbreviation || c.short_name || null,
          logo: c.logo || null,
          city: c.country || null,
          country: c.country || null,
          countryCode: c.country_code || null,
          founded: null, // Not in competitors endpoint
          venue: null,   // Not in competitors endpoint
          brand: brand,
          manager: null, // Not in competitors endpoint
        };
      });
    },

    // ========================================================================
    // TEAM STATS BY SEASON
    // ========================================================================
    async teamStats(teamId: string, seasonId: string): Promise<TeamStats> {
      console.log(`[Sportsradar] Fetching stats for team ${teamId} in season ${seasonId}...`);

      // Extract raw Sportsradar ID
      const rawId = teamId.split(":").slice(-3).join(":"); // Get "sr:team:123" from "sportsradar:sr:team:123"

      // Fetch team profile
      const endpoint = `/competitors/${rawId}/profile.json`;
      
      try {
        const data = await fetchWithVersionFallback(endpoint);
        
        // Extract statistics if available
        const stats: TeamStats = {
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          points: 0,
          goals_for: 0,
          gf: 0,
          goals_against: 0,
          ga: 0,
          goal_difference: 0,
        };

        // Sportsradar profile endpoint doesn't include season-specific stats
        // Would need to call standings endpoint or match history
        console.log(`[Sportsradar] Team profile fetched (stats not included in this endpoint)`);

        return stats;
      } catch (error) {
        console.error(`[Sportsradar] Error fetching team stats:`, error);
        return {
          _error: true,
          message: String(error),
        } as any;
      }
    },

    // ========================================================================
    // STANDINGS BY SEASON
    // ========================================================================
    async standingsBySeason(seasonId: string): Promise<StandingEntry[]> {
      console.log(`[Sportsradar] Fetching standings for season ${seasonId}...`);

      // Normalize ID
      const normalized = normalizeSrId(seasonId);
      let endpoint: string;

      if (normalized.kind === "season") {
        endpoint = `/seasons/${normalized.id}/standings.json`;
      } else if (normalized.kind === "stage") {
        endpoint = `/stages/${normalized.id}/standings.json`;
      } else {
        // For competition/tournament, need to resolve to current season first
        throw new ProviderError(
          "sportsradar",
          "standingsBySeason",
          "INVALID_ID_TYPE",
          `Cannot fetch standings for ${normalized.kind} ID. Please provide a season or stage ID.`,
          { providedId: seasonId, normalized }
        );
      }

      const data = await fetchWithVersionFallback(endpoint);

      // Extract standings
      const standings = data?.standings || [];
      const entries: StandingEntry[] = [];

      for (const standing of standings) {
        const groups = standing.groups || [];
        
        for (const group of groups) {
          const teamStandings = group.team_standings || [];
          
          for (const ts of teamStandings) {
            const competitor = ts.team;
            
            // Build team
            const team: Team = {
              id: mkKey("sportsradar", competitor.id),
              ext: {
                provider: "sportsradar",
                key: competitor.id,
              },
              name: competitor.name,
              shortCode: competitor.abbreviation || null,
              logo: null,
              city: null,
              country: competitor.country || null,
              countryCode: competitor.country_code || null,
              founded: null,
              venue: null,
              brand: null,
              manager: null,
            };

            // Build stats
            const stats: TeamStats = {
              played: ts.played || 0,
              wins: ts.win || 0,
              draws: ts.draw || 0,
              losses: ts.loss || 0,
              points: ts.points || 0,
              goals_for: ts.goals_for || 0,
              gf: ts.goals_for || 0,
              goals_against: ts.goals_against || 0,
              ga: ts.goals_against || 0,
              goal_difference: ts.goal_diff || 0,
              position: ts.rank || 0,
            };

            entries.push({
              team,
              stats,
              form: [], // Form data not included in standings endpoint
            });
          }
        }
      }

      console.log(`[Sportsradar] Fetched ${entries.length} standing entries`);
      return entries;
    },

    // ========================================================================
    // SEASONS BY COMPETITION
    // ========================================================================
    async seasonsByCompetition(competitionId: string): Promise<Season[]> {
      console.log(`[Sportsradar] Fetching seasons for competition ${competitionId}...`);

      // Normalize ID
      const normalized = normalizeSrId(competitionId);

      // Use /tournaments/ endpoint for both competition and tournament IDs
      const endpoint = `/tournaments/${normalized.id}/seasons.json`;
      const data = await fetchWithVersionFallback(endpoint);

      const seasons = data?.seasons || [];
      console.log(`[Sportsradar] Fetched ${seasons.length} seasons`);

      return seasons.map((s: any): Season => ({
        id: mkKey("sportsradar", s.id),
        ext: {
          provider: "sportsradar",
          key: s.id,
        },
        name: s.name,
        year: s.year || null,
        start_date: s.start_date || null,
        end_date: s.end_date || null,
        current: s.current || false,
      }));
    },
  };
}

// ============================================================================
// EXPORT DEFAULT INSTANCE CREATOR
// ============================================================================

export default createSportsradarProvider;
