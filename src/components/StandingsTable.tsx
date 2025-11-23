import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Trophy, TrendingUp, TrendingDown, Users } from "lucide-react";
import { StandingsTable as StandingsTableType, StandingsRow, StandingsGroup } from "../types/sports";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface StandingsTableProps {
  leagueId: string;
  leagueName: string;
}

export function StandingsTable({ leagueId, leagueName }: StandingsTableProps) {
  const [standings, setStandings] = useState<StandingsTableType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStandings();
  }, [leagueId]);

  const fetchStandings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all teams first to build lookup map
      const teamsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sports_dashboard/sports-data/teams`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      let teamsById: Record<number, { name: string; logo?: string }> = {};
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json();
        console.log("[Standings] Fetched teams:", teamsData.teams?.length || 0);
        
        // Log first team structure to understand format
        if (teamsData.teams && teamsData.teams.length > 0) {
          console.log("[Standings] First team sample:", JSON.stringify(teamsData.teams[0], null, 2));
        }
        
        // Build lookup map by team ID
        if (teamsData.teams) {
          teamsData.teams.forEach((t: any) => {
            // For SportMonks teams, use the numeric sm_id from providers
            const smId = t.providers?.sportmonks?.sm_id;
            if (smId) {
              const numericId = parseInt(smId);
              teamsById[numericId] = {
                name: t.name || "Unknown Team",
                logo: t.brand?.logos?.[0]?.url || null
              };
              console.log(`[Standings] Mapped SportMonks team: ${numericId} -> "${t.name}"`);
            }
            
            // Also try Sportsradar format (sr:team:123)
            const srId = t.entity?.id;
            if (srId && typeof srId === 'string' && srId.startsWith('sr:')) {
              const teamName = t.entity?.name || "Unknown Team";
              const teamLogo = t.entity?.brand?.logos?.[0]?.url || t.entity?.logo || null;
              teamsById[srId] = {
                name: teamName,
                logo: teamLogo
              };
            }
          });
        }
        console.log("[Standings] Built teams lookup with", Object.keys(teamsById).length, "teams");
        console.log("[Standings] Sample team IDs:", Object.keys(teamsById).slice(0, 5));
      } else {
        console.error("[Standings] Failed to fetch teams:", teamsResponse.status);
      }

      // Fetch standings
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sports_dashboard/sports/standings/${leagueId}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        
        // Check for unsupported feature (501 Not Implemented)
        if (response.status === 501 && errorData.code === "UNSUPPORTED_FEATURE") {
          console.warn(`Feature "${errorData.feature}" not supported by provider "${errorData.provider}"`);
          throw new Error(errorData.message || errorData.error || "This feature is not supported by the current data provider");
        }
        
        const errorMsg = errorData.error || errorData.details || response.statusText;
        console.error("Failed to fetch standings:", errorData);
        
        // Log debug info if available
        if (errorData.debug) {
          console.error("Debug info:", {
            requestedLeagueId: errorData.debug.requestedLeagueId,
            totalTeamsInDB: errorData.debug.totalTeams,
            availableLeagueIds: errorData.debug.availableLeagueIds
          });
        }
        
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log("[Standings] Raw response:", data);
      
      // Check if response has an error field even with 200 status
      if (data.error) {
        throw new Error(data.error);
      }

      // Handle SportMonks flat array format
      if (data.table && Array.isArray(data.table)) {
        console.log("[Standings] Detected SportMonks flat format, enriching with team names...");
        
        // Filter to latest round to avoid duplicates
        const latestRound = Math.max(...data.table.map((r: any) => r.round_id ?? 0));
        console.log("[Standings] Latest round:", latestRound);
        
        const latestRows = data.table.filter((r: any) => r.round_id === latestRound);
        console.log("[Standings] Filtered to", latestRows.length, "rows from latest round");
        
        // Dedupe per team (keep highest points)
        const byTeam: Record<string, any> = {};
        for (const row of latestRows) {
          const teamId = String(row.team_id);
          if (!byTeam[teamId] || (row.points ?? -1) > (byTeam[teamId].points ?? -1)) {
            byTeam[teamId] = row;
          }
        }
        
        // Enrich with team names and logos
        console.log("[Standings] About to enrich. First 3 team_ids from standings:", 
          Object.keys(byTeam).slice(0, 3).map(id => parseInt(id)));
        console.log("[Standings] First 3 IDs in teamsById:", 
          Object.keys(teamsById).slice(0, 3).map(id => parseInt(id)));
        
        const enriched = Object.values(byTeam).map((row: any) => {
          const teamData = teamsById[row.team_id];
          console.log(`[Standings] Looking up team ${row.team_id}:`, teamData ? `Found: ${teamData.name}` : "NOT FOUND");
          
          return {
            ...row,
            team_name: teamData?.name ?? `Team ${row.team_id}`,
            logo: teamData?.logo ?? null
          };
        });
        
        // Sort by position
        enriched.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
        
        console.log("[Standings] Enriched standings (first 3):", enriched.slice(0, 3).map(r => ({
          team_id: r.team_id,
          team_name: r.team_name,
          position: r.position,
          points: r.points
        })));
        
        // Convert to grouped format for UI
        const convertedData = {
          provider: data.provider,
          groups: [
            {
              id: "main",
              name: "Overall",
              rows: enriched.map((row: any) => ({
                team_id: row.team_id,
                team_name: row.team_name,
                team_logo: row.logo,
                abbrev: null,
                rank: row.position ?? 0,
                points: row.points ?? 0,
                record: {
                  wins: row.won ?? 0,
                  draws: row.draw ?? 0,
                  losses: row.lost ?? 0,
                  played: row.played ?? 0,
                  formatted: `${row.won ?? 0}-${row.draw ?? 0}-${row.lost ?? 0}`
                },
                gf: row.goals_for ?? 0,
                ga: row.goals_against ?? 0,
                gd: row.goal_diff ?? 0,
                form: {
                  L5: [] // Not available from this tier
                }
              }))
            }
          ],
          last_updated: new Date().toISOString()
        };
        
        setStandings(convertedData);
        return;
      }
      
      // Handle standard grouped format (Sportsradar)
      if (data.groups) {
        console.log(`[Standings] Standard grouped format: ${data.groups.length} groups`);
        data.groups.forEach((group: any, idx: number) => {
          console.log(`Group ${idx}: "${group.name}" has ${group.rows?.length || 0} rows`);
          if (group.rows && group.rows.length > 0) {
            console.log(`  First row sample:`, group.rows[0]);
          }
        });
      }
      
      setStandings(data);
    } catch (err) {
      console.error("Error fetching standings:", err);
      setError(err instanceof Error ? err.message : "Failed to load standings");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading standings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="p-6">
          <div className="text-center space-y-3">
            <p className="text-red-600 dark:text-red-400">Error: {error}</p>
            <button
              onClick={fetchStandings}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!standings || !standings.groups || standings.groups.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No standings data available for this league.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-primary" />
        <h2 className="text-2xl">{leagueName} Standings</h2>
      </div>

      {/* Groups */}
      {standings.groups.map((group) => (
        <div key={group.id} className="space-y-4">
          {standings.groups.length > 1 && (
            <h3 className="text-xl flex items-center gap-2">
              <Badge variant="outline">{group.name}</Badge>
            </h3>
          )}

          {/* Standings Rows - 3 Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.rows.map((row, rowIndex) => (
              <StandingCard key={`${group.id}-${row.team_id || rowIndex}`} row={row} />
            ))}
          </div>
        </div>
      ))}

      {/* Last Updated */}
      <p className="text-sm text-muted-foreground text-center">
        Last updated: {new Date(standings.last_updated).toLocaleString()}
      </p>
    </div>
  );
}

interface StandingCardProps {
  row: StandingsRow;
}

function StandingCard({ row }: StandingCardProps) {
  // Determine position badge color - 1-6 are dark green
  const getRankColor = (rank: number) => {
    if (rank <= 6) return "bg-green-700 text-white";
    return "bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-2">
        <div className="flex items-center gap-4">
          {/* Rank Badge - Smaller */}
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${getRankColor(
              row.rank
            )}`}
          >
            <span className="text-xs">{row.rank}</span>
          </div>

          {/* Team Logo - Compact */}
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
            {row.team_logo ? (
              <ImageWithFallback
                src={row.team_logo}
                alt={row.team_name}
                className="w-8 h-8 object-contain"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <Users className="w-4 h-4 text-gray-500" />
              </div>
            )}
          </div>

          {/* Team Name - Compact */}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm">{row.team_name}</p>
          </div>

          {/* Points - Compact */}
          <div className="text-right flex-shrink-0 min-w-[50px]">
            <p className="text-[10px] text-muted-foreground leading-tight">PTS</p>
            <p className="text-xl leading-tight">{row.points}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}