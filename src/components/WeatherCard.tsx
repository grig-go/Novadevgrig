import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { InlineTextEdit } from "./InlineEditField";
import { WeatherLocationWithOverrides, WeatherView, getFieldValue, isFieldOverridden } from "../types/weather";
import { getTranslation, translateCountry } from "../utils/weather-translations";
import { WeatherBackendDataDialog } from "./WeatherBackendDataDialog";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  Snowflake, 
  Zap, 
  Wind, 
  Eye, 
  Thermometer,
  Droplets,
  Gauge,
  AlertTriangle,
  MapPin,
  Clock,
  Sunrise,
  Sunset,
  Moon,
  TreePine,
  Waves,
  MoreHorizontal,
  RefreshCw,
  Brain,
  Flower2,
  Anchor,
  Flame,
  Database,
  Trash2,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner@2.0.3";

interface WeatherCardProps {
  location: WeatherLocationWithOverrides;
  onUpdate: (updatedLocation: WeatherLocationWithOverrides) => void;
  onDelete?: (locationId: string, locationName: string) => void;
  onRefresh?: () => void;
  onAIInsights?: (locationId: string) => void;
  view: WeatherView;
  language?: string;
}

const getWeatherIcon = (icon: string, size: number = 24) => {
  const iconMap = {
    'clear-day': <Sun className={`w-6 h-6`} />,
    'clear-night': <Moon className={`w-6 h-6`} />,
    'partly-cloudy-day': <Cloud className={`w-6 h-6`} />,
    'partly-cloudy-night': <Cloud className={`w-6 h-6`} />,
    'cloudy': <Cloud className={`w-6 h-6`} />,
    'fog': <Cloud className={`w-6 h-6`} />,
    'wind': <Wind className={`w-6 h-6`} />,
    'rain': <CloudRain className={`w-6 h-6`} />,
    'sleet': <CloudRain className={`w-6 h-6`} />,
    'snow': <Snowflake className={`w-6 h-6`} />,
    'thunderstorm': <Zap className={`w-6 h-6`} />
  };
  
  return iconMap[icon as keyof typeof iconMap] || <Cloud className={`w-6 h-6`} />;
};

const formatTime = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } catch {
    return timestamp;
  }
};

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString([], { 
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

export function WeatherCard({ location, onUpdate, onDelete, onRefresh, onAIInsights, view, language = "en" }: WeatherCardProps) {
  // State for backend data dialog
  const [backendDataOpen, setBackendDataOpen] = useState(false);
  // State for refresh loading
  const [refreshing, setRefreshing] = useState(false);
  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  // State for alerts collapsible (collapsed by default)
  const [alertsOpen, setAlertsOpen] = useState(false);
  
  // Get translations for current language
  const t = getTranslation(language);
  
  // Helper function to save custom location name to backend
  const saveCustomNameToBackend = async (customName: string | null) => {
    try {
      console.log(`🔵 FRONTEND: Saving custom name for location ${location.location.id}:`, customName);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/weather-locations/${location.location.id}`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ custom_name: customName })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🔴 FRONTEND: Save failed (HTTP ${response.status}):`, errorText);
        
        // Try to parse as JSON for structured error
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          // Not JSON, use text as-is if available
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log(`✅ FRONTEND: Saved successfully. Backend returned:`, result);
      
      // Refresh the card to show the updated name
      if (onRefresh) {
        console.log(`🔄 FRONTEND: Refreshing weather data to show updated name`);
        onRefresh();
      }
    } catch (error) {
      console.error(`🔴 FRONTEND: Error saving custom name:`, error);
      toast.error(`Failed to save changes: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Helper function to update location name (only supported override)
  const updateLocationField = (fieldName: 'name', newValue: any) => {
    const updatedLocation = { 
      ...location, 
      location: { ...location.location, name: newValue }
    };
    onUpdate(updatedLocation);
    
    // Check if this is a revert or a new override
    const isNowOverridden = isFieldOverridden(newValue);
    const currentOriginalName = isFieldOverridden(location.location.name) 
      ? location.location.name.originalValue 
      : location.location.name;
    const newDisplayName = isNowOverridden ? getFieldValue(newValue) : newValue;
    
    console.log(`🔵 FRONTEND: updateLocationField called:`, {
      fieldName,
      isNowOverridden,
      newValue,
      newDisplayName,
      currentOriginalName
    });
    
    // Save custom name to backend
    // If newDisplayName differs from original, it's a custom name
    // If they match, we're reverting (set to null)
    const customName = (isNowOverridden && newDisplayName !== currentOriginalName) ? newDisplayName : null;
    
    console.log(`🔵 FRONTEND: Saving custom name to backend:`, {
      customName,
      reasoning: customName ? 'User changed name' : 'Reverted to original or no change'
    });
    
    saveCustomNameToBackend(customName);
  };



  const handleRefreshLocation = async () => {
    const locationName = getFieldValue(location.location.name);
    const locationId = location.location.id;
    
    if (refreshing) return; // Prevent double-clicks
    
    try {
      setRefreshing(true);
      toast.info(`Refreshing weather data for ${locationName}...`);
      
      // Call the new single location refresh endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/weather/refresh/${locationId}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      toast.success(`✅ Weather data refreshed for ${locationName}`);
      
      // Call the onRefresh callback to update the UI
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error refreshing weather data:", error);
      toast.error(`Failed to refresh weather data for ${locationName}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Fallback to general refresh if available
      if (onRefresh) {
        onRefresh();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleAIInsights = () => {
    if (onAIInsights) {
      onAIInsights(location.location.id);
    } else {
      toast.info("AI Insights feature coming soon!");
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      setDeleteDialogOpen(true);
    } else {
      toast.error("Delete function not available");
    }
  };
  
  const confirmDelete = () => {
    const locationName = getFieldValue(location.location.name);
    if (onDelete) {
      onDelete(location.location.id, locationName);
    }
    setDeleteDialogOpen(false);
  };

  const handleViewBackendData = () => {
    setBackendDataOpen(true);
  };

  // Check if location has any overrides (only location name override supported)
  const hasOverrides = isFieldOverridden(location.location.name);

  const locationNameValue = getFieldValue(location.location.name);
  const admin1Value = getFieldValue(location.location.admin1);
  const countryValueRaw = getFieldValue(location.location.country);
  const countryValue = translateCountry(countryValueRaw, language);
  const temperatureValue = getFieldValue(location.data.current.temperature.value);
  const temperatureUnit = getFieldValue(location.data.current.temperature.unit);
  const summaryValue = getFieldValue(location.data.current.summary);
  const humidityValue = getFieldValue(location.data.current.humidity);
  const uvIndexValue = getFieldValue(location.data.current.uvIndex);

  // Common dropdown menu component
  const renderDropdownMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 relative z-10">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleAIInsights}>
          <Brain className="mr-2 h-4 w-4" />
          {t.aiInsights}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleRefreshLocation} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : t.refreshData}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleViewBackendData}>
          <Database className="mr-2 h-4 w-4" />
          View Backend Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          {t.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (view === 'current') {
    return (
      <>
        <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <InlineTextEdit
                    field={location.location.name}
                    fieldName="Location Name"
                    onUpdate={(newName) => updateLocationField('name', newName)}
                  >
                    <h3 className="font-semibold">{locationNameValue}</h3>
                  </InlineTextEdit>

                </div>
                <div className="text-sm text-muted-foreground">
                  {admin1Value}, {countryValue}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getWeatherIcon(getFieldValue(location.data.current.icon), 32)}
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {temperatureValue}{temperatureUnit}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t.feelsLike} {getFieldValue(location.data.current.feelsLike.value)}{getFieldValue(location.data.current.feelsLike.unit)}
                </div>
              </div>
              {renderDropdownMenu()}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-muted-foreground">{summaryValue}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <Droplets className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t.humidity}</p>
                <p className="font-medium">{Math.round(humidityValue)}%</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <Sun className="w-4 h-4 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t.uvIndex}</p>
                <p className="font-medium">{uvIndexValue}</p>
              </div>
            </div>
          </div>

          {location.data.alerts.length > 0 && (
            <Collapsible open={alertsOpen} onOpenChange={setAlertsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-0 h-auto hover:bg-transparent">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-800">{t.activeAlerts}</span>
                    <Badge variant="destructive" className="text-xs">
                      {location.data.alerts.length}
                    </Badge>
                    <ChevronDown className={`w-4 h-4 text-red-500 transition-transform ${alertsOpen ? 'rotate-180' : ''}`} />
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1 mt-2">
                  {location.data.alerts.slice(0, 2).map((alert, index) => (
                    <div key={index} className="text-xs text-red-700 bg-red-50 p-2 rounded">
                      <strong>{getFieldValue(alert.event)}</strong>: {getFieldValue(alert.headline)}
                    </div>
                  ))}
                  {location.data.alerts.length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{location.data.alerts.length - 2} more alerts
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <div className="text-xs text-muted-foreground">
            {t.lastUpdated}: {formatTime(getFieldValue(location.data.current.asOf))}
          </div>
        </CardContent>
      </Card>
      
      <WeatherBackendDataDialog
        open={backendDataOpen}
        onOpenChange={setBackendDataOpen}
        locationId={location.location.id}
        locationName={getFieldValue(location.location.name)}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete {locationNameValue}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will remove all data including:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Current weather</li>
                <li>Air quality</li>
                <li>Hourly forecasts</li>
                <li>Daily forecasts</li>
                <li>Weather alerts</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    );
  }

  if (view === 'hourly') {
    return (
      <>
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">{locationNameValue}</h3>
              {hasOverrides && (
                <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-800">
                  <Database className="h-3 w-3 mr-1" />
                  {t.modified}
                </Badge>
              )}
            </div>
            {renderDropdownMenu()}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {(location.data.hourly?.items || []).slice(0, 12).map((hour, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-16">{formatTime(getFieldValue(hour.time))}</span>
                  {getWeatherIcon(getFieldValue(hour.icon), 20)}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">{getFieldValue(hour.temperature.value)}{getFieldValue(hour.temperature.unit)}</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Droplets className="w-3 h-3" />
                    {Math.round(getFieldValue(hour.precipProbability) * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-muted-foreground">
            {getFieldValue(location.data.hourly?.stepHours)}-hour {t.forecast} • {t.lastUpdated}: {formatTime(getFieldValue(location.data.current?.asOf))}
          </div>
        </CardContent>
      </Card>
      
      <WeatherBackendDataDialog
        open={backendDataOpen}
        onOpenChange={setBackendDataOpen}
        locationId={location.location.id}
        locationName={getFieldValue(location.location.name)}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete {locationNameValue}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will remove all data including:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Current weather</li>
                <li>Air quality</li>
                <li>Hourly forecasts</li>
                <li>Daily forecasts</li>
                <li>Weather alerts</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    );
  }

  if (view === 'daily') {
    return (
      <>
        <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">{locationNameValue}</h3>
              {hasOverrides && (
                <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-800">
                  <Database className="h-3 w-3 mr-1" />
                  {t.modified}
                </Badge>
              )}
            </div>
            {renderDropdownMenu()}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3">
            {(location.data.daily?.items || []).slice(0, 7).map((day, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-16">{formatDate(getFieldValue(day.date))}</span>
                  {getWeatherIcon(getFieldValue(day.icon), 20)}
                  <span className="text-sm text-muted-foreground">{getFieldValue(day.summary)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {getFieldValue(day.tempMax.value)}{getFieldValue(day.tempMax.unit)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getFieldValue(day.tempMin.value)}{getFieldValue(day.tempMin.unit)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Droplets className="w-3 h-3" />
                    {Math.round(getFieldValue(day.precipProbability) * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-muted-foreground">
            7-day {t.forecast} • {t.lastUpdated}: {formatTime(getFieldValue(location.data.current.asOf))}
          </div>
        </CardContent>
      </Card>
      
      <WeatherBackendDataDialog
        open={backendDataOpen}
        onOpenChange={setBackendDataOpen}
        locationId={location.location.id}
        locationName={getFieldValue(location.location.name)}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete {locationNameValue}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will remove all data including:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Current weather</li>
                <li>Air quality</li>
                <li>Hourly forecasts</li>
                <li>Daily forecasts</li>
                <li>Weather alerts</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    );
  }

  if (view === 'alerts') {
    return (
      <>
        <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold">{locationNameValue}</h3>
              {location.data.alerts.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {location.data.alerts.length} {t.alerts.toLowerCase()}
                </Badge>
              )}
              {hasOverrides && (
                <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-800">
                  <Database className="h-3 w-3 mr-1" />
                  Modified
                </Badge>
              )}
            </div>
            {renderDropdownMenu()}
          </div>
        </CardHeader>
        <CardContent>
          {location.data.alerts.length > 0 ? (
            <div className="space-y-4">
              {location.data.alerts.map((alert, index) => (
                <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {getFieldValue(alert.severity)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getFieldValue(alert.urgency)}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{getFieldValue(alert.source)}</span>
                  </div>
                  
                  <h4 className="font-medium text-red-800 mb-2">{getFieldValue(alert.event)}</h4>
                  <p className="text-sm text-red-700 mb-2">{getFieldValue(alert.headline)}</p>
                  <p className="text-xs text-red-600 mb-3">{getFieldValue(alert.description)}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>From: {formatTime(getFieldValue(alert.start))}</span>
                    <span>Until: {formatTime(getFieldValue(alert.end))}</span>
                  </div>
                  
                  {(() => {
                    const areas = getFieldValue(alert.areas);
                    const areasArray = Array.isArray(areas) ? areas : (areas ? [areas] : []);
                    return areasArray.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground">Areas: {areasArray.join(', ')}</span>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h4 className="font-medium mb-2">{t.noActiveAlerts}</h4>
              <p className="text-sm text-muted-foreground">
                {t.noAlertsMessage}
              </p>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground mt-4">
            {t.lastUpdated}: {formatTime(getFieldValue(location.data.current.asOf))}
          </div>
        </CardContent>
      </Card>
      
      <WeatherBackendDataDialog
        open={backendDataOpen}
        onOpenChange={setBackendDataOpen}
        locationId={location.location.id}
        locationName={getFieldValue(location.location.name)}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete {locationNameValue}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will remove all data including:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Current weather</li>
                <li>Air quality</li>
                <li>Hourly forecasts</li>
                <li>Daily forecasts</li>
                <li>Weather alerts</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    );
  }

  if (view === 'tropical') {
    return (
      <>
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Waves className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">{locationNameValue}</h3>
              {location.data.tropical?.systems?.length > 0 && (
                <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-800">
                  {location.data.tropical.systems.length} systems
                </Badge>
              )}
              {hasOverrides && (
                <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-800">
                  <Database className="h-3 w-3 mr-1" />
                  {t.modified}
                </Badge>
              )}
            </div>
            {renderDropdownMenu()}
          </div>
        </CardHeader>
        <CardContent>
          {location.data.tropical?.systems?.length > 0 ? (
            <div className="space-y-4">
              {location.data.tropical.systems.map((system, index) => (
                <div key={index} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-blue-800">{getFieldValue(system.name)}</h4>
                      <p className="text-sm text-blue-600">{getFieldValue(system.type)}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getFieldValue(system.position.time)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Position</p>
                      <p className="font-medium">
                        {getFieldValue(system.position.lat).toFixed(2)}°, {getFieldValue(system.position.lon).toFixed(2)}°
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Max Winds</p>
                      <p className="font-medium">
                        {getFieldValue(system.windMax.value)} {getFieldValue(system.windMax.unit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pressure</p>
                      <p className="font-medium">
                        {getFieldValue(system.pressureMin.value)} {getFieldValue(system.pressureMin.unit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Movement</p>
                      <p className="font-medium">
                        {getFieldValue(system.motion.speed.value)} {getFieldValue(system.motion.speed.unit)}
                      </p>
                    </div>
                  </div>
                  
                  {getFieldValue(system.forecastPoints).length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        Forecast track ({getFieldValue(system.forecastPoints).length} points)
                      </p>
                      <div className="text-xs text-blue-600">
                        Next: {getFieldValue(getFieldValue(system.forecastPoints)[0].time)} - {getFieldValue(getFieldValue(system.forecastPoints)[0].type)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="text-xs text-muted-foreground">
                Advisory time: {getFieldValue(location.data.tropical.advisoryTime)} • Basin: {getFieldValue(location.data.tropical.basin)}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Waves className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h4 className="font-medium mb-2">{t.noTropicalSystems}</h4>
              <p className="text-sm text-muted-foreground">
                {t.noTropicalSystemsMessage}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <WeatherBackendDataDialog
        open={backendDataOpen}
        onOpenChange={setBackendDataOpen}
        locationId={location.location.id}
        locationName={getFieldValue(location.location.name)}
      />
      </>
    );
  }

  if (view === 'air-quality') {
    return (
      <>
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold">{locationNameValue}</h3>
              <Badge variant="outline" className={`text-xs ${
                getFieldValue(location.data.current?.airQuality?.aqi) <= 50 ? 'bg-green-50 border-green-200 text-green-800' :
                getFieldValue(location.data.current?.airQuality?.aqi) <= 100 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                getFieldValue(location.data.current?.airQuality?.aqi) <= 150 ? 'bg-orange-50 border-orange-200 text-orange-800' :
                'bg-red-50 border-red-200 text-red-800'
              }`}>
                AQI {getFieldValue(location.data.current?.airQuality?.aqi)}
              </Badge>
              {hasOverrides && (
                <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-800">
                  <Database className="h-3 w-3 mr-1" />
                  {t.modified}
                </Badge>
              )}
            </div>
            {renderDropdownMenu()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
            <h4 className="font-medium mb-2">{t.airQuality}</h4>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-2xl font-bold">{getFieldValue(location.data.current?.airQuality?.aqi)}</div>
              <div className="text-sm text-muted-foreground">{getFieldValue(location.data.current?.airQuality?.category)}</div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full ${
                  getFieldValue(location.data.current?.airQuality?.aqi) <= 50 ? 'bg-green-500' :
                  getFieldValue(location.data.current?.airQuality?.aqi) <= 100 ? 'bg-yellow-500' :
                  getFieldValue(location.data.current?.airQuality?.aqi) <= 150 ? 'bg-orange-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, (getFieldValue(location.data.current?.airQuality?.aqi) / 300) * 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground">Standard: {getFieldValue(location.data.current?.airQuality?.standard)}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <p className="text-sm text-muted-foreground">PM2.5</p>
                <p className="font-medium">{getFieldValue(location.data.current?.airQuality?.pm25)?.toFixed(1) || 'N/A'} μg/m³</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <p className="text-sm text-muted-foreground">PM10</p>
                <p className="font-medium">{getFieldValue(location.data.current?.airQuality?.pm10)?.toFixed(1) || 'N/A'} μg/m³</p>
              </div>
              <div className="p-3 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Ozone (O₃)</p>
                <p className="font-medium">{getFieldValue(location.data.current?.airQuality?.o3)?.toFixed(1) || 'N/A'} μg/m³</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <p className="text-sm text-muted-foreground">NO₂</p>
                <p className="font-medium">{getFieldValue(location.data.current?.airQuality?.no2)?.toFixed(1) || 'N/A'} μg/m³</p>
              </div>
              <div className="p-3 bg-lime-50 dark:bg-lime-950/20 rounded-lg">
                <p className="text-sm text-muted-foreground">SO₂</p>
                <p className="font-medium">{getFieldValue(location.data.current?.airQuality?.so2)?.toFixed(1) || 'N/A'} μg/m³</p>
              </div>
              <div className="p-3 bg-teal-50 dark:bg-teal-950/20 rounded-lg">
                <p className="text-sm text-muted-foreground">CO</p>
                <p className="font-medium">{getFieldValue(location.data.current?.airQuality?.co)?.toFixed(1) || 'N/A'} mg/m³</p>
              </div>
            </div>
          </div>
          
          {location.data.current.pollen && (
            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Flower2 className="w-4 h-4" />
                Pollen Count
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Tree</p>
                  <p className="font-medium">{getFieldValue(location.data.current.pollen.tree)}</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Grass</p>
                  <p className="font-medium">{getFieldValue(location.data.current.pollen.grass)}</p>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Weed</p>
                  <p className="font-medium">{getFieldValue(location.data.current.pollen.weed)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Risk: {getFieldValue(location.data.current.pollen.risk)}</p>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            Last updated: {formatTime(getFieldValue(location.data.current.asOf))}
          </div>
        </CardContent>
      </Card>
      
      <WeatherBackendDataDialog
        open={backendDataOpen}
        onOpenChange={setBackendDataOpen}
        locationId={location.location.id}
        locationName={getFieldValue(location.location.name)}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete {locationNameValue}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will remove all data including:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Current weather</li>
                <li>Air quality</li>
                <li>Hourly forecasts</li>
                <li>Daily forecasts</li>
                <li>Weather alerts</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    );
  }

  if (view === 'other') {
    return (
      <>
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">{locationNameValue}</h3>
              {hasOverrides && (
                <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-800">
                  <Database className="h-3 w-3 mr-1" />
                  Modified
                </Badge>
              )}
            </div>
            {renderDropdownMenu()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <Wind className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Wind</p>
                <p className="font-medium">
                  {getFieldValue(location.data.current.wind.speed.value)} {getFieldValue(location.data.current.wind.speed.unit)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getFieldValue(location.data.current.wind.direction_cardinal)} ({getFieldValue(location.data.current.wind.direction_deg)}°)
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <Gauge className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pressure</p>
                <p className="font-medium">
                  {getFieldValue(location.data.current.pressure.value)} {getFieldValue(location.data.current.pressure.unit)}
                </p>
                {getFieldValue(location.data.current.pressure.tendency) && (
                  <p className="text-xs text-muted-foreground">
                    {getFieldValue(location.data.current.pressure.tendency)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg">
              <Eye className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-muted-foreground">Visibility</p>
                <p className="font-medium">
                  {getFieldValue(location.data.current.visibility.value)} {getFieldValue(location.data.current.visibility.unit)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950/20 rounded-lg">
              <Cloud className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-muted-foreground">Cloud Cover</p>
                <p className="font-medium">{Math.round(getFieldValue(location.data.current.cloudCover))}%</p>
              </div>
            </div>
          </div>
          
          {location.data.current.sun && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Sunrise className="w-4 h-4" />
                Sun & Moon
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Sunrise</p>
                  <p className="font-medium">{formatTime(getFieldValue(location.data.current.sun.sunrise))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sunset</p>
                  <p className="font-medium">{formatTime(getFieldValue(location.data.current.sun.sunset))}</p>
                </div>
                {location.data.current.sun.moonPhase && (
                  <div>
                    <p className="text-sm text-muted-foreground">Moon Phase</p>
                    <p className="font-medium">{getFieldValue(location.data.current.sun.moonPhase)}</p>
                  </div>
                )}
                {location.data.current.sun.illumination && (
                  <div>
                    <p className="text-sm text-muted-foreground">Illumination</p>
                    <p className="font-medium">{Math.round(getFieldValue(location.data.current.sun.illumination))}%</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {location.data.marine && (
            <div className="p-4 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Anchor className="w-4 h-4" />
                Marine Conditions
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Wave Height</p>
                  <p className="font-medium">
                    {getFieldValue(location.data.marine.waves.significantHeight.value)} {getFieldValue(location.data.marine.waves.significantHeight.unit)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Wave Period</p>
                  <p className="font-medium">
                    {getFieldValue(location.data.marine.waves.period.value)} {getFieldValue(location.data.marine.waves.period.unit)}
                  </p>
                </div>
              </div>
              
              {location.data.marine.tides.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground mb-2">Next Tide</p>
                  <div className="text-sm">
                    <span className="font-medium">{getFieldValue(location.data.marine.tides[0].type)}</span> at{' '}
                    {formatTime(getFieldValue(location.data.marine.tides[0].time))} ({getFieldValue(location.data.marine.tides[0].height.value)} {getFieldValue(location.data.marine.tides[0].height.unit)})
                  </div>
                </div>
              )}
            </div>
          )}
          
          {location.data.smoke && (
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Flame className="w-4 h-4" />
                Smoke & Fire
              </h4>
              <p className="text-sm text-muted-foreground">
                {location.data.smoke.fireSources.length} fire sources detected in area
              </p>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            Last updated: {formatTime(getFieldValue(location.data.current.asOf))}
          </div>
        </CardContent>
      </Card>
      
      <WeatherBackendDataDialog
        open={backendDataOpen}
        onOpenChange={setBackendDataOpen}
        locationId={location.location.id}
        locationName={getFieldValue(location.location.name)}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete {locationNameValue}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will remove all data including:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Current weather</li>
                <li>Air quality</li>
                <li>Hourly forecasts</li>
                <li>Daily forecasts</li>
                <li>Weather alerts</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    );
  }

  // Fallback for any unhandled view types
  return (
    <>
      <Card className="p-6">
        <p className="text-muted-foreground">View type "{view}" not yet implemented</p>
      </Card>
      
      <WeatherBackendDataDialog
        open={backendDataOpen}
        onOpenChange={setBackendDataOpen}
        locationId={location.location.id}
        locationName={getFieldValue(location.location.name)}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete {locationNameValue}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will remove all data including:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Current weather</li>
                <li>Air quality</li>
                <li>Hourly forecasts</li>
                <li>Daily forecasts</li>
                <li>Weather alerts</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}