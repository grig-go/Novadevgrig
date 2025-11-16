import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from './supabase/info';

interface SportsDataStats {
  totalTeams: number;
  totalGames: number;
  totalVenues: number;
  totalTournaments: number;
  providers: number;
  lastUpdated: string;
  hasActiveProvider: boolean;
}

export function useSportsData() {
  const [stats, setStats] = useState<SportsDataStats>({
    totalTeams: 0,
    totalGames: 0,
    totalVenues: 0,
    totalTournaments: 0,
    providers: 0,
    lastUpdated: new Date().toISOString(),
    hasActiveProvider: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSportsData = async () => {
    // COMMENTED OUT FOR REFACTORING - Sports data fetching will be refactored
    /*
    try {
      setLoading(true);
      setError(null);

      // First, check if there's an active sports provider using RPC pattern
      try {
        const listResponse = await fetch(
          `https://${projectId}.supabase.co/rest/v1/data_providers_public?select=id,name,type,category,is_active&category=eq.sports`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              apikey: publicAnonKey,
            },
          }
        );

        if (!listResponse.ok) {
          console.warn('Could not fetch sports providers from database');
          setStats({
            totalTeams: 0,
            totalGames: 0,
            totalVenues: 0,
            totalTournaments: 0,
            providers: 0,
            lastUpdated: new Date().toISOString(),
            hasActiveProvider: false,
          });
          return;
        }

        const providerList = await listResponse.json();
        const activeSportsProviders = providerList.filter((p: any) => p.is_active === true);

        // If no active provider, return early with zeros
        if (activeSportsProviders.length === 0) {
          setStats({
            totalTeams: 0,
            totalGames: 0,
            totalVenues: 0,
            totalTournaments: 0,
            providers: 0,
            lastUpdated: new Date().toISOString(),
            hasActiveProvider: false,
          });
          return;
        }

        // Fetch all sports data in parallel only if provider is active
      const [teamsRes, gamesRes, venuesRes, tournamentsRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/sports-data/teams`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/sports-data/games`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/sports-data/venues`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/sports-data/tournaments`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
      ]);

      // Check for errors but don't fail completely
      const [teamsData, gamesData, venuesData, tournamentsData] = await Promise.all([
        teamsRes.ok ? teamsRes.json() : { teams: [] },
        gamesRes.ok ? gamesRes.json() : { games: [] },
        venuesRes.ok ? venuesRes.json() : { venues: [] },
        tournamentsRes.ok ? tournamentsRes.json() : { tournaments: [] },
      ]);

      setStats({
        totalTeams: teamsData.teams?.length || 0,
        totalGames: gamesData.games?.length || 0,
        totalVenues: venuesData.venues?.length || 0,
        totalTournaments: tournamentsData.tournaments?.length || 0,
        providers: activeSportsProviders.length,
        lastUpdated: new Date().toISOString(),
        hasActiveProvider: true,
      });
      } catch (providerError) {
        console.error('Error fetching providers:', providerError);
        setStats({
          totalTeams: 0,
          totalGames: 0,
          totalVenues: 0,
          totalTournaments: 0,
          providers: 0,
          lastUpdated: new Date().toISOString(),
          hasActiveProvider: false,
        });
      }
    } catch (err) {
      console.error('Error fetching sports data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Still set hasActiveProvider to false on error
      setStats(prev => ({ ...prev, hasActiveProvider: false }));
    } finally {
      setLoading(false);
    }
    */
    
    // Temporary: Return zero stats during refactoring
    setLoading(false);
    setStats({
      totalTeams: 0,
      totalGames: 0,
      totalVenues: 0,
      totalTournaments: 0,
      providers: 0,
      lastUpdated: new Date().toISOString(),
      hasActiveProvider: false,
    });
  };

  useEffect(() => {
    fetchSportsData();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchSportsData,
  };
}