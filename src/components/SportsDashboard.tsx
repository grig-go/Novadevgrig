import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { SportsFilters } from "./SportsFilters";
import { SportsCard } from "./SportsCard";
import { SportsAddActions } from "./SportsAddActions";
import { SportsAIInsights } from "./SportsAIInsights";
import { SportsDebugPanel } from "./SportsDebugPanel";
import { StandingsTable } from "./StandingsTable";
import { 
  SportsData, 
  SportsFilters as SportsFiltersType, 
  SportsView, 
  SportsEntityWithOverrides,
  Team,
  Player,
  Game,
  Venue,
  Tournament,
  League
} from "../types/sports";
import { Activity, Users, User, Calendar, MapPin, TrendingUp, Trophy, Rss, RefreshCw } from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { motion } from "framer-motion";

interface SportsDashboardProps {
  onNavigateToFeeds?: () => void;
  onNavigateToProviders?: () => void;
}

export function SportsDashboard({ 
  onNavigateToFeeds,
  onNavigateToProviders
}: SportsDashboardProps) {
  const [currentView, setCurrentView] = useState<SportsView>('teams');
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [filters, setFilters] = useState<SportsFiltersType>({
    search: '',
    league: '',
    provider: 'all',
    showOverrides: false
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<any[]>([]);
  
  // Backend data state
  const [teams, setTeams] = useState<SportsEntityWithOverrides[]>([]);
  const [players, setPlayers] = useState<SportsEntityWithOverrides[]>([]);
  const [games, setGames] = useState<SportsEntityWithOverrides[]>([]);
  const [venues, setVenues] = useState<SportsEntityWithOverrides[]>([]);
  const [tournaments, setTournaments] = useState<SportsEntityWithOverrides[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());

  // Fetch all sports data on mount
  useEffect(() => {
    fetchAllSportsData();
    fetchProviders();
  }, []);

  // Auto-select first league when switching to standings view
  useEffect(() => {
    if (currentView === 'standings' && leagues.length > 0 && !filters.league) {
      setFilters(prev => ({ ...prev, league: leagues[0].id }));
    }
  }, [currentView, leagues]);

  const fetchAllSportsData = async () => {
    try {
      setLoading(true);
      
      // First check if there are any active sports providers
      const activeSportsProviders = providers.filter((p: any) => p.status === 'active' || p.isActive);
      
      // If no active provider, skip API calls and show empty state
      if (activeSportsProviders.length === 0 && providers.length > 0) {
        console.log('[Sports Dashboard] No active sports providers - skipping API calls');
        setTeams([]);
        setGames([]);
        setVenues([]);
        setTournaments([]);
        setLeagues([]);
        setLoading(false);
        return;
      }
      
      // COMMENTED OUT - not using sports_dashboard edge function right now
      // Fetch all sports data in parallel
      // const [teamsRes, gamesRes, venuesRes, tournamentsRes] = await Promise.all([
      //   fetch(`https://${projectId}.supabase.co/functions/v1/sports_dashboard/sports-data/teams`, {
      //     headers: { Authorization: `Bearer ${publicAnonKey}` },
      //   }),
      //   fetch(`https://${projectId}.supabase.co/functions/v1/sports_dashboard/sports-data/games`, {
      //     headers: { Authorization: `Bearer ${publicAnonKey}` },
      //   }),
      //   fetch(`https://${projectId}.supabase.co/functions/v1/sports_dashboard/sports-data/venues`, {
      //     headers: { Authorization: `Bearer ${publicAnonKey}` },
      //   }),
      //   fetch(`https://${projectId}.supabase.co/functions/v1/sports_dashboard/sports-data/tournaments`, {
      //     headers: { Authorization: `Bearer ${publicAnonKey}` },
      //   }),
      // ]);

      // if (teamsRes.ok && gamesRes.ok && venuesRes.ok && tournamentsRes.ok) {
      //   const [teamsData, gamesData, venuesData, tournamentsData] = await Promise.all([
      //     teamsRes.json(),
      //     gamesRes.json(),
      //     venuesRes.json(),
      //     tournamentsRes.json(),
      //   ]);

      // Transform backend data to SportsEntityWithOverrides format
      // const transformToEntity = (item: any): SportsEntityWithOverrides => ({
      //   entity: item,
      //   overrides: [],
      //   lastUpdated: item.lastUpdated || new Date().toISOString(),
      //   primaryProvider: item.primaryProvider || 'sportradar',
      // });

      // setTeams((teamsData.teams || []).map(transformToEntity));
      // setGames((gamesData.games || []).map(transformToEntity));
      // setVenues((venuesData.venues || []).map(transformToEntity));
      // setTournaments((tournamentsData.tournaments || []).map(transformToEntity));
      // 
      // // Extract unique leagues from tournaments (tournaments are competitions/leagues)
      // const tournamentsArray = tournamentsData.tournaments || [];
      // const seenIds = new Set<string>();
      // const uniqueLeagues: League[] = [];
      // 
      // for (const tournament of tournamentsArray) {
      //   if (!seenIds.has(tournament.id)) {
      //     seenIds.add(tournament.id);
      //     uniqueLeagues.push({
      //       id: tournament.id,
      //       name: tournament.name,
      //       abbrev: tournament.abbrev,
      //       sport: tournament.sport || 'unknown',
      //       country: 'INTL',
      //       brand: tournament.brand || {
      //         primary_color: '#000000',
      //         secondary_color: '#FFFFFF',
      //       },
      //     });
      //   }
      // }
      // setLeagues(uniqueLeagues);
      // setLastUpdated(new Date().toISOString());
      
      // Return empty data for now - not using sports_dashboard edge function
      setTeams([]);
      setGames([]);
      setVenues([]);
      setTournaments([]);
      setLeagues([]);
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      console.error('Error fetching sports data:', error);
      toast.error('Failed to load sports data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      // Fetch providers using RPC pattern (same as Finance Dashboard)
      const listResponse = await fetch(
        `https://${projectId}.supabase.co/rest/v1/data_providers_public?select=id,name,type,category,is_active&category=eq.sports`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            apikey: publicAnonKey,
          },
        }
      );

      if (listResponse.ok) {
        const providerList = await listResponse.json();
        // Map database fields to component interface
        const sportsProviders = providerList.map((p: any) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          category: p.category,
          status: p.is_active ? 'active' : 'inactive',
          isActive: p.is_active,
        }));
        setProviders(sportsProviders);
      }
    } catch (error) {
      console.error('Error fetching sports providers:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Trigger sync for all active sports providers
      const activeSportsProviders = providers.filter((p: any) => p.status === 'active' || p.isActive);
      
      console.log('[Sports Refresh] Active providers:', activeSportsProviders.length, 'of', providers.length);
      
      if (activeSportsProviders.length === 0) {
        toast.error('No active sports providers configured. Please configure a provider in Data Feeds.');
        setRefreshing(false);
        return;
      }

      toast.info(`Syncing sports data from ${activeSportsProviders.length} provider(s)...`);
      
      // COMMENTED OUT - not using sports_dashboard edge function right now
      // Sync data from all active providers
      // await Promise.all(
      //   activeSportsProviders.map(async (provider: any) => {
      //     try {
      //       console.log(`[Sports Refresh] Syncing provider ${provider.id} (${provider.name})`);
      //       const response = await fetch(
      //         `https://${projectId}.supabase.co/functions/v1/sports_dashboard/sports-data/sync`,
      //         {
      //           method: 'POST',
      //           headers: {
      //             'Content-Type': 'application/json',
      //             Authorization: `Bearer ${publicAnonKey}`,
      //           },
      //           body: JSON.stringify({ providerId: provider.id }),
      //         }
      //       );
      //       
      //       if (!response.ok) {
      //         const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      //         console.error(`[Sports Refresh] Failed to sync provider ${provider.id}:`, errorData);
      //         toast.error(`Failed to sync ${provider.name}`);
      //       } else {
      //         const result = await response.json();
      //         console.log(`[Sports Refresh] Successfully synced ${provider.id}:`, result);
      //       }
      //     } catch (err) {
      //       console.error(`[Sports Refresh] Exception syncing provider ${provider.id}:`, err);
      //       toast.error(`Error syncing ${provider.name}`);
      //     }
      //   })
      // );

      // Refetch all data after sync
      console.log('[Sports Refresh] Refetching all sports data...');
      await fetchAllSportsData();
      toast.success('Sports data refreshed successfully');
    } catch (error) {
      console.error('[Sports Refresh] Error refreshing sports data:', error);
      toast.error('Failed to refresh sports data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleInitializeAndSync = async () => {
    setRefreshing(true);
    try {
      console.log('[Sports Initialize] Starting initialization and sync process...');
      toast.info('Initializing sports providers...');

      // Step 1: Check for existing providers
      await fetchProviders();
      
      // Wait a moment for provider state to update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Get current provider list
      const providersResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sports_dashboard/sports-providers`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );

      if (!providersResponse.ok) {
        throw new Error('Failed to fetch sports providers');
      }

      const providersData = await providersResponse.json();
      // Ensure providersData is always an array
      const providersList = Array.isArray(providersData) ? providersData : (providersData?.providers || []);
      const activeSportsProviders = providersList.filter((p: any) => p.isActive);

      console.log('[Sports Initialize] Found providers:', activeSportsProviders.length);

      if (activeSportsProviders.length === 0) {
        toast.error('No active sports providers found. Server may still be initializing. Please try again in a moment.');
        setRefreshing(false);
        return;
      }

      // Step 3: Trigger sync for each provider and wait for completion
      toast.info(`Syncing data from ${activeSportsProviders.length} provider(s)...`);
      
      const syncPromises = activeSportsProviders.map(async (provider: any) => {
        try {
          console.log(`[Sports Initialize] Syncing provider ${provider.id} (${provider.name})`);
          
          const syncResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/sports_dashboard/sports-data/sync`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${publicAnonKey}`,
              },
              body: JSON.stringify({ providerId: provider.id }),
            }
          );
          
          if (!syncResponse.ok) {
            const errorData = await syncResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.error(`[Sports Initialize] Failed to sync provider ${provider.id}:`, errorData);
            throw new Error(`Failed to sync ${provider.name}: ${errorData.error}`);
          }
          
          const result = await syncResponse.json();
          console.log(`[Sports Initialize] Successfully synced ${provider.id}:`, result);
          
          return {
            providerId: provider.id,
            providerName: provider.name,
            results: result.results,
          };
        } catch (err) {
          console.error(`[Sports Initialize] Exception syncing provider ${provider.id}:`, err);
          throw err;
        }
      });

      // Wait for all syncs to complete
      const syncResults = await Promise.allSettled(syncPromises);
      
      // Check results
      const successful = syncResults.filter(r => r.status === 'fulfilled');
      const failed = syncResults.filter(r => r.status === 'rejected');

      console.log('[Sports Initialize] Sync results:', {
        successful: successful.length,
        failed: failed.length,
      });

      if (successful.length > 0) {
        // Show success summary
        const totalTeams = successful.reduce((sum, r: any) => 
          sum + (r.value?.results?.teams || 0), 0);
        const totalGames = successful.reduce((sum, r: any) => 
          sum + (r.value?.results?.games || 0), 0);
        
        toast.success(
          `Initialized successfully! Synced ${totalTeams} teams and ${totalGames} games.`
        );
      }

      if (failed.length > 0) {
        toast.error(`${failed.length} provider(s) failed to sync. Check console for details.`);
      }

      // Step 4: Refetch all data
      console.log('[Sports Initialize] Refetching all sports data...');
      toast.info('Loading sports data...');
      await fetchAllSportsData();
      
      // Refresh provider list
      await fetchProviders();
      
      console.log('[Sports Initialize] Initialization complete!');
      
    } catch (error) {
      console.error('[Sports Initialize] Error during initialization:', error);
      toast.error('Failed to initialize sports providers. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const getCurrentEntities = () => {
    switch (currentView) {
      case 'teams': return teams;
      case 'standings': return []; // Standings uses separate component
      case 'players': return players;
      case 'games': return games;
      case 'venues': return venues;
      case 'tournaments': return tournaments;
      default: return [];
    }
  };

  const filteredEntities = useMemo(() => {
    const entities = getCurrentEntities();
    
    return entities.filter(entityWrapper => {
      const entity = entityWrapper.entity;
      
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        let searchFields: string[] = [];
        
        switch (currentView) {
          case 'teams':
            const team = entity as Team;
            searchFields = [team.name, team.abbrev, team.city];
            break;
          case 'players':
            const player = entity as Player;
            searchFields = [player.name.display, player.name.full, player.bio.position || ''];
            break;
          case 'games':
            const game = entity as Game;
            searchFields = [game.status, game.competition_stage || ''];
            break;
          case 'venues':
            const venue = entity as Venue;
            searchFields = [venue.name, venue.address?.city || '', venue.surface || ''];
            break;
        }
        
        const matchesSearch = searchFields.some(field => 
          field && field.toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }
      
      // League filter
      if (filters.league) {
        const leagueId = 'league_id' in entity ? entity.league_id : null;
        if (leagueId !== filters.league) return false;
      }
      
      // Status filter (for games)
      if (filters.status && currentView === 'games') {
        const game = entity as Game;
        if (game.status !== filters.status) return false;
      }
      
      // Position filter (for players)
      if (filters.position && currentView === 'players') {
        const player = entity as Player;
        if (player.bio?.position !== filters.position) return false;
      }
      
      // Provider filter
      if (filters.provider !== 'all') {
        if (entityWrapper.primaryProvider !== filters.provider) return false;
      }
      
      return true;
    });
  }, [teams, players, games, venues, tournaments, currentView, filters]);

  const getStatsData = () => {
    const totalEntities = getCurrentEntities().length;
    const totalOverrides = getCurrentEntities().reduce((sum, entity) => sum + entity.overrides.length, 0);
    const activeEntities = getCurrentEntities().length; // Simplified for now
    
    // Calculate league statistics
    const leagueStats = leagues.map(league => {
      const entitiesInLeague = getCurrentEntities().filter(entityWrapper => {
        const entity = entityWrapper.entity;
        return 'league_id' in entity && entity.league_id === league.id;
      });
      
      return {
        name: league.abbrev,
        count: entitiesInLeague.length,
        color: league.brand?.primary_color || '#000000'
      };
    }).filter(stat => stat.count > 0); // Only show leagues with entities

    // Calculate tournament statistics
    const tournamentStats = tournaments.map(tournamentWrapper => {
      const tournament = tournamentWrapper.entity as Tournament;
      return {
        name: tournament.abbrev,
        count: 1, // Each tournament counts as 1
        color: tournament.brand?.primary_color || '#000000'
      };
    });

    return {
      totalEntities,
      totalOverrides,
      activeEntities,
      leagueStats,
      tournamentStats
    };
  };

  const stats = getStatsData();

  const getViewIcon = (view: SportsView) => {
    switch (view) {
      case 'teams': return <Users className="w-5 h-5" />;
      case 'standings': return <TrendingUp className="w-5 h-5" />;
      case 'players': return <User className="w-5 h-5" />;
      case 'games': return <Calendar className="w-5 h-5" />;
      case 'venues': return <MapPin className="w-5 h-5" />;
      case 'tournaments': return <Trophy className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getViewLabel = (view: SportsView) => {
    return view.charAt(0).toUpperCase() + view.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 mb-1 text-[24px]">
            <motion.div
              animate={{ 
                rotate: [0, -10, 10, -10, 0],
                scale: [1, 1.1, 1.1, 1.1, 1]
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatDelay: 3,
                ease: "easeInOut"
              }}
            >
              <Trophy className="w-6 h-6 text-purple-600" />
            </motion.div>
            Sports Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage sports data across multiple leagues and providers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              onClick={handleInitializeAndSync}
              disabled={refreshing}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Initializing...' : 'Initialize & Sync'}
            </Button>
          </motion.div>
          <SportsDebugPanel />
          <SportsAddActions
            onAddMultipleEntities={async (entities) => {
              // Refresh all data after adding league
              await fetchAllSportsData();
              setLastUpdated(new Date().toISOString());
            }}
            onRefresh={async () => {
              // Refresh all data without reloading the page
              await fetchAllSportsData();
              setLastUpdated(new Date().toISOString());
            }}
          />
          <motion.div 
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Last updated ({new Date(lastUpdated).toLocaleTimeString()})
          </motion.div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5,
            type: "spring",
            stiffness: 100,
            damping: 15
          }}
        >
        <Card className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 group">
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            initial={false}
          />
          <CardContent className="p-6 relative">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">League Distribution</p>
                  <motion.p 
                    className="text-2xl font-semibold"
                    key={leagues.length}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    {leagues.length}
                  </motion.p>
                </div>
              </div>
              {stats.leagueStats.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {stats.leagueStats.map((leagueStat, index) => (
                    <motion.div 
                      key={index} 
                      className="flex items-center gap-2"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: leagueStat.color }}
                      />
                      <Badge variant="outline" className="text-xs">
                        {leagueStat.name}: {leagueStat.count}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No league entities added yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5,
            delay: 0.1,
            type: "spring",
            stiffness: 100,
            damping: 15
          }}
        >
        <Card className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 group">
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            initial={false}
          />
          <CardContent className="p-6 relative">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Trophy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">Tournament Distribution</p>
                  <motion.p 
                    className="text-2xl font-semibold"
                    key={stats.tournamentStats.reduce((sum, t) => sum + t.count, 0)}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    {stats.tournamentStats.reduce((sum, t) => sum + t.count, 0)}
                  </motion.p>
                </div>
              </div>
              {stats.tournamentStats.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {stats.tournamentStats.map((tournamentStat, index) => (
                    <motion.div 
                      key={index} 
                      className="flex items-center gap-2"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tournamentStat.color }}
                      />
                      <Badge variant="outline" className="text-xs">
                        {tournamentStat.name}: {tournamentStat.count}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No tournaments added yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5,
            delay: 0.2,
            type: "spring",
            stiffness: 100,
            damping: 15
          }}
        >
        <Card className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-500/10 group">
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            initial={false}
          />
          <CardContent className="p-6 relative">
            <div className="flex items-center gap-4">
              <motion.div 
                className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Activity className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </motion.div>
              <div>
                <p className="text-sm text-muted-foreground">Data Overrides</p>
                <motion.p 
                  className="text-2xl font-semibold"
                  key={stats.totalOverrides}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  {stats.totalOverrides}
                </motion.p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalOverrides > 0 
                    ? 'Fields modified from source' 
                    : 'No changes made'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <SportsAIInsights 
          entities={filteredEntities} 
          data={{
            teams,
            players,
            games,
            venues,
            tournaments,
            leagues,
            lastUpdated
          }}
          providers={providers}
          compact={true} 
          onClick={() => setShowAIInsights(!showAIInsights)}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5,
            delay: 0.4,
            type: "spring",
            stiffness: 100,
            damping: 15
          }}
        >
        <Card 
          className={`h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 group ${onNavigateToFeeds ? "cursor-pointer hover:bg-muted/50" : ""}`}
          onClick={onNavigateToFeeds}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            initial={false}
          />
          <CardContent className="p-6 relative">
            <div className="flex items-center gap-4">
              <motion.div 
                className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Rss className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </motion.div>
              <div>
                <p className="text-sm text-muted-foreground">Data Providers</p>
                <motion.p 
                  className="text-2xl font-semibold"
                  initial={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {providers.length}
                </motion.p>
                <p className="text-xs text-muted-foreground">
                  {providers.length === 0 
                    ? 'No providers configured'
                    : providers.length === 1
                    ? providers[0].name
                    : `${providers.filter((p: any) => p.status === 'active').length} active`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </div>

      {/* Expanded AI Insights Section */}
      {showAIInsights && (
        <SportsAIInsights 
          entities={filteredEntities} 
          data={{
            teams,
            players,
            games,
            venues,
            tournaments,
            leagues,
            lastUpdated
          }}
          providers={providers}
          listView={true} 
        />
      )}



      {/* Filters */}
      <SportsFilters
        filters={filters}
        onFiltersChange={setFilters}
        currentView={currentView}
        onViewChange={setCurrentView}
        leagues={leagues}
        totalCount={stats.totalEntities}
        filteredCount={filteredEntities.length}
        providers={providers}
      />

      {/* Entity Grid or Standings View */}
      {loading ? (
        <Card>
          <CardContent className="text-center py-12">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading sports data...</p>
          </CardContent>
        </Card>
      ) : providers.length > 0 && providers.filter((p: any) => p.status === 'active' || p.isActive).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-amber-100 dark:bg-amber-900/20 rounded-full">
                <Rss className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">No Active Sports Provider</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  You have sports providers configured, but none are currently active. 
                  Enable a provider to start fetching sports data.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              {onNavigateToFeeds && (
                <Button onClick={onNavigateToFeeds} variant="default">
                  <Rss className="w-4 h-4 mr-2" />
                  Configure Providers
                </Button>
              )}
              <Button onClick={fetchProviders} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            <div className="text-sm text-muted-foreground mt-4">
              <p className="font-medium mb-2">Available Providers:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {providers.map((provider: any) => (
                  <Badge key={provider.id} variant="outline">
                    {provider.name} {provider.status === 'active' || provider.isActive ? '(Active)' : '(Inactive)'}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : filteredEntities.length === 0 && !loading ? (
        <Card>
          <CardContent className="text-center py-12 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Trophy className="w-12 h-12 text-muted-foreground" />
              <div>
                <h3 className="text-xl font-semibold mb-2">No Sports Data</h3>
                <p className="text-muted-foreground mb-4">
                  {providers.length === 0 
                    ? 'Configure a sports provider to start fetching data.'
                    : 'Add leagues and teams to get started.'}
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              {providers.length === 0 && onNavigateToFeeds && (
                <Button onClick={onNavigateToFeeds} variant="default">
                  <Rss className="w-4 h-4 mr-2" />
                  Configure Providers
                </Button>
              )}
              {providers.length > 0 && (
                <Button onClick={async () => {
                  setRefreshing(true);
                  try {
                    // Fetch standings for the first available league
                    const leagueId = leagues.length > 0 ? leagues[0].id : null;
                    if (!leagueId) {
                      toast.error('No leagues available to fetch standings');
                      setRefreshing(false);
                      return;
                    }
                    
                    toast.info('Fetching standings...');
                    const response = await fetch(
                      `https://${projectId}.supabase.co/functions/v1/sports_dashboard/sports/standings/${leagueId}`,
                      {
                        headers: { Authorization: `Bearer ${publicAnonKey}` }
                      }
                    );
                    
                    if (response.ok) {
                      const data = await response.json();
                      console.log('Standings data:', data);
                      toast.success('Standings fetched successfully');
                      // Switch to standings view to show the data
                      setCurrentView('standings');
                      setFilters(prev => ({ ...prev, league: leagueId }));
                    } else {
                      const errorData = await response.json().catch(() => ({ error: response.statusText }));
                      console.error('Failed to fetch standings:', errorData);
                      toast.error(`Failed to fetch standings: ${errorData.error || response.statusText}`);
                    }
                  } catch (error) {
                    console.error('Error fetching standings:', error);
                    toast.error('Error fetching standings');
                  } finally {
                    setRefreshing(false);
                  }
                }} disabled={refreshing} variant="default">
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Initializing...' : 'Initialize & Sync'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : currentView === 'standings' ? (
        // Standings View - use first league or filtered league
        (() => {
          const selectedLeague = filters.league 
            ? leagues.find(l => l.id === filters.league) 
            : leagues[0];
          
          if (!selectedLeague) {
            return (
              <Card>
                <CardContent className="text-center py-12">
                  <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No leagues available. Add a league to view standings.
                  </p>
                </CardContent>
              </Card>
            );
          }
          
          return (
            <StandingsTable 
              leagueId={selectedLeague.id} 
              leagueName={selectedLeague.name}
            />
          );
        })()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntities.map((entity) => {
            const teamsData = teams.map(t => t.entity as Team);
            
            return (
              <SportsCard
                key={entity.entity.id}
                entity={entity}
                view={currentView}
                leagues={leagues}
                teams={teamsData}
                onUpdate={(updatedEntity) => {
                  // Update in appropriate state
                  const entityData = updatedEntity.entity;
                  if ('abbrev' in entityData && 'city' in entityData) {
                    setTeams(prev => prev.map(t => t.entity.id === updatedEntity.entity.id ? updatedEntity : t));
                  } else if ('name' in entityData && 'bio' in entityData) {
                    setPlayers(prev => prev.map(p => p.entity.id === updatedEntity.entity.id ? updatedEntity : p));
                  } else if ('status' in entityData && 'teams' in entityData) {
                    setGames(prev => prev.map(g => g.entity.id === updatedEntity.entity.id ? updatedEntity : g));
                  } else if ('capacity' in entityData && 'address' in entityData) {
                    setVenues(prev => prev.map(v => v.entity.id === updatedEntity.entity.id ? updatedEntity : v));
                  } else if ('stage' in entityData && 'participating_teams' in entityData) {
                    setTournaments(prev => prev.map(t => t.entity.id === updatedEntity.entity.id ? updatedEntity : t));
                  }
                  setLastUpdated(new Date().toISOString());
                  toast.success('Entity updated successfully');
                }}
                onDelete={(entityId) => {
                  // Delete from appropriate state
                  switch (currentView) {
                    case 'teams':
                      setTeams(prev => prev.filter(t => t.entity.id !== entityId));
                      break;
                    case 'players':
                      setPlayers(prev => prev.filter(p => p.entity.id !== entityId));
                      break;
                    case 'games':
                      setGames(prev => prev.filter(g => g.entity.id !== entityId));
                      break;
                    case 'venues':
                      setVenues(prev => prev.filter(v => v.entity.id !== entityId));
                      break;
                    case 'tournaments':
                      setTournaments(prev => prev.filter(t => t.entity.id !== entityId));
                      break;
                  }
                  setLastUpdated(new Date().toISOString());
                  toast.success('Entity deleted successfully');
                }}
                showOverrides={filters.showOverrides}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}