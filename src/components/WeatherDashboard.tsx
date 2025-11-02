import { useState, useMemo, useEffect, useRef } from "react";
import { WeatherLocationWithOverrides, WeatherView, isFieldOverridden, getFieldValue, SavedWeatherLocation } from "../types/weather";
import { WeatherCard } from "./WeatherCard";
import { WeatherFilters } from "./WeatherFilters";
import { WeatherAIInsights } from "./WeatherAIInsights";
import { WeatherLocationSearch } from "./WeatherLocationSearch";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "./ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { useWeatherData } from "../utils/useWeatherData";
import { useLocalStorage } from "../utils/useLocalStorage";

import { 
  RefreshCw, 
  Plus, 
  Cloud, 
  Sun, 
  AlertTriangle, 
  Wind,
  Thermometer,
  Droplets,
  TrendingUp,
  TrendingDown,
  Database,
  X
} from "lucide-react";

interface WeatherDashboardProps {
  onNavigateToFeeds?: () => void;
  onNavigateToProviders?: () => void;
}

export function WeatherDashboard({ 
  onNavigateToFeeds,
  onNavigateToProviders
}: WeatherDashboardProps) {
  // Use the useWeatherData hook which handles override processing
  const { stats: weatherDataStats, refresh: refreshWeatherData } = useWeatherData();
  
  const [currentView, setCurrentView] = useState<WeatherView>('current');
  const [filteredLocations, setFilteredLocations] = useState<WeatherLocationWithOverrides[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [refreshing, setRefreshing] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [aiInsightsDialogOpen, setAIInsightsDialogOpen] = useState(false);
  const [selectedLocationForAI, setSelectedLocationForAI] = useState<string | undefined>();
  const [weatherProviders, setWeatherProviders] = useState<any[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<string>("en");
  
  // Overrides dialog state
  const [overridesDialogOpen, setOverridesDialogOpen] = useState(false);
  const [overrides, setOverrides] = useState<Array<{ id: number; name: string; custom_name: string; lat: number; lon: number }>>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [removingOverride, setRemovingOverride] = useState<number | null>(null);
  
  // Use localStorage for sticky pagination that survives re-renders and refreshes
  const [currentPage, setCurrentPage] = useLocalStorage("weather-dashboard-page", 1);
  const locationsPerPage = 9;
  const previousLocationCountRef = useRef<number>(0);
  
  // Destructure from the hook stats
  const locations = weatherDataStats.locations;
  const loading = weatherDataStats.loading;
  const lastUpdated = weatherDataStats.lastUpdated;

  // Fetch weather providers from backend using RPC
  const fetchWeatherProviders = async () => {
    try {
      const url = `https://${projectId}.supabase.co/rest/v1/rpc/list_providers_with_status_category`;
      console.log("Fetching weather providers from RPC:", url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          apikey: publicAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_category: 'weather' }),
      });

      if (!response.ok) {
        console.error("Failed to fetch weather providers. Status:", response.status);
        throw new Error(`Failed to fetch weather providers: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched weather providers from RPC:", data);
      
      // Transform RPC response to expected format
      const formattedProviders = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: p.category,
        isActive: p.is_active,
        apiKeyConfigured: p.api_key_configured,
      }));
      
      setWeatherProviders(formattedProviders);
      
      // For language, we need to fetch full details of the active provider
      const activeProvider = formattedProviders.find((p: any) => p.isActive);
      if (activeProvider) {
        await fetchProviderLanguage(activeProvider.id);
      }
    } catch (error) {
      console.error("Error fetching weather providers:", error);
      setWeatherProviders([]);
    }
  };
  
  // Fetch language config from the active provider
  const fetchProviderLanguage = async (providerId: string) => {
    try {
      const url = `https://${projectId}.supabase.co/rest/v1/rpc/get_provider_details`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          apikey: publicAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_id: providerId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const providerDetails = data[0];
          const config = providerDetails.config || {};
          if (config.language) {
            setCurrentLanguage(config.language);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching provider language:", error);
    }
  };

  // Fetch weather providers
  useEffect(() => {
    fetchWeatherProviders();
    
    // Refresh providers every 5 minutes
    const interval = setInterval(() => {
      fetchWeatherProviders();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Update filtered locations when locations change
  useEffect(() => {
    setFilteredLocations(locations);
    
    // Reset to page 1 only when the count actually changes (add/delete), not on data refresh
    const currentCount = locations.length;
    if (currentCount !== previousLocationCountRef.current) {
      setCurrentPage(1);
      previousLocationCountRef.current = currentCount;
    }
    
    // Ensure current page doesn't exceed total pages (e.g., after deletion)
    const totalPages = Math.ceil(currentCount / locationsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [locations, currentPage, locationsPerPage, setCurrentPage]);

  // fetchWeatherData is now handled by useWeatherData hook
  // Error handling for provider configuration
  useEffect(() => {
    if (!loading && weatherDataStats.error && weatherDataStats.error.includes("No active weather provider")) {
      toast.error("No weather provider configured", {
        description: "Go to Data Feeds → Weather to configure providers",
        action: {
          label: "Go to Feeds",
          onClick: onNavigateToProviders,
        },
      });
    }
  }, [weatherDataStats.error, loading, onNavigateToProviders]);

  const handleAddLocation = async (newLocation: SavedWeatherLocation) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/weather-locations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(newLocation),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add location");
      }

      toast.success(`Added ${newLocation.name} to weather monitoring`);
      
      // Refresh weather data
      await refreshWeatherData();
    } catch (error) {
      console.error("Error adding location:", error);
      toast.error("Failed to add location");
    }
  };

  const handleDeleteLocation = async (locationId: string, locationName: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/weather-locations/${locationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete location");
      }

      // Show success toast
      toast.success(`Deleted ${locationName}`);
      
      // Refresh weather data
      await refreshWeatherData();
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error(
        <div className="space-y-1">
          <div className="font-semibold">❌ Delete Failed</div>
          <div className="text-sm">
            {error instanceof Error ? error.message : "Failed to delete location"}
          </div>
        </div>,
        {
          duration: 5000,
        }
      );
    }
  };

  const handleUpdateLocation = async (updatedLocation: WeatherLocationWithOverrides) => {
    // Note: The override saving happens inside WeatherCard via API calls
    // This function is called after a successful save to trigger a refresh
    // We refresh the data to get the updated values from the backend
    await refreshWeatherData();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshWeatherData();
    setRefreshing(false);
  };

  const handleOpenAIInsights = (locationId?: string) => {
    setSelectedLocationForAI(locationId);
    setAIInsightsDialogOpen(true);
  };

  const handleOpenOverridesDialog = async () => {
    setOverridesDialogOpen(true);
    setLoadingOverrides(true);
    
    try {
      // Fetch all weather locations with custom names from weather_locations table
      const response = await fetch(
        `https://${projectId}.supabase.co/rest/v1/weather_locations?select=id,name,custom_name,lat,lon&custom_name=not.is.null`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            apikey: publicAnonKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch overrides: ${response.statusText}`);
      }

      const data = await response.json();
      setOverrides(data || []);
      console.log(`📋 Loaded ${data.length} custom name overrides`);
    } catch (error) {
      console.error("Error fetching overrides:", error);
      toast.error("Failed to load overrides");
    } finally {
      setLoadingOverrides(false);
    }
  };

  const handleRemoveOverride = async (locationId: number) => {
    setRemovingOverride(locationId);
    
    try {
      // Update the location to set custom_name to null
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/weather-locations/${locationId}`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ custom_name: null })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      // Remove from local state
      setOverrides(prev => prev.filter(o => o.id !== locationId));
      
      toast.success(`Removed custom name override`);
      
      // Refresh backend data to update the main view
      await refreshWeatherData();
    } catch (error) {
      console.error("Error removing override:", error);
      toast.error(`Failed to remove override: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setRemovingOverride(null);
    }
  };

  const handleRemoveAllOverrides = async () => {
    if (overrides.length === 0) return;
    
    const confirmRemove = window.confirm(
      `Remove all ${overrides.length} custom name overrides? This action cannot be undone.`
    );
    
    if (!confirmRemove) return;
    
    setLoadingOverrides(true);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const override of overrides) {
        try {
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/weather-locations/${override.id}`,
            {
              method: "PUT",
              headers: {
                "Authorization": `Bearer ${publicAnonKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ custom_name: null })
            }
          );
          
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Failed to remove override for location ${override.id}:`, error);
          failCount++;
        }
      }
      
      setOverrides([]);
      
      if (failCount > 0) {
        toast.warning(`Removed ${successCount} overrides, ${failCount} failed`);
      } else {
        toast.success(`Removed all ${successCount} custom name overrides`);
      }
      
      // Refresh backend data to update the main view
      await refreshWeatherData();
    } catch (error) {
      console.error("Error removing all overrides:", error);
      toast.error("Failed to remove all overrides");
    } finally {
      setLoadingOverrides(false);
    }
  };

  // Memoize pagination calculation to prevent unnecessary recalculations
  const { totalPages, paginatedLocations } = useMemo(() => {
    // Sort the filtered locations
    const sorted = [...filteredLocations].sort((a, b) => {
      const aName = getFieldValue(a.location.name) || '';
      const bName = getFieldValue(b.location.name) || '';
      
      if (sortOrder === "asc") {
        return aName.localeCompare(bName);
      } else {
        return bName.localeCompare(aName);
      }
    });
    
    const total = Math.ceil(sorted.length / locationsPerPage);
    const startIndex = (currentPage - 1) * locationsPerPage;
    const endIndex = startIndex + locationsPerPage;
    const paginated = sorted.slice(startIndex, endIndex);
    
    return {
      totalPages: total,
      paginatedLocations: paginated
    };
  }, [filteredLocations, currentPage, locationsPerPage, sortOrder]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of cards
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Summary statistics
  const stats = useMemo(() => {
    const alertLocations = locations.filter(loc => loc.data.alerts.length > 0);
    
    // Calculate override statistics
    const locationsWithOverrides = locations.filter(location => {
      // Check if any field in the location has overrides
      return isFieldOverridden(location.location.name) ||
             isFieldOverridden(location.location.admin1) ||
             isFieldOverridden(location.location.country) ||
             isFieldOverridden(location.data.current.temperature.value) ||
             isFieldOverridden(location.data.current.summary) ||
             isFieldOverridden(location.data.current.humidity) ||
             isFieldOverridden(location.data.current.uvIndex);
    });

    const totalOverriddenFields = locations.reduce((total, location) => {
      let fieldCount = 0;
      if (isFieldOverridden(location.location.name)) fieldCount++;
      if (isFieldOverridden(location.location.admin1)) fieldCount++;
      if (isFieldOverridden(location.location.country)) fieldCount++;
      if (isFieldOverridden(location.data.current.temperature.value)) fieldCount++;
      if (isFieldOverridden(location.data.current.summary)) fieldCount++;
      if (isFieldOverridden(location.data.current.humidity)) fieldCount++;
      if (isFieldOverridden(location.data.current.uvIndex)) fieldCount++;
      return total + fieldCount;
    }, 0);
    
    // Get provider names from weather providers
    const providerNames = weatherProviders.map(p => p.name).filter(Boolean);
    
    return {
      totalLocations: locations.length,
      activeAlerts: alertLocations.length,
      providers: providerNames,
      alertLocations,
      tropicalSystems: locations.reduce((sum, loc) => sum + (loc.data.tropical?.systems?.length || 0), 0),
      locationsWithOverrides: locationsWithOverrides.length,
      totalOverriddenFields
    };
  }, [locations, weatherProviders]);

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
              <Thermometer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Number of Locations</p>
              <p className="text-2xl mb-0.5">{stats.totalLocations}</p>
              <p className="text-xs text-muted-foreground">Monitoring sites</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card 
        className={`cursor-pointer transition-all ${
          stats.locationsWithOverrides > 0 
            ? 'hover:border-amber-600 hover:shadow-md' 
            : 'hover:border-muted-foreground/50'
        }`}
        onClick={handleOpenOverridesDialog}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded ${
              stats.locationsWithOverrides > 0 
                ? 'bg-amber-100 dark:bg-amber-900/20' 
                : 'bg-gray-100 dark:bg-gray-900/20'
            }`}>
              <Database className={`w-5 h-5 ${
                stats.locationsWithOverrides > 0 
                  ? 'text-amber-600 dark:text-amber-400' 
                  : 'text-gray-600 dark:text-gray-400'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Data Overrides</p>
              <p className="text-2xl mb-0.5">{stats.locationsWithOverrides}</p>
              <p className="text-xs text-muted-foreground">
                {stats.locationsWithOverrides > 0 
                  ? `${stats.locationsWithOverrides} location${stats.locationsWithOverrides !== 1 ? 's' : ''} modified` 
                  : 'No changes made'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <WeatherAIInsights 
        locations={filteredLocations} 
        compact={true} 
        onClick={() => setShowAIInsights(!showAIInsights)}
      />

      <Card>
        <CardContent className="p-4">
          <div 
            className={onNavigateToFeeds ? "flex items-start gap-3 cursor-pointer" : "flex items-start gap-3"}
            onClick={onNavigateToFeeds}
          >
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded">
              <Wind className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Data Providers</p>
              <p className="text-2xl mb-0.5">{stats.providers.length}</p>
              <Badge variant="secondary" className="text-xs">
                {stats.providers[0] || 'No provider'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground">Loading weather data...</p>
          <p className="text-xs text-muted-foreground">Fetching from weather provider...</p>
        </div>
      </div>
    );
  }

  // Show helpful message when no locations are configured
  if (locations.length === 0 && !loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="flex items-center gap-2 mb-1">
              <Cloud className="w-6 h-6 text-blue-600" />
              Weather Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor weather conditions with real-time data and forecasts
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-xs text-muted-foreground">
              Last updated {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <Cloud className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="mb-2">No Weather Locations</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Add locations to start monitoring weather conditions. You'll need to configure a weather provider first.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={onNavigateToProviders} className="gap-2">
                <Wind className="w-4 h-4" />
                Manage Weather Providers
              </Button>
              <WeatherLocationSearch 
                onAddLocation={handleAddLocation}
                existingLocationIds={[]}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="flex items-center gap-2 mb-1 text-[24px]">
            <Cloud className="w-6 h-6 text-blue-600" />
            Weather Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor conditions across {stats.totalLocations} locations with real-time data and forecasts
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-xs text-muted-foreground">
            Last updated {new Date(lastUpdated).toLocaleTimeString()}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <WeatherLocationSearch 
              onAddLocation={handleAddLocation}
              existingLocationIds={locations.map(loc => loc.location.id)}
            />
          </div>
        </div>
      </div>

      {renderSummaryCards()}

      {/* AI Insights Section - Always rendered for dialog access */}
      {showAIInsights && (
        <WeatherAIInsights 
          locations={filteredLocations} 
          listView={true}
        />
      )}
      
      {/* AI Insights Dialog - Opened from location cards */}
      <WeatherAIInsights 
        locations={locations} 
        open={aiInsightsDialogOpen}
        onOpenChange={setAIInsightsDialogOpen}
        defaultLocationId={selectedLocationForAI}
        listView={false}
      />

      <WeatherFilters
        locations={locations}
        onFilterChange={(filtered) => {
          setFilteredLocations(filtered);
          setCurrentPage(1); // Reset to first page when filters change
        }}
        currentView={currentView}
        onViewChange={setCurrentView}
        currentPage={currentPage}
        totalPages={totalPages}
        totalResults={filteredLocations.length}
        onPageChange={handlePageChange}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
      />



      {/* Alert Summary - Only show when alerts view is active */}
      {stats.activeAlerts > 0 && currentView === 'alerts' && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-800 dark:text-red-200">Active Weather Alerts</h3>
              <Badge variant="destructive">{stats.activeAlerts} locations</Badge>
            </div>
            <div className="grid gap-2">
              {stats.alertLocations.slice(0, 3).map((location) => (
                <div key={location.location.id} className="flex items-center justify-between text-sm">
                  <span>{getFieldValue(location.location.name)}: {location.data.alerts[0].event}</span>
                  <Badge variant="outline" className="text-xs">
                    {location.data.alerts[0].severity}
                  </Badge>
                </div>
              ))}
              {stats.alertLocations.length > 3 && (
                <div className="text-sm text-muted-foreground">
                  +{stats.alertLocations.length - 3} more locations with alerts
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {paginatedLocations.map((location) => (
          <WeatherCard
            key={location.location.id}
            location={location}
            onUpdate={handleUpdateLocation}
            onDelete={handleDeleteLocation}
            onRefresh={refreshWeatherData}
            onAIInsights={handleOpenAIInsights}
            view={currentView}
            language={currentLanguage}
          />
        ))}
      </div>

      {filteredLocations.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Cloud className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No locations found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters or search criteria
            </p>
            <Button 
              variant="outline" 
              onClick={() => setFilteredLocations(locations)}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tropical Systems Summary - Only show when tropical view is active */}
      {stats.tropicalSystems > 0 && currentView === 'tropical' && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Cloud className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold">Active Tropical Systems</h3>
                <p className="text-sm text-muted-foreground">
                  {stats.tropicalSystems} active system{stats.tropicalSystems !== 1 ? 's' : ''} being tracked
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Name Overrides Dialog */}
      <Dialog open={overridesDialogOpen} onOpenChange={setOverridesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-600" />
              Custom Name Overrides
            </DialogTitle>
            <DialogDescription>
              Manage custom names for weather locations. Overrides replace the original location names.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {loadingOverrides ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : overrides.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No custom name overrides found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Edit location names in cards to create overrides
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Summary Card */}
                <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                          {overrides.length} Custom Name{overrides.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Button
                        onClick={handleRemoveAllOverrides}
                        variant="destructive"
                        size="sm"
                        disabled={loadingOverrides}
                      >
                        Remove All
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Overrides List */}
                {overrides.map((override) => (
                  <Card key={override.id} className="hover:border-amber-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {override.lat.toFixed(4)}, {override.lon.toFixed(4)}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs text-muted-foreground">Original:</span>
                              <span className="text-muted-foreground line-through">
                                {override.name}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs text-muted-foreground">Custom:</span>
                              <span className="font-semibold text-amber-700 dark:text-amber-400">
                                {override.custom_name}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => handleRemoveOverride(override.id)}
                          variant="ghost"
                          size="sm"
                          disabled={removingOverride === override.id}
                          className="hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/20"
                        >
                          {removingOverride === override.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button onClick={() => setOverridesDialogOpen(false)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}