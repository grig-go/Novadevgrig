import { useState } from "react";
import { SavedWeatherLocation } from "../types/weather";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { toast } from "sonner@2.0.3";
import { Search, Plus, Loader2, MapPin, Thermometer, Wind, Droplets, Eye, AlertTriangle, Sun, Cloud } from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface WeatherLocationSearchProps {
  onAddLocation: (location: SavedWeatherLocation) => void;
  existingLocationIds: string[];
}

interface LocationSearchResult {
  id: string;
  name: string;
  admin1: string;
  country: string;
  lat: number;
  lon: number;
  elevation_m?: number;
  stationId?: string;
  currentTemp?: number;
  currentCondition?: string;
  alerts?: number;
}

// Mock available locations that can be added
const availableLocations: LocationSearchResult[] = [
  {
    id: "seattle-wa",
    name: "Seattle, WA",
    admin1: "Washington",
    country: "United States",
    lat: 47.6062,
    lon: -122.3321,
    elevation_m: 56,
    stationId: "KSEA",
    currentTemp: 58,
    currentCondition: "Partly Cloudy",
    alerts: 0
  },
  {
    id: "portland-or",
    name: "Portland, OR", 
    admin1: "Oregon",
    country: "United States",
    lat: 45.5152,
    lon: -122.6784,
    elevation_m: 15,
    stationId: "KPDX",
    currentTemp: 62,
    currentCondition: "Overcast",
    alerts: 0
  },
  {
    id: "phoenix-az",
    name: "Phoenix, AZ",
    admin1: "Arizona", 
    country: "United States",
    lat: 33.4484,
    lon: -112.0740,
    elevation_m: 331,
    stationId: "KPHX",
    currentTemp: 95,
    currentCondition: "Sunny",
    alerts: 1
  },
  {
    id: "chicago-il",
    name: "Chicago, IL",
    admin1: "Illinois",
    country: "United States", 
    lat: 41.8781,
    lon: -87.6298,
    elevation_m: 181,
    stationId: "KORD",
    currentTemp: 67,
    currentCondition: "Cloudy",
    alerts: 0
  },
  {
    id: "houston-tx",
    name: "Houston, TX",
    admin1: "Texas",
    country: "United States",
    lat: 29.7604,
    lon: -95.3698,
    elevation_m: 13,
    stationId: "KIAH",
    currentTemp: 84,
    currentCondition: "Humid",
    alerts: 0
  },
  {
    id: "atlanta-ga", 
    name: "Atlanta, GA",
    admin1: "Georgia",
    country: "United States",
    lat: 33.7490,
    lon: -84.3880,
    elevation_m: 320,
    stationId: "KATL",
    currentTemp: 78,
    currentCondition: "Partly Sunny",
    alerts: 0
  },
  {
    id: "boston-ma",
    name: "Boston, MA",
    admin1: "Massachusetts", 
    country: "United States",
    lat: 42.3601,
    lon: -71.0589,
    elevation_m: 5,
    stationId: "KBOS",
    currentTemp: 64,
    currentCondition: "Clear",
    alerts: 0
  },
  {
    id: "las-vegas-nv",
    name: "Las Vegas, NV",
    admin1: "Nevada",
    country: "United States",
    lat: 36.1699,
    lon: -115.1398,
    elevation_m: 610,
    stationId: "KLAS",
    currentTemp: 89,
    currentCondition: "Sunny",
    alerts: 0
  },
  {
    id: "san-francisco-ca",
    name: "San Francisco, CA",
    admin1: "California",
    country: "United States", 
    lat: 37.7749,
    lon: -122.4194,
    elevation_m: 16,
    stationId: "KSFO",
    currentTemp: 66,
    currentCondition: "Foggy",
    alerts: 0
  },
  {
    id: "new-york-ny", 
    name: "New York, NY",
    admin1: "New York",
    country: "United States",
    lat: 40.7128,
    lon: -74.0060,
    elevation_m: 10,
    stationId: "KJFK", 
    currentTemp: 71,
    currentCondition: "Partly Cloudy",
    alerts: 0
  },
  {
    id: "toronto-on",
    name: "Toronto, ON",
    admin1: "Ontario",
    country: "Canada",
    lat: 43.6532,
    lon: -79.3832,
    elevation_m: 76,
    stationId: "CYYZ",
    currentTemp: 59,
    currentCondition: "Cloudy",
    alerts: 0
  },
  {
    id: "vancouver-bc",
    name: "Vancouver, BC", 
    admin1: "British Columbia",
    country: "Canada",
    lat: 49.2827,
    lon: -123.1207,
    elevation_m: 4,
    stationId: "CYVR",
    currentTemp: 61,
    currentCondition: "Rainy",
    alerts: 0
  },
  {
    id: "london-uk",
    name: "London, UK",
    admin1: "England",
    country: "United Kingdom",
    lat: 51.5074,
    lon: -0.1278,
    elevation_m: 11,
    stationId: "EGLL",
    currentTemp: 55,
    currentCondition: "Drizzle",
    alerts: 0
  },
  {
    id: "paris-fr",
    name: "Paris, France",
    admin1: "Île-de-France",
    country: "France",
    lat: 48.8566,
    lon: 2.3522,
    elevation_m: 35,
    stationId: "LFPG",
    currentTemp: 63,
    currentCondition: "Overcast",
    alerts: 0
  },
  {
    id: "tokyo-jp",
    name: "Tokyo, Japan",
    admin1: "Tokyo",
    country: "Japan",
    lat: 35.6762,
    lon: 139.6503,
    elevation_m: 6,
    stationId: "RJTT",
    currentTemp: 72,
    currentCondition: "Humid",
    alerts: 0
  },
  {
    id: "sydney-au",
    name: "Sydney, Australia",
    admin1: "New South Wales", 
    country: "Australia",
    lat: -33.8688,
    lon: 151.2093,
    elevation_m: 6,
    stationId: "YSSY",
    currentTemp: 69,
    currentCondition: "Sunny",
    alerts: 0
  }
];

// Mock API function to simulate location lookup
const mockLocationLookup = async (query: string): Promise<LocationSearchResult[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) {
    return [];
  }
  
  // Search for matches
  const matches = availableLocations.filter(location => 
    location.name.toLowerCase().includes(lowerQuery) ||
    location.admin1.toLowerCase().includes(lowerQuery) ||
    location.country.toLowerCase().includes(lowerQuery) ||
    location.id.toLowerCase().includes(lowerQuery)
  );
  
  if (matches.length === 0) {
    throw new Error(`No locations found for "${query}". Try cities like Seattle, Portland, Phoenix, Chicago, Houston, Atlanta, Boston, Las Vegas, San Francisco, New York, Toronto, Vancouver, London, Paris, Tokyo, or Sydney.`);
  }
  
  return matches;
};

const createFieldOverride = <T,>(value: T) => ({
  value,
  original: value,
  isOverridden: false
});

// Helper function to generate weather data for a new location
const generateWeatherData = (location: LocationSearchResult): WeatherLocationWithOverrides => {
  const now = new Date().toISOString();
  
  return {
    location: {
      id: location.id,
      name: location.name,
      admin1: location.admin1,
      country: location.country,
      lat: location.lat,
      lon: location.lon,
      elevation_m: location.elevation_m || 0,
      stationId: location.stationId || `STN${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    },
    data: {
      version: "1.1.0",
      product: "Emergent Weather",
      location: {
        id: location.id,
        name: location.name,
        admin1: location.admin1,
        country: location.country,
        lat: location.lat,
        lon: location.lon,
        elevation_m: location.elevation_m || 0,
        stationId: location.stationId || `STN${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      },
      current: {
        asOf: now,
        summary: location.currentCondition || "Partly Cloudy",
        icon: "partly-cloudy-day",
        temperature: { value: location.currentTemp || 70, unit: "°F" },
        feelsLike: { value: (location.currentTemp || 70) + Math.random() * 4 - 2, unit: "°F" },
        dewPoint: { value: (location.currentTemp || 70) - 20 + Math.random() * 6, unit: "°F" },
        humidity: 0.45 + Math.random() * 0.30,
        pressure: { value: 30.0 + Math.random() * 0.4, unit: "inHg", tendency: "steady" },
        wind: {
          speed: { value: 5 + Math.random() * 15, unit: "mph" },
          gust: { value: 10 + Math.random() * 20, unit: "mph" },
          direction_deg: Math.round(Math.random() * 360),
          direction_cardinal: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.floor(Math.random() * 8)]
        },
        visibility: { value: 10 + Math.random() * 5, unit: "mi" },
        cloudCover: Math.random() * 0.8,
        uvIndex: Math.round(Math.random() * 10),
        precipLastHr: { value: 0, unit: "in" },
        precipType: "none",
        snowDepth: { value: 0, unit: "in" },
        sun: {
          sunrise: new Date(new Date().setHours(6, 30)).toISOString(),
          sunset: new Date(new Date().setHours(18, 45)).toISOString(),
          moonPhase: "waxing-crescent",
          illumination: Math.random()
        },
        airQuality: {
          aqi: 50 + Math.round(Math.random() * 100),
          category: "Good",
          pm25: 5 + Math.random() * 20,
          pm10: 10 + Math.random() * 30,
          o3: 20 + Math.random() * 40,
          no2: 10 + Math.random() * 20,
          so2: 2 + Math.random() * 8,
          co: 0.5 + Math.random() * 1.5,
          standard: "EPA_US"
        },
        pollen: {
          tree: Math.floor(Math.random() * 4),
          grass: Math.floor(Math.random() * 4), 
          weed: Math.floor(Math.random() * 4),
          risk: "Low"
        }
      },
      hourly: {
        stepHours: 1,
        items: []
      },
      daily: {
        items: []
      },
      alerts: location.alerts > 0 ? [{
        id: `alert_${Date.now()}`,
        title: "Heat Advisory",
        event: "Heat Advisory",
        severity: "Moderate",
        urgency: "Expected",
        certainty: "Likely",
        description: "Excessive heat warning. Take precautions to avoid heat-related illness.",
        source: "National Weather Service",
        areas: [location.name],
        effective: now,
        onset: now,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }] : []
    },
    overrides: {}
  };
};

export function WeatherLocationSearch({ onAddLocation, existingLocationIds }: WeatherLocationSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [noProviderConfigured, setNoProviderConfigured] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Please enter a location to search");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setNoProviderConfigured(false);
    
    try {
      // Use backend API for location search
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/weather-locations/search?q=${encodeURIComponent(searchTerm.trim())}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Check if it's a "no provider" error
        if (data.error === "No active weather provider configured") {
          setNoProviderConfigured(true);
          setSearchResults([]);
          toast.error("Please configure a weather provider first", {
            description: "Go to Settings → Weather Providers to set up an API provider",
          });
          return;
        }
        throw new Error(data.error || "Failed to search locations");
      }

      setSearchResults(data.results || []);
      
      if (data.results.length === 0) {
        toast.error("No locations found matching your search");
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      toast.error(error instanceof Error ? error.message : "Failed to search locations");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddLocation = (result: LocationSearchResult) => {
    // Check if already exists
    if (existingLocationIds.includes(result.id)) {
      toast.error(`${result.name} is already being monitored`);
      return;
    }

    // Create location object for backend
    const newLocation: SavedWeatherLocation = {
      id: result.id,
      name: result.name,
      admin1: result.admin1,
      country: result.country,
      lat: result.lat,
      lon: result.lon,
      elevation_m: result.elevation_m,
      stationId: result.stationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    onAddLocation(newLocation);
    
    // Reset the dialog
    setSearchTerm("");
    setSearchResults([]);
    setHasSearched(false);
    setIsOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getConditionIcon = (condition: string) => {
    if (condition.toLowerCase().includes('sunny')) return <Sun className="w-4 h-4" />;
    if (condition.toLowerCase().includes('cloud')) return <Cloud className="w-4 h-4" />;
    if (condition.toLowerCase().includes('rain')) return <Droplets className="w-4 h-4" />;
    if (condition.toLowerCase().includes('wind')) return <Wind className="w-4 h-4" />;
    return <Eye className="w-4 h-4" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Location
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search & Add Weather Location
          </DialogTitle>
          <DialogDescription>
            Search for cities and regions to add weather monitoring. Try popular locations like Seattle, Portland, Phoenix, Chicago, Houston, Atlanta, Boston, Las Vegas, San Francisco, New York, Toronto, Vancouver, London, Paris, Tokyo, or Sydney.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter city name (e.g., Seattle, Portland, Chicago, London)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-9"
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={isSearching || !searchTerm.trim()}
              className="gap-2"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </Button>
          </div>

          {/* Search Results */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching for locations...
                </div>
              </div>
            )}

            {!isSearching && hasSearched && searchResults.length === 0 && !noProviderConfigured && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No locations found</p>
                <p className="text-sm">
                  Try searching for cities like Seattle, Portland, Phoenix, Chicago, Houston, Atlanta, Boston, Las Vegas, San Francisco, New York, Toronto, Vancouver, London, Paris, Tokyo, or Sydney
                </p>
              </div>
            )}

            {!isSearching && noProviderConfigured && (
              <div className="text-center py-8 border-2 border-dashed border-amber-300 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-6">
                <Cloud className="w-12 h-12 mx-auto mb-3 text-amber-600" />
                <h3 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">
                  Weather Provider Required
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                  You need to configure a weather API provider before you can search for locations.
                </p>
                <div className="space-y-2 text-sm text-left max-w-md mx-auto bg-white dark:bg-gray-900 p-4 rounded-lg">
                  <p className="font-semibold">Quick Setup:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Go to Settings → Weather Providers</li>
                    <li>Click "Quick Setup: WeatherAPI.com"</li>
                    <li>Save the provider</li>
                    <li>Return here to search locations</li>
                  </ol>
                </div>
              </div>
            )}

            {searchResults.map((result) => (
              <Card key={result.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{result.name}</h3>
                          {result.alerts && result.alerts > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {result.alerts} alert{result.alerts > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {result.admin1}, {result.country}
                        </p>
                        {result.stationId && (
                          <p className="text-xs text-muted-foreground font-mono">
                            Station: {result.stationId}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {result.currentTemp && (
                            <p className="font-semibold">{result.currentTemp}°F</p>
                          )}
                          {result.currentCondition && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              {getConditionIcon(result.currentCondition)}
                              <span>{result.currentCondition}</span>
                            </div>
                          )}
                        </div>
                        
                        <Button
                          onClick={() => handleAddLocation(result)}
                          size="sm"
                          disabled={existingLocationIds.includes(result.id)}
                          className="gap-1"
                        >
                          {existingLocationIds.includes(result.id) ? (
                            "Added"
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!hasSearched && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Search for locations to add weather monitoring</p>

            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}