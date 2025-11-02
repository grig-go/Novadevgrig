import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Database, Cloud, Wind, Droplets, Calendar, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface WeatherBackendDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  locationName: string;
}

export function WeatherBackendDataDialog({
  open,
  onOpenChange,
  locationId,
  locationName,
}: WeatherBackendDataDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (open && locationId) {
      fetchData();
    }
  }, [open, locationId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf`;
      const response = await fetch(`${baseUrl}/weather/cached/${locationId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching weather backend data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Backend Data: {locationName}
          </DialogTitle>
          <DialogDescription>
            View all weather data stored in the Supabase backend for this location, including current conditions, forecasts, air quality, and alerts.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-red-700 dark:text-red-300">Error: {error}</p>
                  {error.includes('404') && (
                    <p className="text-sm text-muted-foreground">
                      This location may not have been synced to the database yet. Try refreshing the weather data on the Weather Dashboard first.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !error && data && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="current">Current</TabsTrigger>
                <TabsTrigger value="hourly">Hourly</TabsTrigger>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="alerts">Alerts</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {data.message && (
                  <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                    <CardContent className="pt-6">
                      <p className="text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {data.message}
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {data.provider && (
                  <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        Data Provider
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground">Provider Name</p>
                          <p>{data.provider.name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Type</p>
                          <p className="capitalize">{data.provider.type}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Category</p>
                          <Badge variant="secondary" className="capitalize">{data.provider.category}</Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <Badge variant={data.provider.is_active ? "default" : "secondary"}>
                            {data.provider.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <Card>
                  <CardHeader>
                    <CardTitle>Location Information (from KV Store)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-muted-foreground">Name</p>
                        <p>{data.location.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Country</p>
                        <p>{data.location.country}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Coordinates</p>
                        <p>{data.location.lat}, {data.location.lon}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Elevation</p>
                        <p>{data.location.elevation_m}m</p>
                      </div>
                      {data.location.timezone && (
                        <div>
                          <p className="text-muted-foreground">Timezone</p>
                          <p>{data.location.timezone}</p>
                        </div>
                      )}
                      {data.location.custom_name && (
                        <div>
                          <p className="text-muted-foreground">Custom Name</p>
                          <Badge variant="outline">{data.location.custom_name}</Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Data Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Current Weather:</span>
                        <Badge>{data.current ? '1 record' : 'No data'}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Air Quality:</span>
                        <Badge>{data.current?.airQuality ? '1 record' : 'No data'}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Hourly Forecasts:</span>
                        <Badge>{data.hourly?.items?.length || 0} records</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Daily Forecasts:</span>
                        <Badge>{data.daily?.items?.length || 0} records</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Alerts:</span>
                        <Badge variant={data.alerts?.length > 0 ? "destructive" : "secondary"}>
                          {data.alerts?.length || 0} alerts
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {data.current && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Cloud className="w-4 h-4" />
                          Current Conditions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>Temperature:</span>
                          <span>{data.current.temperature.value}{data.current.temperature.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Feels Like:</span>
                          <span>{data.current.feelsLike.value}{data.current.feelsLike.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Humidity:</span>
                          <span>{data.current.humidity}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Condition:</span>
                          <span>{data.current.summary}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Updated:</span>
                          <span>{formatTimestamp(data.current.asOf)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="current" className="space-y-4">
                {data.current ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cloud className="w-5 h-5" />
                        Current Weather Data
                      </CardTitle>
                      <p className="text-muted-foreground">
                        Last updated: {formatTimestamp(data.current.asOf)}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-muted-foreground">Temperature</p>
                          <p>{data.current.temperature.value}{data.current.temperature.unit}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Feels Like</p>
                          <p>{data.current.feelsLike.value}{data.current.feelsLike.unit}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Dew Point</p>
                          <p>{data.current.dewPoint.value}{data.current.dewPoint.unit}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Humidity</p>
                          <p>{data.current.humidity}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Condition</p>
                          <p>{data.current.summary}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Visibility</p>
                          <p>{data.current.visibility.value} {data.current.visibility.unit}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Wind Speed</p>
                          <p>{data.current.wind.speed.value} {data.current.wind.speed.unit}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Wind Gust</p>
                          <p>{data.current.wind.gust?.value || 'N/A'} {data.current.wind.gust?.unit || ''}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Wind Direction</p>
                          <p>{data.current.wind.direction_deg}° {data.current.wind.direction_cardinal || ''}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pressure</p>
                          <p>{data.current.pressure.value} {data.current.pressure.unit}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cloud Cover</p>
                          <p>{data.current.cloudCover}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">UV Index</p>
                          <p>{data.current.uvIndex}</p>
                        </div>
                        {data.current.airQuality && (
                          <>
                            <div>
                              <p className="text-muted-foreground">AQI</p>
                              <Badge>{data.current.airQuality.aqi} - {data.current.airQuality.category}</Badge>
                            </div>
                            <div>
                              <p className="text-muted-foreground">PM2.5</p>
                              <p>{data.current.airQuality.pm25?.toFixed(2) || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">PM10</p>
                              <p>{data.current.airQuality.pm10?.toFixed(2) || 'N/A'}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      <Cloud className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No current weather data available</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="hourly" className="space-y-4">
                {data.hourly?.items?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.hourly.items.map((hour: any, idx: number) => (
                      <Card key={idx}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {formatTimestamp(hour.time)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between">
                            <span>Temp:</span>
                            <span>{hour.temperature.value}{hour.temperature.unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Condition:</span>
                            <span className="text-right">{hour.summary}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Precip:</span>
                            <span>{hour.precipProbability}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Wind:</span>
                            <span>{hour.wind.speed.value} {hour.wind.speed.unit}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No hourly forecast data available</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="daily" className="space-y-4">
                {data.daily?.items?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.daily.items.map((day: any, idx: number) => (
                      <Card key={idx}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {formatDate(day.date)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between">
                            <span>High:</span>
                            <span>{day.tempMax.value}{day.tempMax.unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Low:</span>
                            <span>{day.tempMin.value}{day.tempMin.unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Condition:</span>
                            <span className="text-right">{day.summary}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rain:</span>
                            <span>{day.precipProbability}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>UV:</span>
                            <span>{day.uvIndexMax}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No daily forecast data available</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="alerts" className="space-y-4">
                {data.alerts?.length > 0 ? (
                  data.alerts.map((alert: any, idx: number) => (
                    <Card key={idx} className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          {alert.headline || alert.event}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Badge variant="outline">{alert.severity}</Badge>
                          <Badge variant="outline">{alert.urgency}</Badge>
                          <Badge variant="outline">{alert.certainty}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-muted-foreground">Event</p>
                          <p>{alert.event}</p>
                        </div>
                        {alert.description && (
                          <div>
                            <p className="text-muted-foreground">Description</p>
                            <p>{alert.description}</p>
                          </div>
                        )}
                        {alert.areas && alert.areas.length > 0 && (
                          <div>
                            <p className="text-muted-foreground">Areas</p>
                            <p>{alert.areas.join(', ')}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-muted-foreground">Starts</p>
                            <p>{formatTimestamp(alert.start_time)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Expires</p>
                            <p>{formatTimestamp(alert.end_time)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No weather alerts</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
