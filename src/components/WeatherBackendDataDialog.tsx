import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

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
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Updated to use the weather_dashboard edge function
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/weather_dashboard`;
      const response = await fetch(`${baseUrl}/locations`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch locations: ${response.status}`);
      }

      const result = await response.json();
      const location = result.locations?.find((loc: any) => loc.id === locationId);
      
      if (!location) {
        throw new Error('Location not found');
      }
      
      // Fetch the full weather data for this location
      const weatherResponse = await fetch(`${baseUrl}/weather-data`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!weatherResponse.ok) {
        throw new Error(`Failed to fetch weather data: ${weatherResponse.status}`);
      }
      
      const weatherResult = await weatherResponse.json();
      const weatherData = weatherResult.data?.find((wd: any) => wd.location.id === locationId);
      
      if (weatherData) {
        setData(weatherData);
      } else {
        throw new Error('Weather data not found for this location');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error(`Failed to load backend data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      fetchData();
    } else {
      setData(null);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Backend Data: {locationName}</DialogTitle>
          <DialogDescription>
            Raw weather data from the backend API for this location
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={fetchData}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {data && (
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
