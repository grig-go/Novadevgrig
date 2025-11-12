import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { TopMenuBar } from "./components/TopMenuBar";
import { ElectionDashboard } from "./components/ElectionDashboard";
import { FinanceDashboard } from "./components/FinanceDashboard";
import { SportsDashboard } from "./components/SportsDashboard";
import { WeatherDashboard } from "./components/WeatherDashboard";
import { NewsDashboard } from "./components/NewsDashboard";
import { FeedsDashboardWithSupabase } from "./components/FeedsDashboardWithSupabase";
import { AgentsDashboard } from "./components/AgentsDashboard";
import { UsersGroupsPage } from "./components/UsersGroupsPage";
import { AIConnectionsDashboard } from "./components/AIConnectionsDashboard";
import { MediaLibrary } from "./components/MediaLibrary";
import { ChannelsPage } from "./components/ChannelsPage";
import { electionData as importedElectionData, initializeElectionData, isElectionDataLoading } from "./data/electionData";
import { WeatherDataViewer } from "./components/WeatherDataViewer";
import { mockFinanceData } from "./data/mockFinanceData";
import { mockSportsData } from "./data/mockSportsData";
import { mockNewsData } from "./data/mockNewsData";
import { mockFeedsData } from "./data/mockFeedsData";
import { mockAgentsData } from "./data/mockAgentsData";
import { mockUsersData } from "./data/mockUsersData";
import { mockWeatherData } from "./data/mockWeatherData";
import { Race, CandidateProfile, Party } from "./types/election";
import { FinanceSecurityWithSnapshot } from "./types/finance";
import { SportsEntityWithOverrides, SportsView } from "./types/sports";
import { WeatherLocationWithOverrides } from "./types/weather";
import { NewsArticleWithOverrides } from "./types/news";
import { Feed, FeedCategory } from "./types/feeds";
import { Agent } from "./types/agents";
import { Vote, TrendingUp, Trophy, Cloud, Newspaper, Bot, Loader2, ImageIcon, School } from "lucide-react";
import { motion } from "framer-motion";
import { useWeatherData } from "./utils/useWeatherData";
import { useFinanceData } from "./utils/useFinanceData";
import { useSportsData } from "./utils/useSportsData";
import { useNewsFeed } from "./utils/useNewsFeed";
import { useNewsProviders } from "./utils/useNewsProviders";
import { projectId, publicAnonKey } from "./utils/supabase/info";
import SchoolClosingsDashboard from "./components/SchoolClosingsDashboard";

type AppView = 'home' | 'election' | 'finance' | 'sports' | 'weather' | 'weather-data' | 'news' | 'feeds' | 'agents' | 'users-groups' | 'ai-connections' | 'media' | 'channels' | 'school-closings';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [initialFeedCategory, setInitialFeedCategory] = useState<FeedCategory | undefined>(undefined);
  const [initialProviderCategory, setInitialProviderCategory] = useState<"school_closings" | undefined>(undefined);
  const [electionData, setElectionData] = useState(importedElectionData);
  const [electionLoading, setElectionLoading] = useState(isElectionDataLoading);
  const [financeData, setFinanceData] = useState(mockFinanceData);
  const [sportsData, setSportsData] = useState(mockSportsData);
  const [newsData, setNewsData] = useState(mockNewsData);
  const [feedsData, setFeedsData] = useState(mockFeedsData);
  const [agentsData, setAgentsData] = useState(mockAgentsData);
  const [usersData, setUsersData] = useState(mockUsersData);
  const [weatherData, setWeatherData] = useState(mockWeatherData);

  // Debug dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      console.log('🌙 Dark mode status:', isDark);
      console.log('📦 HTML classes:', document.documentElement.className);
      
      // Get computed styles
      const styles = getComputedStyle(document.documentElement);
      console.log('🎨 CSS Variables:');
      console.log('  --background:', styles.getPropertyValue('--background'));
      console.log('  --foreground:', styles.getPropertyValue('--foreground'));
      console.log('  --border:', styles.getPropertyValue('--border'));
    };
    
    checkDarkMode();
    
    // Set up mutation observer to watch for class changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  // Load election data asynchronously
  useEffect(() => {
    let mounted = true;

    initializeElectionData().then(data => {
      if (mounted) {
        setElectionData(data);
        setElectionLoading(false);
      }
    }).catch(error => {
      console.error('Failed to load election data:', error);
      if (mounted) {
        setElectionLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch real weather, finance, and sports data from Supabase
  const { stats: weatherStats } = useWeatherData();
  const { stats: financeStats } = useFinanceData();
  const { stats: sportsStats } = useSportsData();
  
  // Fetch news data (stored articles from database)
  const [newsStats, setNewsStats] = useState({ articlesCount: 0, providersCount: 0, loading: true, error: null as string | null });
  
  // Fetch media library stats
  const [mediaStats, setMediaStats] = useState({ totalAssets: 0, loading: true, error: null as string | null });
  
  useEffect(() => {
    let mounted = true;
    
    const fetchNewsStats = async () => {
      try {
        // Fetch stored articles count
        const articlesResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/news_dashboard/news-articles/stored?limit=1000`,
          {
            headers: { 
              Authorization: `Bearer ${publicAnonKey}`,
            }
          }
        );
        
        // Fetch active providers count
        const providersResponse = await fetch(
          `https://${projectId}.supabase.co/rest/v1/data_providers_public?select=id,is_active&category=eq.news&is_active=eq.true`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'apikey': publicAnonKey,
            }
          }
        );
        
        if (!mounted) return;
        
        let articlesCount = 0;
        let providersCount = 0;
        
        if (articlesResponse.ok) {
          const articlesData = await articlesResponse.json();
          articlesCount = articlesData.articles?.length || 0;
        }
        
        if (providersResponse.ok) {
          const providersData = await providersResponse.json();
          providersCount = providersData.length || 0;
        }
        
        setNewsStats({ articlesCount, providersCount, loading: false, error: null });
      } catch (err) {
        if (!mounted) return;
        console.error('Error fetching news stats:', err);
        setNewsStats({ articlesCount: 0, providersCount: 0, loading: false, error: String(err) });
      }
    };
    
    const fetchMediaStats = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/rest/v1/media_assets?select=id`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'apikey': publicAnonKey,
            }
          }
        );
        
        if (!mounted) return;
        
        if (response.ok) {
          const data = await response.json();
          setMediaStats({ totalAssets: data.length, loading: false, error: null });
        } else {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(errorData.message || `Failed to fetch media stats: ${response.statusText}`);
        }
      } catch (err) {
        if (!mounted) return;
        console.error('Error fetching media stats:', err);
        setMediaStats({ totalAssets: 0, loading: false, error: String(err) });
      }
    };
    
    fetchNewsStats();
    fetchMediaStats();
    return () => { mounted = false; };
  }, []);

  const handleUpdateRace = (updatedRace: Race) => {
    setElectionData(prev => ({
      ...prev,
      races: prev.races.map(race => 
        race.id === updatedRace.id ? updatedRace : race
      ),
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleUpdateCandidate = (updatedCandidate: CandidateProfile) => {
    setElectionData(prev => ({
      ...prev,
      candidates: prev.candidates?.map(candidate => 
        candidate.id === updatedCandidate.id ? updatedCandidate : candidate
      ),
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleUpdateParty = (updatedParty: Party) => {
    setElectionData(prev => ({
      ...prev,
      parties: prev.parties?.map(party =>
        party.id === updatedParty.id ? updatedParty : party
      ),
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleUpdateSecurity = (updatedSecurity: FinanceSecurityWithSnapshot) => {
    setFinanceData(prev => ({
      ...prev,
      securities: prev.securities.map(security => 
        security?.security?.id === updatedSecurity?.security?.id ? updatedSecurity : security
      ),
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleAddSecurity = (newSecurity: FinanceSecurityWithSnapshot) => {
    setFinanceData(prev => ({
      ...prev,
      securities: [...prev.securities, newSecurity],
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleDeleteSecurity = async (securityId: string) => {
    try {
      console.log(`🗑️ Deleting security: ${securityId}`);
      
      // Determine if this is a crypto or stock based on ID format
      const isCrypto = securityId.startsWith('crypto:');
      const endpoint = isCrypto 
        ? `https://${projectId}.supabase.co/functions/v1/finance_dashboard/crypto/${securityId.replace('crypto:', '')}`
        : `https://${projectId}.supabase.co/functions/v1/finance_dashboard/stocks/${securityId}`;
      
      // Call backend to delete from database
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Failed to delete: ${response.statusText}`);
      }
      
      console.log(`✅ Successfully deleted ${securityId} from backend`);
      
      // Update local state only after successful backend deletion
      setFinanceData(prev => ({
        ...prev,
        securities: prev.securities.filter(security => 
          security?.security?.id !== securityId
        ),
        lastUpdated: new Date().toISOString()
      }));
      
    } catch (error) {
      console.error('Error deleting security:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete security';
      // Show error toast (you may need to import toast from sonner)
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleUpdateSportsEntity = (updatedEntity: SportsEntityWithOverrides) => {
    setSportsData(prev => {
      const updateEntityList = (list: SportsEntityWithOverrides[]) => 
        list.map(entity => 
          entity.entity.id === updatedEntity.entity.id ? updatedEntity : entity
        );

      return {
        ...prev,
        teams: updateEntityList(prev.teams),
        players: updateEntityList(prev.players),
        games: updateEntityList(prev.games),
        venues: updateEntityList(prev.venues),
        tournaments: updateEntityList(prev.tournaments),
        lastUpdated: new Date().toISOString()
      };
    });
  };

  const handleAddSportsEntity = (newEntity: SportsEntityWithOverrides) => {
    setSportsData(prev => {
      const entity = newEntity.entity;
      
      // Determine which collection to add to based on entity properties
      let updatedData = { ...prev };
      
      if ('abbrev' in entity && 'city' in entity) {
        // Team
        updatedData.teams = [...prev.teams, newEntity];
      } else if ('name' in entity && 'bio' in entity) {
        // Player
        updatedData.players = [...prev.players, newEntity];
      } else if ('status' in entity && 'teams' in entity) {
        // Game
        updatedData.games = [...prev.games, newEntity];
      } else if ('capacity' in entity && 'address' in entity) {
        // Venue
        updatedData.venues = [...prev.venues, newEntity];
      } else if ('stage' in entity && 'participating_teams' in entity) {
        // Tournament
        updatedData.tournaments = [...prev.tournaments, newEntity];
      }
      
      return {
        ...updatedData,
        lastUpdated: new Date().toISOString()
      };
    });
  };

  const handleAddMultipleSportsEntities = (newEntities: SportsEntityWithOverrides[]) => {
    setSportsData(prev => {
      let updatedData = { ...prev };
      
      newEntities.forEach(newEntity => {
        const entity = newEntity.entity;
        
        if ('abbrev' in entity && 'city' in entity) {
          // Team
          updatedData.teams = [...updatedData.teams, newEntity];
        } else if ('name' in entity && 'bio' in entity) {
          // Player
          updatedData.players = [...updatedData.players, newEntity];
        } else if ('status' in entity && 'teams' in entity) {
          // Game
          updatedData.games = [...updatedData.games, newEntity];
        } else if ('capacity' in entity && 'address' in entity) {
          // Venue
          updatedData.venues = [...updatedData.venues, newEntity];
        } else if ('stage' in entity && 'participating_teams' in entity) {
          // Tournament
          updatedData.tournaments = [...updatedData.tournaments, newEntity];
        }
      });
      
      return {
        ...updatedData,
        lastUpdated: new Date().toISOString()
      };
    });
  };

  const handleDeleteSportsEntity = (entityId: string, view: SportsView) => {
    setSportsData(prev => {
      const filterList = (list: SportsEntityWithOverrides[]) => 
        list.filter(entity => entity.entity.id !== entityId);

      let updatedData = { ...prev };
      
      switch (view) {
        case 'teams':
          updatedData.teams = filterList(prev.teams);
          break;
        case 'players':
          updatedData.players = filterList(prev.players);
          break;
        case 'games':
          updatedData.games = filterList(prev.games);
          break;
        case 'venues':
          updatedData.venues = filterList(prev.venues);
          break;
        case 'tournaments':
          updatedData.tournaments = filterList(prev.tournaments);
          break;
      }
      
      return {
        ...updatedData,
        lastUpdated: new Date().toISOString()
      };
    });
  };

  const handleUpdateWeatherLocation = (updatedLocation: WeatherLocationWithOverrides) => {
    setWeatherData(prev => ({
      ...prev,
      locations: prev.locations.map(location => 
        location.location.id === updatedLocation.location.id ? updatedLocation : location
      ),
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleAddWeatherLocation = (newLocation: WeatherLocationWithOverrides) => {
    setWeatherData(prev => ({
      ...prev,
      locations: [...prev.locations, newLocation],
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleDeleteWeatherLocation = (locationId: string) => {
    setWeatherData(prev => ({
      ...prev,
      locations: prev.locations.filter(location => 
        location.location.id !== locationId
      ),
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleUpdateNewsArticle = (updatedArticle: NewsArticleWithOverrides) => {
    // This function is no longer used - articles are managed in the News Dashboard
  };

  const handleDeleteNewsArticle = (articleId: string) => {
    // This function is no longer used - articles are managed in the News Dashboard
  };

  const handleUpdateFeed = (updatedFeed: Feed) => {
    setFeedsData(prev => ({
      ...prev,
      feeds: prev.feeds.map(feed => 
        feed.id === updatedFeed.id ? updatedFeed : feed
      ),
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleAddFeed = (newFeed: Feed) => {
    setFeedsData(prev => ({
      ...prev,
      feeds: [...prev.feeds, newFeed],
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleDeleteFeed = (feedId: string) => {
    setFeedsData(prev => ({
      ...prev,
      feeds: prev.feeds.filter(feed => feed.id !== feedId),
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleAddAgent = (newAgent: Agent) => {
    setAgentsData(prev => ({
      ...prev,
      agents: [...prev.agents, newAgent],
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleUpdateAgent = (updatedAgent: Agent) => {
    setAgentsData(prev => ({
      ...prev,
      agents: prev.agents.map(agent => 
        agent.id === updatedAgent.id ? updatedAgent : agent
      ),
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleDeleteAgent = (agentId: string) => {
    setAgentsData(prev => ({
      ...prev,
      agents: prev.agents.filter(agent => agent.id !== agentId),
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    // Reset the initial feed category when navigating away from feeds
    if (view !== 'feeds') {
      setInitialFeedCategory(undefined);
      setInitialProviderCategory(undefined);
    }
  };

  const handleNavigateToProvidersFromSchoolClosings = () => {
    setInitialProviderCategory("school_closings");
    setCurrentView('feeds');
  };

  const renderNavigation = () => (
    <div className="flex items-center gap-2 mb-8">
      <Button
        variant={currentView === 'election' ? 'default' : 'outline'}
        onClick={() => handleNavigate('election')}
        className="gap-2"
      >
        <Vote className="w-4 h-4" />
        Elections
      </Button>
      <Button
        variant={currentView === 'finance' ? 'default' : 'outline'}
        onClick={() => handleNavigate('finance')}
        className="gap-2"
      >
        <TrendingUp className="w-4 h-4" />
        Finance
      </Button>
      <Button
        variant={currentView === 'sports' ? 'default' : 'outline'}
        onClick={() => handleNavigate('sports')}
        className="gap-2"
      >
        <Trophy className="w-4 h-4" />
        Sports
      </Button>
      <Button
        variant={currentView === 'weather' ? 'default' : 'outline'}
        onClick={() => handleNavigate('weather')}
        className="gap-2"
      >
        <Cloud className="w-4 h-4" />
        Weather
      </Button>
      <Button
        variant={currentView === 'news' ? 'default' : 'outline'}
        onClick={() => handleNavigate('news')}
        className="gap-2"
      >
        <Newspaper className="w-4 h-4" />
        News
      </Button>
      <Button
        variant={currentView === 'agents' ? 'default' : 'outline'}
        onClick={() => handleNavigate('agents')}
        className="gap-2"
      >
        <Bot className="w-4 h-4" />
        Agents
      </Button>
      <Button
        variant={currentView === 'media' ? 'default' : 'outline'}
        onClick={() => handleNavigate('media')}
        className="gap-2"
      >
        <ImageIcon className="w-4 h-4" />
        Media
      </Button>
      <Button
        variant={currentView === 'school-closings' ? 'default' : 'outline'}
        onClick={() => handleNavigate('school-closings')}
        className="gap-2"
      >
        <School className="w-4 h-4" />
        School Closings
      </Button>
    </div>
  );

  const renderHome = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <motion.div 
            className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center"
            animate={{ 
              rotate: [0, -5, 5, -5, 0],
              scale: [1, 1.05, 1.05, 1.05, 1]
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "easeInOut"
            }}
          >
            <span className="text-white font-semibold">N</span>
          </motion.div>
          <h1 className="text-3xl font-semibold font-bold">Nova Dashboard</h1>
        </div>
        <motion.p 
          className="text-muted-foreground max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Comprehensive data management and analysis tools for elections, financial markets, and sports. 
          Features real-time editing, override tracking, and advanced filtering capabilities.
        </motion.p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0
          }}
          whileHover={{ 
            y: -4,
            transition: { type: "spring", stiffness: 400, damping: 17 }
          }}
        >
        <Card className="cursor-pointer transition-shadow h-full" onClick={() => handleNavigate('election')}>
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Vote className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold">Election Dashboard</h2>
            </div>
            <p className="text-muted-foreground mb-4 flex-grow">
              View and edit AP Election data with comprehensive race tracking, candidate management, 
              and real-time status updates.
            </p>
            <div className="flex items-center gap-6 pt-4 border-t">
              <div className="flex flex-col">
                {electionLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <span className="text-2xl font-semibold">{electionData.races.length}</span>
                )}
                <span className="text-xs text-muted-foreground">races</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Real-time editing</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Override tracking</span>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1
          }}
          whileHover={{ 
            y: -4,
            transition: { type: "spring", stiffness: 400, damping: 17 }
          }}
        >
        <Card className="cursor-pointer transition-shadow h-full" onClick={() => handleNavigate('finance')}>
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold">Finance Dashboard</h2>
            </div>
            <p className="text-muted-foreground mb-4 flex-grow">
              Track market data across indices, stocks, and cryptocurrency with advanced analytics 
              and portfolio management tools.
            </p>
            <div className="flex items-center gap-6 pt-4 border-t">
              <div className="flex flex-col">
                <span className="text-2xl font-semibold">{financeStats.totalSecurities}</span>
                <span className="text-xs text-muted-foreground">securities</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  {financeStats.loading ? "..." : `${financeStats.stockCount} stocks`}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  {financeStats.loading ? "..." : `${financeStats.etfCount} ETFs`}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  {financeStats.loading ? "..." : `${financeStats.cryptoCount} crypto`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.2
          }}
          whileHover={{ 
            y: -4,
            transition: { type: "spring", stiffness: 400, damping: 17 }
          }}
        >
        <Card className="cursor-pointer transition-shadow h-full" onClick={() => handleNavigate('sports')}>
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Trophy className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold">Sports Dashboard</h2>
            </div>
            <p className="text-muted-foreground mb-4 flex-grow">
              Manage comprehensive sports data across multiple leagues with team, player, game, 
              and venue tracking from multiple providers.
            </p>
            <div className="flex items-center gap-6 pt-4 border-t">
              <div className="flex flex-col">
                <span className="text-2xl font-semibold">{sportsStats.totalTeams}</span>
                <span className="text-xs text-muted-foreground">teams</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold">{sportsStats.totalTournaments}</span>
                <span className="text-xs text-muted-foreground">tournaments</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  {sportsStats.hasActiveProvider ? 'Multi-league' : 'No provider'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.3
          }}
          whileHover={{ 
            y: -4,
            transition: { type: "spring", stiffness: 400, damping: 17 }
          }}
        >
        <Card className="cursor-pointer transition-shadow h-full" onClick={() => handleNavigate('weather')}>
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Cloud className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold">Weather Dashboard</h2>
            </div>
            <p className="text-muted-foreground mb-4 flex-grow">
              Monitor comprehensive weather data with current conditions, forecasts, alerts, 
              and specialized data including tropical systems and air quality.
            </p>
            <div className="flex items-center gap-6 pt-4 border-t">
              <div className="flex flex-col">
                <span className="text-2xl font-semibold">{weatherStats.totalLocations}</span>
                <span className="text-xs text-muted-foreground">locations</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold">{weatherStats.activeAlerts}</span>
                <span className="text-xs text-muted-foreground">alerts</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  {weatherStats.loading ? "Loading..." : weatherStats.error ? "Error" : "Real-time data"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.4
          }}
          whileHover={{ 
            y: -4,
            transition: { type: "spring", stiffness: 400, damping: 17 }
          }}
        >
        <Card className="cursor-pointer transition-shadow h-full" onClick={() => handleNavigate('news')}>
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Newspaper className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-xl font-semibold">News Dashboard</h2>
            </div>
            <p className="text-muted-foreground mb-4 flex-grow">
              Monitor breaking news across multiple news providers including NewsAPI and NewsData.
            </p>
            <div className="flex items-center gap-6 pt-4 border-t">
              <div className="flex flex-col">
                {newsStats.loading ? (
                  <>
                    <span className="text-2xl font-semibold">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </span>
                    <span className="text-xs text-muted-foreground">Loading...</span>
                  </>
                ) : newsStats.error ? (
                  <>
                    <span className="text-2xl font-semibold text-orange-500">!</span>
                    <span className="text-xs text-muted-foreground">Error</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-semibold">{newsStats.articlesCount}</span>
                    <span className="text-xs text-muted-foreground">articles</span>
                  </>
                )}
              </div>
              <div className="flex flex-col">
                {newsStats.loading ? (
                  <>
                    <span className="text-2xl font-semibold">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </span>
                    <span className="text-xs text-muted-foreground">Loading...</span>
                  </>
                ) : newsStats.error ? (
                  <>
                    <span className="text-2xl font-semibold text-orange-500">!</span>
                    <span className="text-xs text-muted-foreground">Error</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-semibold">{newsStats.providersCount}</span>
                    <span className="text-xs text-muted-foreground">providers</span>
                  </>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  {newsStats.loading ? "Loading..." : newsStats.error ? "Error" : "Stored"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.5
          }}
          whileHover={{ 
            y: -4,
            transition: { type: "spring", stiffness: 400, damping: 17 }
          }}
        >
        <Card className="cursor-pointer transition-shadow h-full" onClick={() => handleNavigate('agents')}>
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold">Agents</h2>
            </div>
            <p className="text-muted-foreground mb-4 flex-grow">
              AI-powered content curation and automated data feeds that intelligently 
              aggregate and prioritize information based on your preferences and workflows.
            </p>
            <div className="flex items-center gap-6 pt-4 border-t">
              <div className="flex flex-col">
                <span className="text-2xl font-semibold">{agentsData.agents.length}</span>
                <span className="text-xs text-muted-foreground">agents</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold">{agentsData.agents.filter(a => a.status === 'ACTIVE').length}</span>
                <span className="text-xs text-muted-foreground">active</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">AI curation</span>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.6
          }}
          whileHover={{ 
            y: -4,
            transition: { type: "spring", stiffness: 400, damping: 17 }
          }}
        >
        <Card className="cursor-pointer transition-shadow h-full" onClick={() => handleNavigate('school-closings')}>
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <School className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-semibold">School Closings</h2>
            </div>
            <p className="text-muted-foreground mb-4 flex-grow">
              Monitor school closings, delays, and early dismissals across multiple districts with real-time status updates and location tracking.
            </p>
            <div className="flex items-center gap-6 pt-4 border-t">
              <div className="flex flex-col">
                <span className="text-2xl font-semibold">6</span>
                <span className="text-xs text-muted-foreground">closings</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold">2</span>
                <span className="text-xs text-muted-foreground">delays</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Multi-county</span>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.7
          }}
          whileHover={{ 
            y: -4,
            transition: { type: "spring", stiffness: 400, damping: 17 }
          }}
        >
        <Card className="cursor-pointer transition-shadow h-full" onClick={() => handleNavigate('media')}>
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                <ImageIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-semibold">Media Library</h2>
            </div>
            <p className="text-muted-foreground mb-4 flex-grow">
              Manage and organize your media assets including images, videos, and audio files with advanced search and bulk operations.
            </p>
            <div className="flex items-center gap-6 pt-4 border-t">
              <div className="flex flex-col">
                <span className="text-2xl font-semibold">{mediaStats.totalAssets}</span>
                <span className="text-xs text-muted-foreground">assets</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold">0</span>
                <span className="text-xs text-muted-foreground">uploads</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Cloud storage</span>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'election':
        return (
          <ElectionDashboard
            races={electionData.races}
            candidates={electionData.candidates}
            parties={electionData.parties}
            onUpdateRace={handleUpdateRace}
            //onUpdateCandidate={handleUpdateCandidate}
            //onUpdateParty={handleUpdateParty}
            lastUpdated={electionData.lastUpdated}
            onNavigateToFeeds={() => {
              setInitialFeedCategory('Elections');
              setCurrentView('feeds');
            }}
          />
        );
      case 'finance':
        return (
          <FinanceDashboard
            securities={financeData.securities}
            onUpdateSecurity={handleUpdateSecurity}
            onAddSecurity={handleAddSecurity}
            onDeleteSecurity={handleDeleteSecurity}
            lastUpdated={financeData.lastUpdated}
            onNavigateToFeeds={() => {
              setInitialFeedCategory('Finance');
              setCurrentView('feeds');
            }}
          />
        );
      case 'sports':
        return (
          <SportsDashboard
            onNavigateToFeeds={() => {
              setInitialFeedCategory('Sports');
              setCurrentView('feeds');
            }}
          />
        );
      case 'weather':
        return (
          <WeatherDashboard
            onNavigateToFeeds={() => {
              setInitialFeedCategory('Weather');
              setCurrentView('feeds');
            }}
            onNavigateToProviders={() => {
              setInitialFeedCategory('Weather');
              setCurrentView('feeds');
            }}
          />
        );
      case 'weather-data':
        return <WeatherDataViewer />;
      case 'news':
        return (
          <NewsDashboard
            onNavigateToFeeds={() => {
              setInitialFeedCategory('News');
              setCurrentView('feeds');
            }}
          />
        );
      case 'feeds':
        return (
          <FeedsDashboardWithSupabase
            initialCategory={initialFeedCategory || initialProviderCategory}
          />
        );
      case 'agents':
        return (
          <AgentsDashboard
            agents={agentsData.agents}
            feeds={[]} // Feeds are now loaded from Supabase in the feeds dashboard
            onAddAgent={handleAddAgent}
            onUpdateAgent={handleUpdateAgent}
            onDeleteAgent={handleDeleteAgent}
            lastUpdated={agentsData.lastUpdated}
          />
        );
      case 'users-groups':
        return (
          <UsersGroupsPage
            users={usersData.users}
            groups={usersData.groups}
            roles={usersData.roles}
            permissions={usersData.permissions}
            lastUpdated={usersData.lastUpdated}
          />
        );
      case 'ai-connections':
        return <AIConnectionsDashboard />;
      case 'media':
        return (
          <MediaLibrary
            onNavigate={(view) => console.log('Navigate to:', view)}
          />
        );
      case 'channels':
        return (
          <ChannelsPage />
        );
      case 'school-closings':
        return (
          <SchoolClosingsDashboard 
            onNavigateToProviders={handleNavigateToProvidersFromSchoolClosings}
          />
        );
      default:
        return renderHome();
    }
  };

  const handleUpdateUser = (updatedUser: Partial<any>) => {
    setUsersData(prev => ({
      ...prev,
      users: prev.users.map(user => 
        user.id === prev.users[0].id 
          ? { ...user, ...updatedUser }
          : user
      ),
      lastUpdated: new Date().toISOString()
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <TopMenuBar 
        onNavigate={(view) => handleNavigate(view as AppView)} 
        currentUser={usersData.users[0]} 
        roles={usersData.roles}
        permissions={usersData.permissions}
        onUpdateUser={handleUpdateUser}
      />
      <div className="container mx-auto px-4 py-8">
        {currentView !== 'home' && currentView !== 'users-groups' && currentView !== 'feeds' && currentView !== 'ai-connections' && renderNavigation()}
        {renderContent()}
      </div>
    </div>
  );
}