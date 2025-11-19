// Nova Weather API - Direct endpoint for weather dashboard data with filtering
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to get field value from override structure
function getFieldValue(field: any): any {
  if (typeof field === 'object' && field !== null) {
    // Handle override structure
    if ('overriddenValue' in field) {
      return getFieldValue(field.overriddenValue); // Recursively extract
    }
    if ('originalValue' in field) {
      return getFieldValue(field.originalValue); // Recursively extract
    }
    // Handle value/unit structure
    if ('value' in field && 'unit' in field) {
      return field.value; // Extract just the numeric value
    }
  }
  return field;
}

// Transform weather data for API response
function transformWeatherData(
  locations: any[],
  type: string,
  channel: string,
  dataProvider: string
): any {
  const now = new Date().toISOString();

  // Filter by channel if specified
  let filteredLocations = locations;

  if (channel && channel !== 'all') {
    if (channel === 'assigned') {
      // Show all locations that have ANY channel assigned
      filteredLocations = filteredLocations.filter(
        (loc) => loc.location.channel_id != null && loc.location.channel_id !== ""
      );
    } else {
      // Show locations with specific channel
      filteredLocations = filteredLocations.filter(
        (loc) => loc.location.channel_id === channel
      );
    }
  }

  // Filter by data provider if specified
  if (dataProvider && dataProvider !== 'all') {
    filteredLocations = filteredLocations.filter(
      (loc) => loc.location.provider_id === dataProvider
    );
  }

  // Transform based on type
  const transformedLocations = filteredLocations.map(location => {
    const baseLocation = {
      id: location.location.id,
      name: getFieldValue(location.location.name),
      customName: location.location.custom_name,
      latitude: location.location.latitude,
      longitude: location.location.longitude,
      country: location.location.country,
      state: location.location.admin1,
      timezone: location.location.timezone,
      channelId: location.location.channel_id,
      providerId: location.location.provider_id,
    };

    let weatherData: any = {};

    switch (type) {
      case 'current':
        if (location.data?.current) {
          const tempUnit = location.data.current.temperatureUnit || 'F';
          // Extract actual values from potential override objects
          const tempValue = getFieldValue(location.data.current.temperature);
          const feelsLikeValue = getFieldValue(location.data.current.feelsLike);
          const pressureValue = getFieldValue(location.data.current.pressure);
          const visibilityValue = getFieldValue(location.data.current.visibility);

          weatherData = {
            temperature: {
              value: tempValue,
              unit: `°${tempUnit}`,
              valueAndUnit: tempValue !== undefined && tempValue !== null ? `${tempValue}°${tempUnit}` : undefined,
            },
            feelsLike: {
              value: feelsLikeValue,
              unit: `°${tempUnit}`,
              valueAndUnit: feelsLikeValue !== undefined && feelsLikeValue !== null ? `${feelsLikeValue}°${tempUnit}` : undefined,
            },
            humidity: location.data.current.humidity,
            windSpeed: location.data.current.windSpeed,
            windDirection: location.data.current.windDirection,
            pressure: {
              value: pressureValue,
              unit: 'mb',
              valueAndUnit: pressureValue !== undefined && pressureValue !== null ? `${pressureValue}mb` : undefined,
            },
            visibility: {
              value: visibilityValue,
              unit: 'mi',
              valueAndUnit: visibilityValue !== undefined && visibilityValue !== null ? `${visibilityValue}mi` : undefined,
            },
            uvIndex: location.data.current.uvIndex,
            condition: location.data.current.condition,
            conditionCode: location.data.current.conditionCode,
            icon: location.data.current.icon,
            cloudCover: location.data.current.cloudCover,
            precipitation: location.data.current.precipitation,
            timestamp: location.data.current.timestamp,
          };
        }
        break;

      case 'hourly':
        if (location.data?.hourly?.items) {
          const tempUnit = location.data.current?.temperatureUnit || 'F';
          weatherData = {
            items: location.data.hourly.items.map((hour: any) => {
              // Extract actual values from potential override objects
              const tempValue = getFieldValue(hour.temperature);
              const feelsLikeValue = getFieldValue(hour.feelsLike);
              const pressureValue = getFieldValue(hour.pressure);
              const visibilityValue = getFieldValue(hour.visibility);

              return {
                time: hour.time,
                temperature: {
                  value: tempValue,
                  unit: `°${tempUnit}`,
                  valueAndUnit: tempValue !== undefined && tempValue !== null ? `${tempValue}°${tempUnit}` : undefined,
                },
                feelsLike: {
                  value: feelsLikeValue,
                  unit: `°${tempUnit}`,
                  valueAndUnit: feelsLikeValue !== undefined && feelsLikeValue !== null ? `${feelsLikeValue}°${tempUnit}` : undefined,
                },
                humidity: hour.humidity,
                windSpeed: hour.windSpeed,
                windDirection: hour.windDirection,
                pressure: {
                  value: pressureValue,
                  unit: 'mb',
                  valueAndUnit: pressureValue !== undefined && pressureValue !== null ? `${pressureValue}mb` : undefined,
                },
                visibility: {
                  value: visibilityValue,
                  unit: 'mi',
                  valueAndUnit: visibilityValue !== undefined && visibilityValue !== null ? `${visibilityValue}mi` : undefined,
                },
                uvIndex: hour.uvIndex,
                condition: hour.condition,
                conditionCode: hour.conditionCode,
                icon: hour.icon,
                cloudCover: hour.cloudCover,
                precipitationProbability: hour.precipitationProbability,
                precipitationAmount: hour.precipitationAmount,
              };
            }),
            summary: location.data.hourly.summary,
          };
        }
        break;

      case 'daily':
        if (location.data?.daily?.items) {
          const tempUnit = location.data.current?.temperatureUnit || 'F';
          weatherData = {
            items: location.data.daily.items.map((day: any) => {
              // Extract actual values from potential override objects
              const tempMaxValue = getFieldValue(day.temperatureMax);
              const tempMinValue = getFieldValue(day.temperatureMin);
              const pressureValue = getFieldValue(day.pressure);

              return {
                date: day.date,
                temperatureMax: {
                  value: tempMaxValue,
                  unit: `°${tempUnit}`,
                  valueAndUnit: tempMaxValue !== undefined && tempMaxValue !== null ? `${tempMaxValue}°${tempUnit}` : undefined,
                },
                temperatureMin: {
                  value: tempMinValue,
                  unit: `°${tempUnit}`,
                  valueAndUnit: tempMinValue !== undefined && tempMinValue !== null ? `${tempMinValue}°${tempUnit}` : undefined,
                },
                humidity: day.humidity,
                windSpeed: day.windSpeed,
                windDirection: day.windDirection,
                pressure: {
                  value: pressureValue,
                  unit: 'mb',
                  valueAndUnit: pressureValue !== undefined && pressureValue !== null ? `${pressureValue}mb` : undefined,
                },
                uvIndex: day.uvIndex,
                condition: day.condition,
                conditionCode: day.conditionCode,
                icon: day.icon,
                sunrise: day.sunrise,
                sunset: day.sunset,
                moonPhase: day.moonPhase,
                precipitationProbability: day.precipitationProbability,
                precipitationAmount: day.precipitationAmount,
              };
            }),
            summary: location.data.daily.summary,
          };
        }
        break;

      case 'alerts':
        if (location.data?.alerts && location.data.alerts.length > 0) {
          weatherData = {
            alerts: location.data.alerts.map((alert: any) => ({
              id: alert.id,
              event: alert.event,
              headline: alert.headline,
              description: alert.description,
              severity: alert.severity,
              urgency: alert.urgency,
              certainty: alert.certainty,
              effective: alert.effective,
              expires: alert.expires,
              areas: alert.areas,
              source: alert.source,
            })),
          };
        }
        break;

      default:
        // Return all weather data
        weatherData = location.data || {};
    }

    return {
      location: baseLocation,
      weather: weatherData,
      lastUpdated: location.data?.lastUpdated || now,
    };
  });

  // Filter out locations with no weather data for the requested type
  const locationsWithData = transformedLocations.filter(loc => {
    if (type === 'alerts') {
      return loc.weather.alerts && loc.weather.alerts.length > 0;
    }
    return Object.keys(loc.weather).length > 0;
  });

  // Sort locations by city name (ascending)
  locationsWithData.sort((a, b) => {
    const nameA = a.location.name || '';
    const nameB = b.location.name || '';
    return nameA.localeCompare(nameB);
  });

  return {
    type,
    channel: channel || 'all',
    dataProvider: dataProvider || 'all',
    lastUpdated: now,
    totalLocations: locationsWithData.length,
    locations: locationsWithData,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const channelParam = url.searchParams.get('channel');
    const dataProviderParam = url.searchParams.get('dataProvider');
    const typeParam = url.searchParams.get('type');

    console.log('Weather API Request:', {
      channel: channelParam,
      dataProvider: dataProviderParam,
      type: typeParam
    });

    const channel = channelParam || 'all';
    const dataProvider = dataProviderParam || 'all';
    const type = typeParam || 'current';

    // Validate type parameter
    const validTypes = ['current', 'hourly', 'daily', 'alerts', 'all'];
    if (!validTypes.includes(type)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid type parameter',
          details: `Type must be one of: ${validTypes.join(', ')}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch weather data from the weather_dashboard edge function
    const weatherResponse = await fetch(
      `${supabaseUrl}/functions/v1/weather_dashboard/weather-data`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text();
      console.error("Weather data fetch failed:", weatherResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch weather data',
          details: errorText.substring(0, 200)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const weatherResult = await weatherResponse.json();

    if (!weatherResult.ok) {
      console.error("Weather fetch failed:", weatherResult.error || weatherResult.detail);
      return new Response(
        JSON.stringify({
          error: 'Weather fetch failed',
          details: weatherResult.error || weatherResult.detail
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const weatherData = weatherResult.data || [];

    console.log(`Successfully fetched ${weatherData.length} weather locations`);

    // Transform the data to user-friendly format with filtering
    const transformedData = transformWeatherData(
      weatherData,
      type,
      channel,
      dataProvider
    );

    return new Response(
      JSON.stringify(transformedData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});