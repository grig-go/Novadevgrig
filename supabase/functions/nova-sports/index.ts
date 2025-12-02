// Nova Sports API - Direct endpoint for sports data with filtering
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid view types
type SportsView = 'teams' | 'standings' | 'players' | 'games' | 'venues' | 'tournaments' | 'betting';

// Valid game statuses
const VALID_STATUSES = ['all', 'scheduled', 'in_progress', 'final', 'postponed', 'cancelled'];

// Valid player positions
const ALL_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'PG', 'SG', 'SF', 'PF', 'C', 'P', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP', 'LW', 'RW', 'D', 'G', 'GK', 'MID', 'FWD'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const viewParam = url.searchParams.get('view');
    const leagueParam = url.searchParams.get('league');
    const providerParam = url.searchParams.get('provider');
    const positionParam = url.searchParams.get('position');
    const statusParam = url.searchParams.get('status');
    const seasonParam = url.searchParams.get('season');

    console.log('Sports API Request:', {
      view: viewParam,
      league: leagueParam,
      provider: providerParam,
      position: positionParam,
      status: statusParam,
      season: seasonParam
    });

    const view = (viewParam || 'teams') as SportsView;
    const league = leagueParam || 'all';
    let provider = providerParam || 'all';
    const position = positionParam || 'all';
    const status = statusParam || 'all';
    const season = seasonParam || 'all';

    // If provider looks like a UUID, look up the provider type from data_providers
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (provider !== 'all' && uuidRegex.test(provider)) {
      const { data: providerData } = await supabase
        .from('data_providers')
        .select('type')
        .eq('id', provider)
        .single();

      if (providerData?.type) {
        console.log(`Resolved provider UUID ${provider} to type: ${providerData.type}`);
        provider = providerData.type.toLowerCase();
      }
    } else if (provider !== 'all') {
      // Normalize provider to lowercase for case-insensitive matching
      provider = provider.toLowerCase();
      console.log(`Normalized provider to: ${provider}`);
    }

    // Validate view parameter
    const validViews: SportsView[] = ['teams', 'standings', 'players', 'games', 'venues', 'tournaments', 'betting'];
    if (!validViews.includes(view)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid view parameter',
          details: `View must be one of: ${validViews.join(', ')}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    let data: any[] = [];
    let totalCount = 0;

    switch (view) {
      case 'teams': {
        // First fetch teams with standings
        let query = supabase
          .from('sports_teams')
          .select(`
            id,
            sportradar_id,
            name,
            short_name,
            abbreviation,
            logo_url,
            colors,
            country,
            country_code,
            city,
            venue,
            api_source,
            created_at,
            updated_at,
            sports_standings (
              id,
              rank,
              played,
              win,
              draw,
              loss,
              goals_for,
              goals_against,
              goals_diff,
              points,
              form,
              season_id,
              sports_seasons (
                id,
                name,
                year,
                is_current
              )
            )
          `)
          .order('name');

        // Filter by provider if specified
        if (provider !== 'all') {
          query = query.eq('api_source', provider);
        }

        const { data: teamsData, error: teamsError } = await query;

        if (teamsError) {
          console.error('Error fetching teams:', teamsError);
          throw teamsError;
        }

        // Fetch detailed stats for each team using the RPC function
        const teamStatsMap = new Map<string, any>();

        // Process teams in batches to get their stats via RPC
        for (const team of (teamsData || [])) {
          try {
            const { data: rpcStats, error: rpcError } = await supabase.rpc('get_team_stats', {
              p_team_id: team.id,
              p_season_id: null // Get current/latest season
            });

            if (!rpcError && rpcStats?.success && rpcStats?.data?.season_stats) {
              teamStatsMap.set(team.id, rpcStats.data.season_stats);
            }
          } catch (e) {
            console.error(`Error fetching stats for team ${team.id}:`, e);
          }
        }

        data = (teamsData || []).map(team => {
          // Get the most recent/current season stats from standings
          const standings = team.sports_standings || [];
          // Find current season stats or most recent
          const currentSeasonStats = standings.find((s: any) => s.sports_seasons?.is_current) || standings[0];

          // Get detailed stats from RPC call
          const rpcStats = teamStatsMap.get(team.id);

          // Calculate win percentage if we have data
          const played = rpcStats?.played ?? currentSeasonStats?.played;
          const wins = rpcStats?.wins ?? currentSeasonStats?.win;
          let winPercentage: number | null = null;
          if (played && played > 0 && wins !== undefined) {
            winPercentage = Math.round((wins / played) * 100);
          }

          // Get raw stats for calculations
          const goalsFor = rpcStats?.goals_for ?? currentSeasonStats?.goals_for;
          const goalsAgainst = rpcStats?.goals_against ?? currentSeasonStats?.goals_against;
          const yellowCards = rpcStats?.yellow_cards ?? null;
          const redCards = rpcStats?.red_cards ?? null;
          const cleanSheets = rpcStats?.clean_sheets ?? null;

          // Calculate per-game and percentage values
          const goalsForPerGame = (played && played > 0 && goalsFor != null)
            ? parseFloat((goalsFor / played).toFixed(1))
            : null;
          const goalsAgainstPerGame = (played && played > 0 && goalsAgainst != null)
            ? parseFloat((goalsAgainst / played).toFixed(1))
            : null;
          const yellowCardsPerGame = (played && played > 0 && yellowCards != null)
            ? parseFloat((yellowCards / played).toFixed(1))
            : null;
          const redCardsPerGame = (played && played > 0 && redCards != null)
            ? parseFloat((redCards / played).toFixed(2))
            : null;
          const cleanSheetsPercent = (played && played > 0 && cleanSheets != null)
            ? Math.round((cleanSheets / played) * 100)
            : null;

          return {
            id: team.id,
            sportradarId: team.sportradar_id,
            name: team.name,
            shortName: team.short_name,
            abbreviation: team.abbreviation,
            logoUrl: team.logo_url,
            colors: team.colors,
            country: team.country,
            countryCode: team.country_code,
            city: team.city,
            venue: team.venue,
            provider: team.api_source,
            createdAt: team.created_at,
            updatedAt: team.updated_at,
            // Season stats (match record, goals, discipline, performance)
            seasonStats: (currentSeasonStats || rpcStats) ? {
              seasonId: currentSeasonStats?.season_id,
              seasonName: currentSeasonStats?.sports_seasons?.name,
              seasonYear: currentSeasonStats?.sports_seasons?.year,
              isCurrent: currentSeasonStats?.sports_seasons?.is_current,
              // Points
              points: rpcStats?.points ?? currentSeasonStats?.points,
              rank: currentSeasonStats?.rank,
              // Match Record
              played: rpcStats?.played ?? currentSeasonStats?.played,
              wins: rpcStats?.wins ?? currentSeasonStats?.win,
              draws: rpcStats?.draws ?? currentSeasonStats?.draw,
              losses: rpcStats?.losses ?? currentSeasonStats?.loss,
              winPercentage: rpcStats?.win_percentage ?? winPercentage,
              // Goals (raw values)
              goalsFor,
              goalsAgainst,
              goalDifference: rpcStats?.goal_difference ?? currentSeasonStats?.goals_diff,
              // Goals (calculated display values)
              goalsForPerGame,
              goalsAgainstPerGame,
              // Form (recent results like "WWDLW")
              form: currentSeasonStats?.form,
              // Performance Metrics
              avgPossession: rpcStats?.avg_possession ?? null,
              passAccuracy: rpcStats?.pass_accuracy ?? null,
              shotsPerGame: rpcStats?.shots_per_game ?? null,
              shotsOnTargetPerGame: rpcStats?.shots_on_target_per_game ?? null,
              cleanSheets,
              cleanSheetsPercent,
              // Discipline (raw values)
              yellowCards,
              redCards,
              // Discipline (calculated display values)
              yellowCardsPerGame,
              redCardsPerGame
            } : null
          };
        });
        totalCount = data.length;
        break;
      }

      case 'players': {
        let query = supabase
          .from('sports_players')
          .select(`
            id,
            sportradar_id,
            name,
            first_name,
            last_name,
            nationality,
            nationality_code,
            date_of_birth,
            jersey_number,
            position,
            photo_url,
            team_id,
            api_source,
            created_at,
            updated_at,
            sports_teams (
              id,
              name,
              short_name,
              abbreviation,
              logo_url,
              colors
            )
          `)
          .order('name');

        // Filter by provider if specified
        if (provider !== 'all') {
          query = query.eq('api_source', provider);
        }

        // Filter by position if specified
        if (position !== 'all') {
          query = query.eq('position', position);
        }

        const { data: playersData, error: playersError } = await query;

        if (playersError) {
          console.error('Error fetching players:', playersError);
          throw playersError;
        }

        data = (playersData || []).map(player => ({
          id: player.id,
          sportradarId: player.sportradar_id,
          name: player.name,
          firstName: player.first_name,
          lastName: player.last_name,
          nationality: player.nationality,
          nationalityCode: player.nationality_code,
          dateOfBirth: player.date_of_birth,
          jerseyNumber: player.jersey_number,
          position: player.position,
          photoUrl: player.photo_url,
          provider: player.api_source,
          team: player.sports_teams ? {
            id: player.sports_teams.id,
            name: player.sports_teams.name,
            shortName: player.sports_teams.short_name,
            abbreviation: player.sports_teams.abbreviation,
            logoUrl: player.sports_teams.logo_url,
            colors: player.sports_teams.colors
          } : null,
          createdAt: player.created_at,
          updatedAt: player.updated_at
        }));
        totalCount = data.length;
        break;
      }

      case 'games': {
        let query = supabase
          .from('sports_events')
          .select(`
            id,
            sportradar_id,
            title,
            start_time,
            status,
            home_score,
            away_score,
            api_source,
            created_at,
            updated_at,
            home_team:sports_teams!sports_events_home_team_id_fkey (
              id,
              name,
              short_name,
              abbreviation,
              logo_url,
              colors
            ),
            away_team:sports_teams!sports_events_away_team_id_fkey (
              id,
              name,
              short_name,
              abbreviation,
              logo_url,
              colors
            ),
            sports_seasons (
              id,
              name,
              year,
              sports_leagues (
                id,
                name,
                logo_url
              )
            ),
            venue:sports_venues(id, name, city, country)
          `)
          .order('start_time', { ascending: false });

        // Filter by provider if specified
        if (provider !== 'all') {
          query = query.eq('api_source', provider);
        }

        // Filter by status if specified
        if (status !== 'all' && VALID_STATUSES.includes(status)) {
          query = query.eq('status', status);
        }

        // Filter by league if specified (through season)
        if (league !== 'all') {
          // We need to filter by league_id through the season
          const { data: seasonsInLeague } = await supabase
            .from('sports_seasons')
            .select('id')
            .eq('league_id', league);

          if (seasonsInLeague && seasonsInLeague.length > 0) {
            query = query.in('season_id', seasonsInLeague.map(s => s.id));
          }
        }

        // Filter by season if specified
        if (season !== 'all') {
          query = query.eq('season_id', season);
        }

        const { data: gamesData, error: gamesError } = await query;

        if (gamesError) {
          console.error('Error fetching games:', gamesError);
          throw gamesError;
        }

        data = (gamesData || []).map(game => ({
          id: game.id,
          sportradarId: game.sportradar_id,
          title: game.title,
          startTime: game.start_time,
          status: game.status,
          homeScore: game.home_score,
          awayScore: game.away_score,
          provider: game.api_source,
          homeTeam: game.home_team ? {
            id: game.home_team.id,
            name: game.home_team.name,
            shortName: game.home_team.short_name,
            abbreviation: game.home_team.abbreviation,
            logoUrl: game.home_team.logo_url,
            colors: game.home_team.colors
          } : null,
          awayTeam: game.away_team ? {
            id: game.away_team.id,
            name: game.away_team.name,
            shortName: game.away_team.short_name,
            abbreviation: game.away_team.abbreviation,
            logoUrl: game.away_team.logo_url,
            colors: game.away_team.colors
          } : null,
          season: game.sports_seasons ? {
            id: game.sports_seasons.id,
            name: game.sports_seasons.name,
            year: game.sports_seasons.year
          } : null,
          league: game.sports_seasons?.sports_leagues ? {
            id: game.sports_seasons.sports_leagues.id,
            name: game.sports_seasons.sports_leagues.name,
            logoUrl: game.sports_seasons.sports_leagues.logo_url
          } : null,
          venue: game.venue ? {
            id: game.venue.id,
            name: game.venue.name,
            city: game.venue.city,
            country: game.venue.country
          } : null,
          createdAt: game.created_at,
          updatedAt: game.updated_at
        }));
        totalCount = data.length;
        break;
      }

      case 'standings': {
        let query = supabase
          .from('sports_standings')
          .select(`
            id,
            rank,
            played,
            win,
            draw,
            loss,
            goals_for,
            goals_against,
            goals_diff,
            points,
            form,
            updated_at,
            sports_teams (
              id,
              name,
              short_name,
              abbreviation,
              logo_url,
              colors
            ),
            sports_seasons (
              id,
              name,
              year,
              is_current,
              sports_leagues (
                id,
                name,
                logo_url
              )
            )
          `)
          .order('rank');

        // Filter by league if specified
        if (league !== 'all') {
          const { data: seasonsInLeague } = await supabase
            .from('sports_seasons')
            .select('id')
            .eq('league_id', league);

          if (seasonsInLeague && seasonsInLeague.length > 0) {
            query = query.in('season_id', seasonsInLeague.map(s => s.id));
          }
        }

        // Filter by season if specified
        if (season !== 'all') {
          query = query.eq('season_id', season);
        }

        const { data: standingsData, error: standingsError } = await query;

        if (standingsError) {
          console.error('Error fetching standings:', standingsError);
          throw standingsError;
        }

        const totalTeams = standingsData?.length || 0;

        data = (standingsData || []).map(standing => {
          const rank = standing.rank;

          // Calculate trend based on position (up = promotion zone, down = relegation zone)
          let trend: 'up' | 'down' | 'unchanged' = 'unchanged';
          if (rank <= 4) {
            trend = 'up';
          } else if (rank > totalTeams - 3) {
            trend = 'down';
          }

          // Calculate position zone
          let position: string | null = null;
          if (rank <= 4) {
            position = 'Champions League';
          } else if (rank <= 6) {
            position = 'Europa League';
          } else if (rank > totalTeams - 3) {
            position = 'Relegation';
          }

          return {
            id: standing.id,
            rank,
            trend,
            position,
            played: standing.played,
            win: standing.win,
            draw: standing.draw,
            loss: standing.loss,
            goalsFor: standing.goals_for,
            goalsAgainst: standing.goals_against,
            goalsDiff: standing.goals_diff,
            points: standing.points,
            form: standing.form,
            team: standing.sports_teams ? {
              id: standing.sports_teams.id,
              name: standing.sports_teams.name,
              shortName: standing.sports_teams.short_name,
              abbreviation: standing.sports_teams.abbreviation,
              logoUrl: standing.sports_teams.logo_url,
              colors: standing.sports_teams.colors
            } : null,
            season: standing.sports_seasons ? {
              id: standing.sports_seasons.id,
              name: standing.sports_seasons.name,
              year: standing.sports_seasons.year,
              isCurrent: standing.sports_seasons.is_current
            } : null,
            league: standing.sports_seasons?.sports_leagues ? {
              id: standing.sports_seasons.sports_leagues.id,
              name: standing.sports_seasons.sports_leagues.name,
              logoUrl: standing.sports_seasons.sports_leagues.logo_url
            } : null,
            updatedAt: standing.updated_at
          };
        });
        totalCount = data.length;
        break;
      }

      case 'venues': {
        let query = supabase
          .from('sports_venues')
          .select(`
            id,
            sportradar_id,
            name,
            city,
            country,
            country_code,
            capacity,
            surface,
            roof_type,
            timezone,
            latitude,
            longitude,
            api_source,
            created_at,
            updated_at
          `)
          .order('name');

        // Filter by provider if specified
        if (provider !== 'all') {
          query = query.eq('api_source', provider);
        }

        const { data: venuesData, error: venuesError } = await query;

        if (venuesError) {
          console.error('Error fetching venues:', venuesError);
          throw venuesError;
        }

        data = (venuesData || []).map(venue => ({
          id: venue.id,
          sportradarId: venue.sportradar_id,
          name: venue.name,
          city: venue.city,
          country: venue.country,
          countryCode: venue.country_code,
          capacity: venue.capacity,
          surface: venue.surface,
          roofType: venue.roof_type,
          timezone: venue.timezone,
          latitude: venue.latitude,
          longitude: venue.longitude,
          provider: venue.api_source,
          createdAt: venue.created_at,
          updatedAt: venue.updated_at
        }));
        totalCount = data.length;
        break;
      }

      case 'tournaments': {
        let query = supabase
          .from('sports_leagues')
          .select(`
            id,
            sportradar_id,
            name,
            alternative_name,
            type,
            gender,
            logo_url,
            active,
            sport,
            api_source,
            created_at,
            updated_at,
            sports_categories (
              id,
              name,
              country_code
            )
          `)
          .order('name');

        // Filter by provider if specified
        if (provider !== 'all') {
          query = query.eq('api_source', provider);
        }

        const { data: leaguesData, error: leaguesError } = await query;

        if (leaguesError) {
          console.error('Error fetching tournaments/leagues:', leaguesError);
          throw leaguesError;
        }

        data = (leaguesData || []).map(league => ({
          id: league.id,
          sportradarId: league.sportradar_id,
          name: league.name,
          alternativeName: league.alternative_name,
          type: league.type,
          gender: league.gender,
          logoUrl: league.logo_url,
          active: league.active,
          sport: league.sport,
          provider: league.api_source,
          category: league.sports_categories ? {
            id: league.sports_categories.id,
            name: league.sports_categories.name,
            countryCode: league.sports_categories.country_code
          } : null,
          createdAt: league.created_at,
          updatedAt: league.updated_at
        }));
        totalCount = data.length;
        break;
      }

      case 'betting': {
        // Fetch games with betting odds
        let query = supabase
          .from('sports_events')
          .select(`
            id,
            sportradar_id,
            title,
            start_time,
            status,
            home_score,
            away_score,
            api_source,
            created_at,
            updated_at,
            home_team:sports_teams!sports_events_home_team_id_fkey (
              id,
              name,
              short_name,
              abbreviation,
              logo_url
            ),
            away_team:sports_teams!sports_events_away_team_id_fkey (
              id,
              name,
              short_name,
              abbreviation,
              logo_url
            ),
            sports_seasons (
              id,
              name,
              sports_leagues (
                id,
                name,
                logo_url
              )
            ),
            sports_betting_odds (
              id,
              bookmaker,
              home_odds,
              away_odds,
              draw_odds,
              over_under_line,
              over_odds,
              under_odds,
              home_spread,
              away_spread,
              home_spread_odds,
              away_spread_odds,
              last_updated
            )
          `)
          .not('sports_betting_odds', 'is', null)
          .order('start_time', { ascending: false });

        // Filter by provider if specified
        if (provider !== 'all') {
          query = query.eq('api_source', provider);
        }

        // Filter by league if specified
        if (league !== 'all') {
          const { data: seasonsInLeague } = await supabase
            .from('sports_seasons')
            .select('id')
            .eq('league_id', league);

          if (seasonsInLeague && seasonsInLeague.length > 0) {
            query = query.in('season_id', seasonsInLeague.map(s => s.id));
          }
        }

        const { data: bettingData, error: bettingError } = await query;

        if (bettingError) {
          console.error('Error fetching betting data:', bettingError);
          throw bettingError;
        }

        data = (bettingData || []).filter(game => game.sports_betting_odds && game.sports_betting_odds.length > 0).map(game => ({
          id: game.id,
          sportradarId: game.sportradar_id,
          title: game.title,
          startTime: game.start_time,
          status: game.status,
          homeScore: game.home_score,
          awayScore: game.away_score,
          provider: game.api_source,
          homeTeam: game.home_team ? {
            id: game.home_team.id,
            name: game.home_team.name,
            shortName: game.home_team.short_name,
            abbreviation: game.home_team.abbreviation,
            logoUrl: game.home_team.logo_url
          } : null,
          awayTeam: game.away_team ? {
            id: game.away_team.id,
            name: game.away_team.name,
            shortName: game.away_team.short_name,
            abbreviation: game.away_team.abbreviation,
            logoUrl: game.away_team.logo_url
          } : null,
          league: game.sports_seasons?.sports_leagues ? {
            id: game.sports_seasons.sports_leagues.id,
            name: game.sports_seasons.sports_leagues.name,
            logoUrl: game.sports_seasons.sports_leagues.logo_url
          } : null,
          odds: game.sports_betting_odds.map((odd: any) => ({
            id: odd.id,
            bookmaker: odd.bookmaker,
            homeOdds: odd.home_odds,
            awayOdds: odd.away_odds,
            drawOdds: odd.draw_odds,
            overUnderLine: odd.over_under_line,
            overOdds: odd.over_odds,
            underOdds: odd.under_odds,
            homeSpread: odd.home_spread,
            awaySpread: odd.away_spread,
            homeSpreadOdds: odd.home_spread_odds,
            awaySpreadOdds: odd.away_spread_odds,
            lastUpdated: odd.last_updated
          })),
          createdAt: game.created_at,
          updatedAt: game.updated_at
        }));
        totalCount = data.length;
        break;
      }
    }

    // Build response
    const response = {
      view,
      league,
      provider,
      ...(view === 'players' && { position }),
      ...(view === 'games' && { status }),
      ...(view === 'standings' && { season }),
      lastUpdated: now,
      totalCount,
      data
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    let errorDetails: string;
    if (error instanceof Error) {
      errorDetails = error.message;
    } else if (typeof error === 'object' && error !== null) {
      // Handle Supabase error objects
      errorDetails = (error as any).message || JSON.stringify(error);
    } else {
      errorDetails = String(error);
    }
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: errorDetails
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
