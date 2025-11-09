import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { WeatherLocationWithOverrides, getFieldValue } from "../types/weather";
import { 
  Brain, ChevronDown, ChevronRight, Cloud, Thermometer, Wind, Droplets,
  AlertTriangle, Eye, Flame, Zap, Send, X, Loader2, Search, Trash2, ChevronLeft
} from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { toast } from "sonner@2.0.3";

interface WeatherAIInsightsProps {
  locations: WeatherLocationWithOverrides[];
  compact?: boolean;
  listView?: boolean;
  onClick?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultLocationId?: string;
}

export function WeatherAIInsights({ 
  locations, 
  compact = false, 
  listView = false, 
  onClick,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultLocationId
}: WeatherAIInsightsProps) {
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const isDialogOpen = controlledOpen !== undefined ? controlledOpen : internalDialogOpen;
  const setIsDialogOpen = controlledOnOpenChange || setInternalDialogOpen;
  const [isLocationPopoverOpen, setIsLocationPopoverOpen] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedInsightType, setSelectedInsightType] = useState<string>("");
  const [chatMessage, setChatMessage] = useState("");
  const [aiProvider, setAiProvider] = useState<any>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [currentModel, setCurrentModel] = useState<string>("");
  const [savingInsight, setSavingInsight] = useState(false);
  const [insightSaved, setInsightSaved] = useState(false);
  const [savedInsights, setSavedInsights] = useState<any[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  // Weather insight types
  const insightTypes = [
    { value: 'all', label: '🌤️ All Insights', description: 'General weather analysis' },
    { value: 'alerts', label: '⚠️ Active Alerts', description: 'Weather warnings and advisories' },
    { value: 'precipitation', label: '🌧️ Precipitation', description: 'Rain and snow patterns' },
    { value: 'temperature', label: '🌡️ Temperature', description: 'Heat and cold analysis' },
    { value: 'wind', label: '💨 Wind', description: 'Wind speed and gusts' },
    { value: 'airquality', label: '😷 Air Quality', description: 'AQI and pollution levels' },
    { value: 'lightning', label: '⚡ Lightning', description: 'Storm activity' },
    { value: 'visibility', label: '🌫️ Visibility', description: 'Fog and visibility conditions' },
    { value: 'tropical', label: '🌪️ Tropical', description: 'Hurricane and tropical systems' },
  ];

  // Load AI provider assigned to weather dashboard
  useEffect(() => {
    const loadAIProvider = async () => {
      try {
        setLoadingProvider(true);
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/ai-providers`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to load AI providers');
        }

        const data = await response.json();
        
        // Find provider assigned to weather dashboard
        const weatherProvider = data.providers?.find((p: any) =>
          p.dashboardAssignments?.some((d: any) => 
            d.dashboard === 'weather' && d.textProvider
          )
        );

        if (weatherProvider) {
          setAiProvider(weatherProvider);
          console.log('Weather AI Provider loaded:', weatherProvider.name);
        } else {
          console.warn('No AI provider assigned to weather dashboard');
        }
      } catch (error) {
        console.error('Error loading AI provider:', error);
      } finally {
        setLoadingProvider(false);
      }
    };

    loadAIProvider();
  }, []);

  // Pre-select location when dialog opens with defaultLocationId
  useEffect(() => {
    if (isDialogOpen && defaultLocationId && !selectedLocations.includes(defaultLocationId)) {
      setSelectedLocations([defaultLocationId]);
    }
  }, [isDialogOpen, defaultLocationId]);

  // Load saved insights
  useEffect(() => {
    const loadSavedInsights = async () => {
      try {
        setLoadingInsights(true);
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/weather_dashboard/ai-insights`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (!response.ok) throw new Error(`Failed to load insights: ${response.status}`);

        const data = await response.json();
        setSavedInsights(data.insights || []);
      } catch (error) {
        console.error('Error loading saved insights:', error);
        toast.error('Failed to load saved insights');
        setSavedInsights([]);
      } finally {
        setLoadingInsights(false);
      }
    };

    loadSavedInsights();
  }, []);

  const toggleLocationSelection = (locationId: string) => {
    setSelectedLocations(prev => 
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const clearAllLocations = () => {
    setSelectedLocations([]);
  };

  const getSelectedLocationName = (locationId: string) => {
    const location = locations.find(l => l.location.id === locationId);
    return location ? getFieldValue(location.location.name) : locationId;
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    
    if (!aiProvider) {
      toast.error('No AI provider configured for weather dashboard. Please configure one in AI Connections.');
      return;
    }

    try {
      setSendingMessage(true);
      setAiResponse(null);

      // Build context from selected locations and insight type
      let context = 'You are a helpful weather AI assistant analyzing meteorological data. Please provide 3-10 insightful bullet points with short sentences containing specific percentages, probabilities, and quantifiable metrics that can be easily visualized. Format for easy visualization (e.g., "65% precipitation probability", "Risk level: 7/10", "Temperature: 72°F", "Wind: 15 mph"). Focus on actionable, data-rich insights with concrete numbers.\n\n';
      
      const selectedInsight = insightTypes.find(type => type.value === selectedInsightType);
      
      if (selectedInsight && selectedInsight.value !== 'all') {
        context += `Focus Area: ${selectedInsight.label} - ${selectedInsight.description}\n\n`;
      }

      if (selectedLocations.length > 0) {
        context += `Selected Locations:\n`;
        selectedLocations.forEach(locationId => {
          const location = locations.find(l => l.location.id === locationId);
          if (location) {
            const current = location.data?.current;
            if (current) {
              const temp = typeof current.temperature?.value === 'object' 
                ? (current.temperature.value as any).value 
                : current.temperature?.value;
              const tempUnit = typeof current.temperature?.unit === 'object'
                ? (current.temperature.unit as any).value
                : current.temperature?.unit;
              const humidity = typeof current.humidity === 'object'
                ? (current.humidity as any).value
                : current.humidity;
              const windSpeed = typeof current.wind?.speed?.value === 'object'
                ? (current.wind.speed.value as any).value
                : current.wind?.speed?.value;
              const windUnit = typeof current.wind?.speed?.unit === 'object'
                ? (current.wind.speed.unit as any).value
                : current.wind?.speed?.unit;
              const summary = typeof current.summary === 'object'
                ? (current.summary as any).value
                : current.summary;
              
              context += `- ${getFieldValue(location.location.name)}: ${temp}°${tempUnit}, ${summary}, Humidity: ${humidity}%, Wind: ${windSpeed} ${windUnit}\n`;
              if (location.data?.alerts?.length > 0) {
                context += `  Alerts: ${location.data.alerts.map(a => a.event).join(', ')}\n`;
              }
            }
          }
        });
        context += '\n';
      } else {
        context += 'Analyzing all monitored locations.\n\n';
      }

      context += `User Question: ${chatMessage}`;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/ai-providers/chat`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            providerId: aiProvider.id,
            message: chatMessage,
            context: context,
            dashboard: 'weather',
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = 'Failed to get AI response';
        let isQuotaError = false;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          isQuotaError = response.status === 429 || errorData.isQuotaError;
          
          if (isQuotaError) {
            toast.error(
              <div className="space-y-2">
                <p className="font-medium">API Quota Exceeded</p>
                <p className="text-sm whitespace-pre-line">{errorMessage}</p>
              </div>,
              { duration: 10000 }
            );
          }
        } catch (e) {
          const errorText = await response.text();
          errorMessage = `HTTP ${response.status}: ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setAiResponse(data.response);
      setCurrentQuestion(chatMessage);
      setCurrentModel(data.model || aiProvider.model);
      setInsightSaved(false);
      toast.success(`Response from ${data.provider}`);
      setChatMessage("");
      
    } catch (error) {
      console.error('Error sending AI message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (!errorMessage.includes('quota') && !errorMessage.includes('429')) {
        toast.error(`AI Error: ${errorMessage}`);
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSaveInsight = async () => {
    if (!aiResponse || !currentQuestion) return;

    try {
      setSavingInsight(true);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/weather_dashboard/ai-insights`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: currentQuestion,
            response: aiResponse,
            selectedLocations: selectedLocations,
            insightType: selectedInsightType || 'all',
            provider: aiProvider?.name || 'Unknown',
            model: currentModel,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save insight: ${response.status}`);
      }

      const data = await response.json();
      setSavedInsights(prev => [data.insight, ...prev]);
      setInsightSaved(true);
      toast.success('Insight saved successfully!');
      
      setTimeout(() => {
        setIsDialogOpen(false);
      }, 500);
      
    } catch (error) {
      console.error('Error saving insight:', error);
      toast.error('Failed to save insight');
    } finally {
      setSavingInsight(false);
    }
  };

  const handleDeleteInsight = async (insightId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/weather_dashboard/ai-insights/${insightId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete insight: ${response.status}`);
      }

      setSavedInsights(prev => prev.filter(i => i.id !== insightId));
      toast.success('Insight deleted');
      
    } catch (error) {
      console.error('Error deleting insight:', error);
      toast.error('Failed to delete insight');
    }
  };

  const toggleInsightExpansion = (insightId: string) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(insightId)) {
        newSet.delete(insightId);
      } else {
        newSet.add(insightId);
      }
      return newSet;
    });
  };

  // Helper functions to handle both old KV structure and new table structure
  const getInsightQuestion = (insight: any) => {
    return insight.metadata?.question || insight.topic || insight.question || '';
  };

  const getInsightResponse = (insight: any) => {
    return insight.insight || insight.response || '';
  };

  const getInsightType = (insight: any) => {
    return insight.metadata?.insightType || insight.category || insight.insightType || 'all';
  };

  const getInsightProvider = (insight: any) => {
    return insight.metadata?.provider || insight.provider || 'Unknown';
  };

  const getInsightModel = (insight: any) => {
    return insight.metadata?.model || insight.model || '';
  };

  const getInsightCreatedAt = (insight: any) => {
    return insight.created_at || insight.createdAt || new Date().toISOString();
  };

  // Filter insights based on search query
  const filteredInsights = useMemo(() => {
    if (!searchQuery.trim()) {
      return savedInsights;
    }
    
    const query = searchQuery.toLowerCase();
    return savedInsights.filter(insight => {
      const question = getInsightQuestion(insight);
      const response = getInsightResponse(insight);
      const insightType = getInsightType(insight);
      
      return (
        question.toLowerCase().includes(query) ||
        response.toLowerCase().includes(query) ||
        insightType.toLowerCase().includes(query)
      );
    });
  }, [savedInsights, searchQuery]);

  if (compact) {
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" onClick={onClick}>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {loadingInsights ? (
                <>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg animate-pulse">
                    <Loader2 className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">AI Insights</p>
                    <p className="text-2xl font-semibold">...</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">AI Insights</p>
                    <p className="text-2xl font-semibold">{savedInsights.length}</p>
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Saved analyses</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (listView) {
    return (
      <div className="space-y-4 border rounded-lg p-6">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold">AI Weather Insights</h3>
          <Badge variant="secondary">
            {searchQuery ? `${filteredInsights.length} of ${savedInsights.length}` : `${savedInsights.length} Saved`}
          </Badge>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedLocations([]);
                    setSelectedInsightType("");
                    setChatMessage("");
                    setAiResponse(null);
                    setInsightSaved(false);
                    setCurrentQuestion("");
                    setCurrentModel("");
                  }}
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Add AI Insights
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader className="space-y-0 pb-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <DialogTitle>Weather AI Insight Generator</DialogTitle>
                  </div>
                  <DialogDescription>
                    Select locations and an insight type, then ask the AI assistant for weather analysis and predictions.
                  </DialogDescription>
                </DialogHeader>
                
                {/* Two dropdowns side by side */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Locations</label>
                    <Popover open={isLocationPopoverOpen} onOpenChange={setIsLocationPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-auto min-h-9"
                        >
                          {selectedLocations.length === 0 ? (
                            <span className="text-muted-foreground">Select locations</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {selectedLocations.map((locationId) => (
                                <Badge
                                  key={locationId}
                                  variant="secondary"
                                  className="gap-1"
                                >
                                  {getSelectedLocationName(locationId)}
                                  <X
                                    className="w-3 h-3 cursor-pointer hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleLocationSelection(locationId);
                                    }}
                                  />
                                </Badge>
                              ))}
                            </div>
                          )}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <ScrollArea className="max-h-[300px]">
                          <div className="p-2">
                            {locations.map((location) => (
                              <div
                                key={location.location.id}
                                className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-accent rounded-sm"
                                onClick={() => toggleLocationSelection(location.location.id)}
                              >
                                <Checkbox
                                  checked={selectedLocations.includes(location.location.id)}
                                  onCheckedChange={() => toggleLocationSelection(location.location.id)}
                                />
                                <Cloud className="w-4 h-4 text-blue-600" />
                                <span className="flex-1">{getFieldValue(location.location.name)}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        {selectedLocations.length > 0 && (
                          <div className="p-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearAllLocations}
                              className="w-full"
                            >
                              Clear all ({selectedLocations.length})
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Insight Type</label>
                    <div className="relative">
                      <Select value={selectedInsightType} onValueChange={setSelectedInsightType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select insight type" />
                        </SelectTrigger>
                        <SelectContent>
                          {insightTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex flex-col">
                                <span>{type.label}</span>
                                <span className="text-xs text-muted-foreground">{type.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Chat Input */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Ask about weather patterns, forecasts, alerts, or any weather-related question..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1 min-h-[100px]"
                      disabled={sendingMessage || loadingProvider}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {loadingProvider ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Loading AI provider...
                        </span>
                      ) : aiProvider ? (
                        <span>Using {aiProvider.name}</span>
                      ) : (
                        <span className="text-orange-600">No AI provider assigned to Weather</span>
                      )}
                    </div>
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!chatMessage.trim() || sendingMessage || loadingProvider || !aiProvider}
                    >
                      {sendingMessage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Ask AI
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* AI Response */}
                {aiResponse && (
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">AI Response</span>
                        {currentModel && (
                          <Badge variant="outline" className="text-xs">
                            {currentModel}
                          </Badge>
                        )}
                      </div>
                      <Button
                        onClick={handleSaveInsight}
                        disabled={savingInsight || insightSaved}
                        size="sm"
                        variant={insightSaved ? "outline" : "default"}
                      >
                        {savingInsight ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : insightSaved ? (
                          <>✓ Saved</>
                        ) : (
                          <>Save Insight</>
                        )}
                      </Button>
                    </div>
                    <ScrollArea className="max-h-[300px] p-4 bg-muted rounded-lg">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="whitespace-pre-wrap">{aiResponse}</p>
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </DialogContent>
            </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search insights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Saved Insights List */}
        {loadingInsights ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredInsights.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No insights match your search' : 'No saved insights yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInsights.map((insight) => {
              const isExpanded = expandedInsights.has(insight.id);
              const question = getInsightQuestion(insight);
              const response = getInsightResponse(insight);
              const insightType = getInsightType(insight);
              const provider = getInsightProvider(insight);
              const model = getInsightModel(insight);
              const createdAt = getInsightCreatedAt(insight);
              
              return (
                <div key={insight.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {insightTypes.find(t => t.value === insightType)?.label || insightType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(createdAt).toLocaleString()}
                        </span>
                        {provider && (
                          <Badge variant="secondary" className="text-xs">
                            {provider}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm mb-2">{question}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleInsightExpansion(insight.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteInsight(insight.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="pl-4 border-l-2 border-purple-200">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{response}</p>
                      {model && (
                        <p className="text-xs text-muted-foreground mt-2">Model: {model}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Default full view
  return (
    <Card className="hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          AI Weather Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>Click the compact card to open insights</p>
      </CardContent>
    </Card>
  );
}