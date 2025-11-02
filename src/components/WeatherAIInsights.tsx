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
          `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/weather-ai-insights`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to load saved insights');
        }

        const data = await response.json();
        setSavedInsights(data.insights || []);
        console.log(`Loaded ${data.insights?.length || 0} saved weather AI insights`);
      } catch (error) {
        console.error('Error loading saved insights:', error);
        toast.error('Failed to load saved insights');
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
            const current = location.data.current;
            const temp = typeof current.temperature.value === 'object' 
              ? (current.temperature.value as any).value 
              : current.temperature.value;
            const tempUnit = typeof current.temperature.unit === 'object'
              ? (current.temperature.unit as any).value
              : current.temperature.unit;
            const humidity = typeof current.humidity === 'object'
              ? (current.humidity as any).value
              : current.humidity;
            const windSpeed = typeof current.wind.speed.value === 'object'
              ? (current.wind.speed.value as any).value
              : current.wind.speed.value;
            const windUnit = typeof current.wind.speed.unit === 'object'
              ? (current.wind.speed.unit as any).value
              : current.wind.speed.unit;
            const summary = typeof current.summary === 'object'
              ? (current.summary as any).value
              : current.summary;
            
            context += `- ${getFieldValue(location.location.name)}: ${temp}°${tempUnit}, ${summary}, Humidity: ${humidity}%, Wind: ${windSpeed} ${windUnit}\n`;
            if (location.data.alerts.length > 0) {
              context += `  Alerts: ${location.data.alerts.map(a => a.event).join(', ')}\n`;
            }
          }
        });
        context += '\n';
      } else {
        context += 'Analyzing all monitored locations.\n\n';
      }

      context += `User Question: ${chatMessage}`;

      console.log('Sending weather AI request:', {
        providerId: aiProvider.id,
        providerName: aiProvider.name,
        dashboard: 'weather',
        messageLength: chatMessage.length,
        contextLength: context.length
      });

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
          console.error('AI API Error Response:', errorData);
          
          // Handle quota errors specially
          if (isQuotaError) {
            toast.error(
              <div className="space-y-2">
                <p className="font-medium">API Quota Exceeded</p>
                <p className="text-sm whitespace-pre-line">{errorMessage}</p>
              </div>,
              { duration: 10000 } // Show for 10 seconds
            );
          }
        } catch (e) {
          const errorText = await response.text();
          console.error('AI API Error Text:', errorText);
          errorMessage = `HTTP ${response.status}: ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('AI Response received:', { provider: data.provider, model: data.model });
      setAiResponse(data.response);
      setCurrentQuestion(chatMessage);
      setCurrentModel(data.model || aiProvider.model);
      setInsightSaved(false);
      toast.success(`Response from ${data.provider}`);
      setChatMessage("");
      
    } catch (error) {
      console.error('Error sending AI message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Only show toast if not already shown for quota error
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
        `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/weather-ai-insights`,
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
        throw new Error('Failed to save insight');
      }

      const data = await response.json();
      setSavedInsights(prev => [data.insight, ...prev]);
      setInsightSaved(true);
      toast.success('Insight saved successfully!');
      
      // Close the dialog after successful save
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
      console.log(`Attempting to delete weather insight with ID: ${insightId}`);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/weather-ai-insights/${insightId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Delete failed with status ${response.status}:`, errorText);
        throw new Error(`Failed to delete insight: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Delete successful:', result);
      
      setSavedInsights(prev => prev.filter(i => i.id !== insightId));
      toast.success('Insight deleted');
      
    } catch (error) {
      console.error('Error deleting insight:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to delete insight: ${errorMessage}`);
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

  // Filter insights based on search query
  const filteredInsights = useMemo(() => {
    if (!searchQuery.trim()) {
      return savedInsights;
    }
    
    const query = searchQuery.toLowerCase();
    return savedInsights.filter(insight => 
      insight.question.toLowerCase().includes(query) ||
      insight.response.toLowerCase().includes(query)
    );
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
                      {selectedInsightType && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 p-0 hover:bg-muted rounded-sm"
                          onClick={() => setSelectedInsightType("")}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Central AI Assistant Area */}
                <div className="flex-1 bg-muted/30 rounded-lg p-8 mb-6 space-y-4">
                  {!aiResponse ? (
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-2xl flex items-center justify-center mx-auto">
                        <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="font-semibold text-lg">Weather AI Assistant</h3>
                      {loadingProvider ? (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Loading AI provider...</span>
                        </div>
                      ) : !aiProvider ? (
                        <p className="text-muted-foreground max-w-md mx-auto">
                          No AI provider configured for weather dashboard. 
                          Please configure one in Settings → AI Connections.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-muted-foreground max-w-md mx-auto">
                            Select locations and insight type above, then ask me to analyze weather patterns, 
                            predict conditions, assess risks, or provide meteorological insights.
                          </p>
                          <Badge variant="outline" className="text-xs">
                            Using: {aiProvider.name}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="w-5 h-5 text-purple-600" />
                          <span className="font-medium">AI Response</span>
                          <Badge variant="outline" className="text-xs">
                            {currentModel}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAiResponse(null);
                            setCurrentQuestion("");
                            setCurrentModel("");
                            setInsightSaved(false);
                          }}
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          New Question
                        </Button>
                      </div>
                      <ScrollArea className="h-[300px] border rounded-lg p-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <div className="mb-3 pb-3 border-b">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Question:</p>
                            <p className="text-sm">{currentQuestion}</p>
                          </div>
                          <div className="whitespace-pre-wrap text-sm">{aiResponse}</div>
                        </div>
                      </ScrollArea>
                      <div className="flex justify-end gap-2">
                        {insightSaved ? (
                          <Badge variant="outline" className="text-green-600">
                            ✓ Saved
                          </Badge>
                        ) : (
                          <Button
                            onClick={handleSaveInsight}
                            disabled={savingInsight}
                            size="sm"
                          >
                            {savingInsight ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save Insight'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input Area */}
                {!aiResponse && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ask AI Assistant</label>
                    <div className="flex gap-2">
                      <Textarea
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="e.g., What are the precipitation patterns across selected locations?"
                        className="min-h-[60px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={!aiProvider || loadingProvider}
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!chatMessage.trim() || sendingMessage || !aiProvider || loadingProvider}
                        size="icon"
                        className="shrink-0"
                      >
                        {sendingMessage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Press Shift+Enter for new line, Enter to send
                    </p>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search insights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
        </div>

        {/* Insights List */}
        {loadingInsights ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading insights...</span>
          </div>
        ) : filteredInsights.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? (
              <>
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No insights found matching "{searchQuery}"</p>
              </>
            ) : (
              <>
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No saved insights yet</p>
                <p className="text-sm mt-2">Click "Add AI Insights" to get started</p>
              </>
            )}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory max-w-[calc(4*350px+3*1rem)]">
            {filteredInsights.map((insight) => (
              <Collapsible
                key={insight.id}
                open={expandedInsights.has(insight.id)}
                onOpenChange={() => toggleInsightExpansion(insight.id)}
                className="min-w-[350px] max-w-[350px] flex-shrink-0 snap-start"
              >
                <Card className="overflow-hidden h-full border-l-4 border-blue-400">
                  <CardHeader className="pb-3">
                    <div className="space-y-3">
                      {/* Header Row with Title and Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity text-left">
                          <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 shrink-0">
                            {expandedInsights.has(insight.id) ? (
                              <ChevronDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          <CardTitle className="text-sm leading-snug line-clamp-2">{insight.question}</CardTitle>
                        </CollapsibleTrigger>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteInsight(insight.id);
                          }}
                          className="h-7 w-7 shrink-0 -mr-1 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                          aria-label="Delete insight"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>

                      {/* Visual Summary - Only shown when collapsed */}
                      {!expandedInsights.has(insight.id) && (() => {
                          // Extract visual insights from response
                          const response = insight.response;
                          const temps = response.match(/(\d+)[°]?\s*[FCfc]/g) || [];
                          const percentages = response.match(/(\d+)%/g) || [];
                          const speeds = response.match(/(\d+)\s*(mph|km\/h|m\/s)/gi) || [];
                          const distances = response.match(/(\d+)\s*(mm|cm|inches|miles|km)/gi) || [];
                          
                          // Detect sentiment/urgency keywords
                          const hasAlert = /alert|warning|severe|extreme|danger/i.test(response);
                          const hasPositive = /clear|sunny|pleasant|favorable|good|ideal/i.test(response);
                          const hasNegative = /storm|rain|snow|cold|hot|wind|flood/i.test(response);
                          
                          // Extract key phrases (first sentence or short summary)
                          const firstSentence = response.split(/[.!?]\s/)[0];
                          const summary = firstSentence.length > 100 ? firstSentence.substring(0, 100) + '...' : firstSentence;
                          
                          return (
                            <div className="space-y-2.5">
                              {/* Status Banner - Prominent visual indicator */}
                              {(hasAlert || hasPositive || hasNegative) && (
                                <div className={`px-3 py-2 rounded-lg border-l-4 ${
                                  hasAlert 
                                    ? 'bg-red-50 dark:bg-red-950/30 border-red-500' 
                                    : hasPositive 
                                    ? 'bg-green-50 dark:bg-green-950/30 border-green-500' 
                                    : 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-500'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    {hasAlert && <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />}
                                    {hasPositive && !hasAlert && <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />}
                                    {hasNegative && !hasAlert && <Flame className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />}
                                    <span className={`text-xs font-medium ${
                                      hasAlert 
                                        ? 'text-red-700 dark:text-red-300' 
                                        : hasPositive 
                                        ? 'text-green-700 dark:text-green-300' 
                                        : 'text-yellow-700 dark:text-yellow-300'
                                    }`}>
                                      {hasAlert ? 'Weather Alert' : hasPositive ? 'Favorable Conditions' : 'Caution Advised'}
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Key Metrics - Compact 2x2 Grid */}
                              {(temps.length > 0 || percentages.length > 0 || speeds.length > 0 || distances.length > 0) && (
                                <div className="grid grid-cols-2 gap-2">
                                  {temps.slice(0, 2).map((temp, idx) => (
                                    <div key={`temp-${idx}`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-950/40 dark:to-orange-950/20 border border-orange-200 dark:border-orange-800">
                                      <Thermometer className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                                      <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">{temp}</span>
                                    </div>
                                  ))}
                                  {percentages.slice(0, 2).map((pct, idx) => (
                                    <div key={`pct-${idx}`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/40 dark:to-blue-950/20 border border-blue-200 dark:border-blue-800">
                                      <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{pct}</span>
                                    </div>
                                  ))}
                                  {speeds.slice(0, 1).map((speed, idx) => (
                                    <div key={`speed-${idx}`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-950/40 dark:to-purple-950/20 border border-purple-200 dark:border-purple-800">
                                      <Wind className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">{speed}</span>
                                    </div>
                                  ))}
                                  {distances.slice(0, 1).map((dist, idx) => (
                                    <div key={`dist-${idx}`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-teal-100 to-teal-50 dark:from-teal-950/40 dark:to-teal-950/20 border border-teal-200 dark:border-teal-800">
                                      <Cloud className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                                      <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">{dist}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Quick Summary */}
                              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 px-1">
                                {summary}
                              </p>
                            </div>
                          );
                        })()}
                        
                        {/* Metadata Footer - Always shown */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <Badge variant="outline" className="text-xs gap-1 px-1.5 py-0">
                            <Brain className="w-3 h-3" />
                            <span className="max-w-[80px] truncate">{insight.provider}</span>
                          </Badge>
                          {insight.insightType && insight.insightType !== 'all' && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              {insightTypes.find(t => t.value === insight.insightType)?.label || insight.insightType}
                            </Badge>
                          )}
                          {insight.selectedLocations && insight.selectedLocations.length > 0 && (
                            <Badge variant="outline" className="text-xs gap-1 px-1.5 py-0">
                              <Cloud className="w-3 h-3" />
                              {insight.selectedLocations.length}
                            </Badge>
                          )}
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground truncate">{new Date(insight.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div className="relative overflow-hidden rounded-lg border border-border/50 bg-gradient-to-br from-muted/20 via-muted/10 to-background">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-pink-500/50"></div>
                          <div className="p-6 space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 p-2 rounded-lg bg-primary/10 border border-primary/20">
                                <Brain className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1 space-y-3">
                                {insight.response.split('\n\n').map((paragraph, idx) => {
                                  // Check if it's a list item
                                  if (paragraph.trim().match(/^[-•*]\s/)) {
                                    const items = paragraph.split('\n').filter(line => line.trim().match(/^[-•*]\s/));
                                    return (
                                      <ul key={idx} className="space-y-2 ml-2">
                                        {items.map((item, itemIdx) => (
                                          <li key={itemIdx} className="flex items-start gap-2 text-sm">
                                            <Zap className="w-3 h-3 mt-1 text-blue-500 flex-shrink-0" />
                                            <span className="flex-1">{item.replace(/^[-•*]\s/, '')}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    );
                                  }
                                  
                                  // Check if it's a heading (starts with #)
                                  if (paragraph.trim().match(/^#+\s/)) {
                                    return (
                                      <h4 key={idx} className="font-semibold text-foreground/90 flex items-center gap-2">
                                        <div className="w-1 h-4 bg-primary rounded-full"></div>
                                        {paragraph.replace(/^#+\s/, '')}
                                      </h4>
                                    );
                                  }
                                  
                                  // Check if it contains numbers/data (temperature, percentages, etc.)
                                  const hasData = paragraph.match(/\d+[°%]|\d+\s*(mph|km\/h|mm|inches)/i);
                                  
                                  // Regular paragraph
                                  return (
                                    <p key={idx} className={`text-sm leading-relaxed ${hasData ? 'bg-blue-50 dark:bg-blue-950/20 rounded-md px-3 py-2 border-l-2 border-blue-400' : 'text-muted-foreground'}`}>
                                      {paragraph}
                                    </p>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    );
  }

  // When controlled externally (open prop provided), render just the Dialog
  if (controlledOpen !== undefined) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                {selectedInsightType && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 p-0 hover:bg-muted rounded-sm"
                    onClick={() => setSelectedInsightType("")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Central AI Assistant Area */}
          <div className="flex-1 bg-muted/30 rounded-lg p-8 mb-6 space-y-4">
            {!aiResponse ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-2xl flex items-center justify-center mx-auto">
                  <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-lg">Weather AI Assistant</h3>
                {loadingProvider ? (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading AI provider...</span>
                  </div>
                ) : !aiProvider ? (
                  <p className="text-muted-foreground max-w-md mx-auto">
                    No AI provider configured for weather dashboard. 
                    Please configure one in Settings → AI Connections.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Select locations and insight type above, then ask me to analyze weather patterns, 
                      predict conditions, assess risks, or provide meteorological insights.
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Using: {aiProvider.name}
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <span className="font-medium">AI Response</span>
                    <Badge variant="outline" className="text-xs">
                      {currentModel}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAiResponse(null);
                      setCurrentQuestion("");
                      setCurrentModel("");
                      setInsightSaved(false);
                    }}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    New Question
                  </Button>
                </div>
                <ScrollArea className="h-[300px] border rounded-lg p-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="mb-3 pb-3 border-b">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Question:</p>
                      <p className="text-sm">{currentQuestion}</p>
                    </div>
                    <div className="whitespace-pre-wrap text-sm">{aiResponse}</div>
                  </div>
                </ScrollArea>
                <div className="flex justify-end gap-2">
                  {insightSaved ? (
                    <Badge variant="outline" className="text-green-600">
                      ✓ Saved
                    </Badge>
                  ) : (
                    <Button
                      onClick={handleSaveInsight}
                      disabled={savingInsight}
                      size="sm"
                    >
                      {savingInsight ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Insight'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Area */}
          {!aiResponse && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Ask AI Assistant</label>
              <div className="flex gap-2">
                <Textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="e.g., What are the precipitation patterns across selected locations?"
                  className="min-h-[60px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={!aiProvider || loadingProvider}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim() || sendingMessage || !aiProvider || loadingProvider}
                  size="icon"
                  className="shrink-0"
                >
                  {sendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Press Shift+Enter for new line, Enter to send
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
