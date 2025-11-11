import { useState, useEffect } from "react";
import { WeatherLocationWithOverrides, WeatherView } from "../types/weather";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  CloudDrizzle,
  AlertTriangle,
  Wind,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Clock,
  CalendarDays,
  CloudRain,
  Gauge,
  MoreHorizontal,
} from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface Provider {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

interface WeatherFiltersProps {
  locations: WeatherLocationWithOverrides[];
  onFilterChange: (filtered: WeatherLocationWithOverrides[]) => void;
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
  onSortChange,
}: WeatherFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedTempRange, setSelectedTempRange] = useState<string>("all");
  const [providers, setProviders] = useState<Provider[]>([]);

  // Load providers when component mounts
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/weather_dashboard/providers`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setProviders(data.providers || []);
        }
      } catch (error) {
        console.error('Error loading providers:', error);
      }
    };

    loadProviders();
  }, []);

  // Apply filters whenever inputs change
  useEffect(() => {
    let filtered = [...locations];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (loc) =>
          loc.location.name.toString().toLowerCase().includes(term) ||
          (typeof loc.location.name === "object" &&
            loc.location.name.originalValue?.toLowerCase().includes(term)) ||
          loc.location.admin1?.toLowerCase().includes(term) ||
          loc.location.country?.toLowerCase().includes(term)
      );
    }

    // Provider filter
    if (selectedProvider !== "all") {
      filtered = filtered.filter(
        (loc) => loc.location.provider_id === selectedProvider
      );
    }

    // Country filter
    if (selectedCountry !== "all") {
      filtered = filtered.filter(
        (loc) => loc.location.country?.toLowerCase() === selectedCountry
      );
    }

    // State filter
    if (selectedState !== "all") {
      filtered = filtered.filter(
        (loc) => loc.location.admin1?.toLowerCase() === selectedState
      );
    }

    // Temperature range filter
    if (selectedTempRange !== "all") {
      const [minTemp, maxTemp] = selectedTempRange.split("-").map(Number);
      filtered = filtered.filter(
        (loc) =>
          loc.data.current?.temperature >= minTemp &&
          loc.data.current?.temperature <= maxTemp
      );
    }

    // View-specific filters
    if (currentView === "alerts") {
      filtered = filtered.filter((loc) => (loc.data.alerts?.length || 0) > 0);
    }

    onFilterChange(filtered);
  }, [searchTerm, selectedProvider, selectedCountry, selectedState, selectedTempRange, currentView, locations, onFilterChange]);

  // Get unique countries from locations
  const countries = Array.from(
    new Set(locations.map((loc) => loc.location.country).filter(Boolean))
  ).sort();

  // Get unique states from locations
  const states = Array.from(
    new Set(locations.map((loc) => loc.location.admin1).filter(Boolean))
  ).sort();

  const viewOptions: { value: WeatherView; label: string; icon: any }[] = [
    { value: "current", label: "Current", icon: CloudDrizzle },
    { value: "hourly", label: "Hourly", icon: Clock },
    { value: "daily", label: "Daily", icon: CalendarDays },
    { value: "alerts", label: "Alerts", icon: AlertTriangle },
    { value: "tropical", label: "Tropical", icon: CloudRain },
    { value: "air-quality", label: "Air Quality", icon: Wind },
    { value: "other", label: "Other", icon: MoreHorizontal },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Row 1: View Tabs */}
          <div className="flex flex-wrap gap-2">
            {viewOptions.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={currentView === value ? "default" : "outline"}
                size="sm"
                onClick={() => onViewChange(value)}
                className="gap-2"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            ))}
          </div>

          {/* Row 2: Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Search - spans 2 columns on large screens */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Country Filter */}
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger>
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country} value={country.toLowerCase()}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* State Filter */}
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger>
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((state) => (
                  <SelectItem key={state} value={state.toLowerCase()}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Temperature Range Filter */}
            <Select value={selectedTempRange} onValueChange={setSelectedTempRange}>
              <SelectTrigger>
                <SelectValue placeholder="All Temps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Temps</SelectItem>
                <SelectItem value="-50-0">Below 0°</SelectItem>
                <SelectItem value="0-32">0° - 32°</SelectItem>
                <SelectItem value="32-50">32° - 50°</SelectItem>
                <SelectItem value="50-70">50° - 70°</SelectItem>
                <SelectItem value="70-90">70° - 90°</SelectItem>
                <SelectItem value="90-150">Above 90°</SelectItem>
              </SelectContent>
            </Select>

            {/* Provider Filter */}
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="All Providers" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Data Providers</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name} ({provider.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pagination - Media Library Style */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => onPageChange(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Showing {totalResults} location{totalResults !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}