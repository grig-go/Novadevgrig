import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { WeatherLocationWithOverrides, WeatherView, getFieldValue } from "../types/weather";
import { 
  Search, 
  Filter, 
  MapPin, 
  AlertTriangle, 
  Wind, 
  Thermometer, 
  Cloud,
  Waves,
  Sun,
  Clock,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpAZ,
  ArrowDownAZ
} from "lucide-react";

interface WeatherFiltersProps {
  locations: WeatherLocationWithOverrides[];
  onFilterChange: (filteredLocations: WeatherLocationWithOverrides[]) => void;
  currentView: WeatherView;
  onViewChange: (view: WeatherView) => void;
  currentPage: number;
  totalPages: number;
  totalResults: number;
  onPageChange: (page: number) => void;
  sortOrder: "asc" | "desc";
  onSortChange: (order: "asc" | "desc") => void;
}

export function WeatherFilters({ 
  locations, 
  onFilterChange, 
  currentView, 
  onViewChange,
  currentPage,
  totalPages,
  totalResults,
  onPageChange,
  sortOrder,
  onSortChange
}: WeatherFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [temperatureRange, setTemperatureRange] = useState<string>("all");


  // Apply filters whenever filter values change
  useEffect(() => {
    let filtered = [...locations];

    // View-based filter: Only show locations with alerts when alerts view is active
    if (currentView === 'alerts') {
      filtered = filtered.filter(location => location.data.alerts.length > 0);
    }

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(location => {
        const name = getFieldValue(location.location.name) || '';
        const admin1 = getFieldValue(location.location.admin1) || '';
        const country = getFieldValue(location.location.country) || '';
        
        return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               admin1.toLowerCase().includes(searchQuery.toLowerCase()) ||
               country.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    // Country filter
    if (selectedCountry !== "all") {
      filtered = filtered.filter(location => 
        getFieldValue(location.location.country) === selectedCountry
      );
    }

    // State filter
    if (selectedState !== "all") {
      filtered = filtered.filter(location => 
        getFieldValue(location.location.admin1) === selectedState
      );
    }

    // Temperature range filter
    if (temperatureRange !== "all") {
      const temp = (location: WeatherLocationWithOverrides) => {
        const tempValue = location.data.current.temperature.value;
        return typeof tempValue === 'number' ? tempValue : getFieldValue(tempValue);
      };
      switch (temperatureRange) {
        case "cold":
          filtered = filtered.filter(location => temp(location) < 32);
          break;
        case "cool":
          filtered = filtered.filter(location => temp(location) >= 32 && temp(location) < 60);
          break;
        case "moderate":
          filtered = filtered.filter(location => temp(location) >= 60 && temp(location) < 80);
          break;
        case "warm":
          filtered = filtered.filter(location => temp(location) >= 80 && temp(location) < 95);
          break;
        case "hot":
          filtered = filtered.filter(location => temp(location) >= 95);
          break;
      }
    }



    onFilterChange(filtered);
  }, [searchQuery, selectedCountry, selectedState, temperatureRange, locations, currentView, onFilterChange]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
  };

  const handleStateChange = (value: string) => {
    setSelectedState(value);
  };

  const handleTemperatureRangeChange = (value: string) => {
    setTemperatureRange(value);
  };



  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCountry("all");
    setSelectedState("all");
    setTemperatureRange("all");
    // The useEffect will automatically apply filters when state changes
  };

  // Get unique countries and states for filter dropdowns
  const countries = Array.from(new Set(locations.map(loc => getFieldValue(loc.location.country)))).filter(Boolean).sort();
  const states = Array.from(new Set(locations.map(loc => getFieldValue(loc.location.admin1)))).filter(Boolean).sort();

  // Get statistics
  const totalLocations = locations.length;
  const activeAlerts = locations.filter(loc => loc.data.alerts.length > 0).length;

  const views: Array<{ key: WeatherView; label: string; icon: React.ReactNode }> = [
    { key: 'current', label: 'Current', icon: <Sun className="w-4 h-4" /> },
    { key: 'hourly', label: 'Hourly', icon: <Clock className="w-4 h-4" /> },
    { key: 'daily', label: 'Daily', icon: <Cloud className="w-4 h-4" /> },
    { key: 'alerts', label: 'Alerts', icon: <AlertTriangle className="w-4 h-4" /> },
    { key: 'tropical', label: 'Tropical', icon: <Waves className="w-4 h-4" /> },
    { key: 'air-quality', label: 'Air Quality', icon: <Wind className="w-4 h-4" /> },
    { key: 'other', label: 'Other', icon: <MoreHorizontal className="w-4 h-4" /> }
  ];

  return (
    <Card>
      <CardContent className="p-4">


        {/* View Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {views.map((view) => (
            <Button
              key={view.key}
              variant={currentView === view.key ? "default" : "outline"}
              size="sm"
              onClick={() => onViewChange(view.key)}
              className="gap-1.5"
            >
              {view.icon}
              {view.label}
              {view.key === 'alerts' && activeAlerts > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs h-4 px-1">
                  {activeAlerts}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedCountry} onValueChange={handleCountryChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedState} onValueChange={handleStateChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {states.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={temperatureRange} onValueChange={handleTemperatureRangeChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Temperature" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Temps</SelectItem>
              <SelectItem value="cold">Cold (&lt; 32°F)</SelectItem>
              <SelectItem value="cool">Cool (32-59°F)</SelectItem>
              <SelectItem value="moderate">Moderate (60-79°F)</SelectItem>
              <SelectItem value="warm">Warm (80-94°F)</SelectItem>
              <SelectItem value="hot">Hot (≥ 95°F)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onSortChange(sortOrder === "asc" ? "desc" : "asc")}
            className="gap-2"
          >
            {sortOrder === "asc" ? (
              <>
                <ArrowUpAZ className="w-4 h-4" />
                A-Z
              </>
            ) : (
              <>
                <ArrowDownAZ className="w-4 h-4" />
                Z-A
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Clear
          </Button>
        </div>

        {/* Active Filters */}
        {(searchQuery || selectedCountry !== "all" || selectedState !== "all" || temperatureRange !== "all") && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchQuery}
                <button
                  onClick={() => handleSearchChange("")}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            )}
            {selectedCountry !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Country: {selectedCountry}
                <button
                  onClick={() => handleCountryChange("all")}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            )}
            {selectedState !== "all" && (
              <Badge variant="secondary" className="gap-1">
                State: {selectedState}
                <button
                  onClick={() => handleStateChange("all")}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            )}
            {temperatureRange !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Temp: {temperatureRange}
                <button
                  onClick={() => handleTemperatureRangeChange("all")}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            )}

          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * 9) + 1}-{Math.min(currentPage * 9, totalResults)} of {totalResults} locations
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPageChange(currentPage - 1);
                }}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage = 
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1);
                  
                  const showEllipsis = 
                    (page === 2 && currentPage > 3) ||
                    (page === totalPages - 1 && currentPage < totalPages - 2);

                  if (showEllipsis) {
                    return (
                      <span key={page} className="px-2 text-muted-foreground">
                        ...
                      </span>
                    );
                  }

                  if (!showPage) return null;

                  return (
                    <Button
                      key={page}
                      type="button"
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onPageChange(page);
                      }}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPageChange(currentPage + 1);
                }}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}