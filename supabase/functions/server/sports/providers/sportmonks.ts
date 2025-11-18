/**
 * SportMonks Provider Adapter
 * 
 * Implements the SportsProvider interface for SportMonks API (v3).
 * Translates SportMonks API responses into our canonical domain types.
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
import { mkKey } from "../id-map.ts";
import { ProviderError, UnsupportedFeatureError } from "../domain.ts";

// ============================================================================
// SPORTMONKS PROVIDER
// ============================================================================

const BASE_URL = "https://api.sportmonks.com/v3/football";

/**
 * Create SportMonks provider instance
 */
export function createSportMonksProvider(apiToken: string): SportsProvider {
  // Helper to build API URLs with pagination
  const buildUrl = (endpoint: string, params: Record<string, string> = {}): URL => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.set("api_token", apiToken);
    url.searchParams.set("per_page", "200"); // Max page size
    
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    
    return url;
  };

  // Helper to fetch from API
  const fetchApi = async (url: URL): Promise<any> => {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new ProviderError(
        "sportmonks",
        "api_request",
        `HTTP_${response.status}`,
        `SportMonks API error: ${response.status} ${response.statusText}`,
        { status: response.status, response: errorText }
      );
    }
    
    const data = await response.json();
    return data;
  };

  return {
    id: "sportmonks",
    
    caps: {
      teamsBySeason: true,
      teamStatsBySeason: true,
      standingsBySeason: true,      // ✅ Implemented with v3/v2 fallback
      seasonsByCompetition: true,
      competitionsList: true,
      matchesBySeason: false,       // Not yet implemented
      playersByTeam: false,         // Not yet implemented
    },

    // ========================================================================
    // TEAMS BY SEASON
    // ========================================================================
    async teamsBySeason(seasonId: string): Promise<Team[]> {
      console.log(`[SportMonks] Fetching teams for season ${seasonId}...`);
      
      const url = buildUrl(`/teams/seasons/${seasonId}`, {
        include: "country;venue;latest.image",
      });
      
      const data = await fetchApi(url);
      const teams = data.data || [];
      
      console.log(`[SportMonks] Fetched ${teams.length} teams`);
      
      return teams.map((t: any): Team => {
        // Extract logo URL
        let logo: string | null = null;
        if (t.image_path) {
          logo = t.image_path;
        } else if (t.latest?.image?.data?.image_path) {
          logo = t.latest.image.data.image_path;
        }

        // Extract venue
        let venue: Venue | null = null;
        if (t.venue?.data) {
          venue = {
            id: mkKey("sportmonks", String(t.venue.data.id)),
            name: t.venue.data.name || "Unknown Venue",
            city: t.venue.data.city_name || null,
            capacity: t.venue.data.capacity || null,
          };
        }

        // Build brand
        const brand: TeamBrand = {
          primary_color: "#000000",
          secondary_color: "#FFFFFF",
          logos: logo ? [{ role: "primary", url: logo }] : [],
        };

        return {
          id: mkKey("sportmonks", String(t.id)),
          ext: {
            provider: "sportmonks",
            key: String(t.id),
          },
          name: t.name,
          shortCode: t.short_code || null,
          logo: logo,
          city: t.venue?.data?.city_name || null,
          country: t.country?.data?.name || null,
          countryCode: t.country?.data?.extra?.iso_2 || null,
          founded: t.founded || null,
          venue: venue,
          brand: brand,
          manager: null, // Not provided in teams endpoint
        };
      });
    },

    // ========================================================================
    // TEAM STATS BY SEASON
    // ========================================================================
    async teamStats(teamId: string, seasonId: string): Promise<TeamStats> {
      console.log(`[SportMonks] Fetching stats for team ${teamId} in season ${seasonId}...`);
      
      // Extract numeric ID from canonical ID
      const rawId = teamId.split(":").pop() || teamId;
      const T = String(rawId);
      
      // Helper to try a URL and check if it has actual stats
      const tryJson = async (url: string) => {
        try {
          const res = await fetch(url, { headers: { accept: "application/json" } });
          const body = await res.json().catch(() => ({}));
          return { ok: res.ok, body, status: res.status, url };
        } catch (error) {
          return { ok: false, body: {}, status: 0, url };
        }
      };

      // Try multiple v3 forms and a v2 fallback (different plans expose different endpoints)
      const baseV3 = "https://api.sportmonks.com/v3/football";
      const baseV2 = "https://api.sportmonks.com/v2.0";

      const candidates: string[] = [
        // v3: team with statistics include + season filter (most common)
        `${baseV3}/teams/${T}?api_token=${apiToken}&include=statistics.details&filters=teamStatisticSeasons:${seasonId}`,
        `${baseV3}/teams/${T}?api_token=${apiToken}&include=statistics&filters=teamStatisticSeasons:${seasonId}`,

        // v3: dedicated stats routes (available on some plans)
        `${baseV3}/teams/${T}/statistics/seasons/${seasonId}?api_token=${apiToken}`,
        `${baseV3}/teams/statistics/seasons/${seasonId}/teams/${T}?api_token=${apiToken}`,

        // v2 fallback (older accounts)
        `${baseV2}/teams/${T}?api_token=${apiToken}&include=statistics&filters=teamStatisticSeasons:${seasonId}`,
        `${baseV2}/team/${T}?api_token=${apiToken}&include=statistics&filters=teamStatisticSeasons:${seasonId}`,
      ];

      // Try each candidate URL until we find stats
      for (const url of candidates) {
        const { ok, body, status } = await tryJson(url);
        if (!ok) continue;

        // Common places stats show up in SportMonks responses
        const stats =
          body?.data?.statistics ??
          body?.statistics ??
          body?.data?.[0]?.statistics ??
          null;

        // Check if we actually got stats (non-empty object or array)
        if (stats && (Array.isArray(stats) ? stats.length : Object.keys(stats).length)) {
          console.log(`[SportMonks] ✅ Found stats using: ${url.split('?')[0]}`);
          
          // Map SportMonks stats to our format
          return {
            played: stats.played || 0,
            wins: stats.wins || 0,
            draws: stats.draws || 0,
            losses: stats.losses || 0,
            points: stats.points || 0,
            goals_for: stats.goals_for || 0,
            gf: stats.goals_for || 0,
            goals_against: stats.goals_against || 0,
            ga: stats.goals_against || 0,
            goal_difference: (stats.goals_for || 0) - (stats.goals_against || 0),
            ...stats, // Include all other stats
          };
        }
      }

      // No stats found with any endpoint
      console.log(`[SportMonks] ⚠️ No stats found for team ${teamId} in season ${seasonId}`);
      return {
        _empty: true,
        note: "No team statistics found for this team/season with your plan/endpoints.",
      } as any;
    },

    // ========================================================================
    // STANDINGS BY SEASON
    // ========================================================================
    async standingsBySeason(seasonId: string): Promise<StandingEntry[]> {
      console.log(`[SportMonks] Fetching standings for season ${seasonId}...`);
      
      // Helper to try a URL and check if it has actual standings
      const tryJson = async (url: string) => {
        try {
          const res = await fetch(url, { headers: { accept: "application/json" } });
          const body = await res.json().catch(() => ({}));
          return { ok: res.ok, body, status: res.status, url };
        } catch (error) {
          return { ok: false, body: {}, status: 0, url };
        }
      };

      // Use correct SportMonks v3 standings endpoint with proper includes and per_page=200
      const url = `https://api.sportmonks.com/v3/football/standings/seasons/${seasonId}?api_token=${apiToken}&include=participant;details.type&per_page=200`;

      // Fetch standings from SportMonks API
      const { ok, body } = await tryJson(url);
      
      if (!ok) {
        console.log(`[SportMonks] ⚠️ Failed to fetch standings for season ${seasonId}`);
        return [];
      }

      // Parse SportMonks v3 standings response
      const groups = body?.data ?? [];
      const entries: StandingEntry[] = [];

      for (const group of groups) {
        const label = group.name ?? group.type ?? "overall";
        const rows = group.standings ?? [];
        
        // Only process "overall" standings (skip home/away variants)
        if (label.toLowerCase() !== "overall") continue;

        for (const row of rows) {
          // Extract participant info (team data)
          const participant = row.participant?.data ?? row.participant ?? {};
          const teamId = String(row.participant_id ?? participant.id ?? "");
          const teamName = participant.name ?? "Unknown Team";
          const teamLogo = participant.image_path ?? null;
          
          // Extract W/D/L from details array by type.id (per SportMonks API docs)
          const details = row.details?.data ?? row.details ?? [];
          let wins = 0;
          let draws = 0;
          let losses = 0;
          
          for (const detail of details) {
            const typeId = detail.type_id ?? detail.type?.data?.id ?? detail.type?.id;
            const value = detail.value ?? 0;
            
            // Type IDs per SportMonks documentation
            if (typeId === 214) wins = value;      // Type 214 = wins
            else if (typeId === 215) draws = value; // Type 215 = draws
            else if (typeId === 216) losses = value; // Type 216 = losses
          }
          
          // Map to canonical format
          entries.push({
            team: {
              id: mkKey("sportmonks", "team", teamId),
              ext: { provider: "sportmonks", key: teamId },
              name: teamName,
              short_name: participant.short_code ?? null,
              aliases: [],
            },
            stats: {
              position: row.position ?? 0,
              points: row.points ?? 0,
              played: row.games_played ?? 0,
              wins: wins,
              draws: draws,
              losses: losses,
              goals_for: row.goals_for ?? 0,
              gf: row.goals_for ?? 0,
              goals_against: row.goals_against ?? 0,
              ga: row.goals_against ?? 0,
              goal_difference: row.goal_difference ?? 0,
            },
            // Form data if available (last 5 results)
            form: row.recent_form ? row.recent_form.split("") : undefined,
          });
        }
      }

      if (entries.length) {
        console.log(`[SportMonks] ✅ Found ${entries.length} standings entries`);
        
        // Sort by position
        entries.sort((a, b) => (a.stats.position ?? 999) - (b.stats.position ?? 999));
        
        return entries;
      }

      console.log(`[SportMonks] ⚠️ No standings found for season ${seasonId}`);
      return [];
    },

    // ========================================================================
    // SEASONS BY COMPETITION
    // ========================================================================
    async seasonsByCompetition(competitionId: string): Promise<Season[]> {
      console.log(`[SportMonks] Fetching seasons for league ${competitionId}...`);
      
      // Extract numeric ID from canonical ID
      const rawId = competitionId.split(":").pop() || competitionId;
      
      const url = buildUrl(`/leagues/${rawId}`, {
        include: "seasons",
      });
      
      const data = await fetchApi(url);
      const seasons = data?.data?.seasons?.data || [];
      
      console.log(`[SportMonks] Fetched ${seasons.length} seasons`);
      
      return seasons.map((s: any): Season => ({
        id: mkKey("sportmonks", String(s.id)),
        ext: {
          provider: "sportmonks",
          key: String(s.id),
        },
        name: s.name,
        year: String(s.starting_at)?.substring(0, 4) || null,
        start_date: s.starting_at || null,
        end_date: s.ending_at || null,
        current: s.is_current || false,
      }));
    },

    // ========================================================================
    // COMPETITIONS LIST
    // ========================================================================
    async competitionsList(): Promise<Competition[]> {
      console.log(`[SportMonks] Fetching all leagues...`);
      
      const url = buildUrl("/leagues", {
        include: "country;currentSeason",
      });
      
      const data = await fetchApi(url);
      const leagues = data.data || [];
      
      console.log(`[SportMonks] Fetched ${leagues.length} leagues`);
      
      return leagues.map((l: any): Competition => ({
        id: mkKey("sportmonks", String(l.id)),
        ext: {
          provider: "sportmonks",
          key: String(l.id),
        },
        name: l.name,
        category: l.country?.data?.name || null,
        sport: "soccer",
      }));
    },
  };
}

// ============================================================================
// EXPORT DEFAULT INSTANCE CREATOR
// ============================================================================

export default createSportMonksProvider;
