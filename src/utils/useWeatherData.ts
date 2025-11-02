import { useState, useEffect } from "react";
import { WeatherLocationWithOverrides, createOverride, FieldOverride } from "../types/weather";
import { projectId, publicAnonKey } from "./supabase/info";

export interface WeatherDataStats {
  locations: WeatherLocationWithOverrides[];
  totalLocations: number;
  activeAlerts: number;
  lastUpdated: string;
  loading: boolean;
  error: string | null;
}

export function useWeatherData() {
  const [stats, setStats] = useState<WeatherDataStats>({
    locations: [],
    totalLocations: 0,
    activeAlerts: 0,
    lastUpdated: new Date().toISOString(),
    loading: true,
    error: null,
  });

  const fetchWeatherData = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/weather-data`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (data.error === "No active weather provider configured") {
          setStats({
            locations: [],
            totalLocations: 0,
            activeAlerts: 0,
            lastUpdated: new Date().toISOString(),
            loading: false,
            error: "No weather provider configured",
          });
          return;
        }
        throw new Error(data.error || "Failed to fetch weather data");
      }

      // Handle empty locations
      if (!data.locations || data.locations.length === 0) {
        setStats({
          locations: [],
          totalLocations: 0,
          activeAlerts: 0,
          lastUpdated: data.lastUpdated || new Date().toISOString(),
          loading: false,
          error: null,
        });
        return;
      }

      // Transform backend response to WeatherLocationWithOverrides format
      console.log(`🔴 RAW DATA from backend (before processing):`, data.locations);
      
      const weatherLocations: WeatherLocationWithOverrides[] = data.locations
        .filter((loc: any) => loc.success && loc.data)
        .map((loc: any) => {
          const location = loc.location;
          
          console.log(`🔵 FRONTEND useWeatherData: Processing location RAW:`, location);
          console.log(`🔵 FRONTEND useWeatherData: Processing location DETAILS:`, {
            id: location.id,
            name: location.name,
            custom_name: location.custom_name,
          });
          
          // Process location name override ONLY (no other overrides)
          const processedLocation: any = {
            ...location,
            name: location.custom_name 
              ? createOverride(location.name, location.custom_name)
              : location.name,
          };
          
          console.log(`🔵 FRONTEND useWeatherData: Processed location:`, {
            id: processedLocation.id,
            name: processedLocation.name,
            name_is_object: typeof processedLocation.name === 'object',
            hasNameOverride: typeof processedLocation.name === 'object' && processedLocation.name !== null && 'isOverridden' in processedLocation.name,
          });
          
          // Final summary
          if (location.custom_name) {
            console.log(`✅ FRONTEND useWeatherData: Created override for \"${location.name}\" → \"${location.custom_name}\"`);
          }
          
          return {
            location: processedLocation,
            data: loc.data, // Use unmodified weather data
          };
        });

      // Calculate active alerts
      const activeAlerts = weatherLocations.filter(
        (loc) => loc.data.alerts && loc.data.alerts.length > 0
      ).length;

      setStats({
        locations: weatherLocations,
        totalLocations: weatherLocations.length,
        activeAlerts,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching weather data:", error);
      setStats((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  };

  useEffect(() => {
    fetchWeatherData();

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetchWeatherData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { stats, refresh: fetchWeatherData };
}
