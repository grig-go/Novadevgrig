import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { Race, getFieldValue } from "../types/election";
import { 
  Brain, ChevronDown, ChevronLeft, Loader2, Send, X, Search, Trash2, Vote
} from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { toast } from "sonner@2.0.3";

interface ElectionsAIInsightsProps {
  races: Race[];
  compact?: boolean;
  listView?: boolean;
  onClick?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultRaceId?: string;
  selectedRaceType?: string;
  onRaceTypeChange?: (raceType: string) => void;
}

export function ElectionAIInsights({ 
  races, 
  compact = false, 
  listView = false, 
  onClick,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultRaceId,
  selectedRaceType: parentRaceType,
  onRaceTypeChange
}: ElectionsAIInsightsProps) {
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const isDialogOpen = controlledOpen !== undefined ? controlledOpen : internalDialogOpen;
  const setIsDialogOpen = controlledOnOpenChange || setInternalDialogOpen;
  const [isRacePopoverOpen, setIsRacePopoverOpen] = useState(false);
  const [isYearPopoverOpen, setIsYearPopoverOpen] = useState(false);
  const [isRaceTypePopoverOpen, setIsRaceTypePopoverOpen] = useState(false);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedRaceTypes, setSelectedRaceTypes] = useState<string[]>([]);
  const [selectedRaces, setSelectedRaces] = useState<string[]>([]);
  const [raceSearchQuery, setRaceSearchQuery] = useState("");
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

  // Available years
  const availableYears = [
    { value: '2024', label: '2024' },
    { value: '2022', label: '2022' },
    { value: '2020', label: '2020' },
    { value: '2018', label: '2018' },
    { value: '2016', label: '2016' },
  ];

  // Get available race types from actual races data
  const availableRaceTypes = useMemo(() => {
    const raceTypeSet = new Set<string>();
    races.forEach(race => {
      const raceType = getFieldValue(race.raceType) || getFieldValue(race.race_type);
      if (raceType) {
        raceTypeSet.add(raceType);
      }
    });
    
    // Map race types to display labels with emojis
    const raceTypeLabels: Record<string, string> = {
      'PRESIDENTIAL': '🏛️ Presidential',
      'PRESIDENT': '🏛️ Presidential',
      'SENATE': '🏛️ Senate',
      'HOUSE': '🏛️ House',
      'GOVERNOR': '👔 Governor',
      'STATE_SENATE': '🏛️ State Senate',
      'STATE_HOUSE': '🏛️ State House',
      'MAYOR': '🏙️ Mayor',
      'LOCAL': '🏘️ Local',
    };
    
    return Array.from(raceTypeSet)
      .sort()
      .map(type => ({
        value: type,
        label: raceTypeLabels[type] || `📊 ${type}`
      }));
  }, [races]);

  // Election insight types
  const insightTypes = [
    { value: 'all', label: '🗳️ All Insights', description: 'General election analysis' },
    { value: 'polls', label: '📊 Polling Trends', description: 'Poll aggregation and trends' },
    { value: 'turnout', label: '👥 Voter Turnout', description: 'Turnout projections and patterns' },
    { value: 'margins', label: '📉 Race Margins', description: 'Competitive race analysis' },
    { value: 'demographics', label: '🌍 Demographics', description: 'Demographic voting patterns' },
    { value: 'shifts', label: '↔️ Electoral Shifts', description: 'Swing states and trends' },
    { value: 'candidates', label: '👤 Candidate Performance', description: 'Candidate-specific analysis' },
    { value: 'historical', label: '📅 Historical Patterns', description: 'Historical comparisons' },
  ];

  // Load AI provider assigned to elections dashboard
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
        
        // Find provider assigned to elections dashboard
        const electionsProvider = data.providers?.find((p: any) =>
          p.dashboardAssignments?.some((d: any) => 
            d.dashboard === 'elections' && d.textProvider
          )
        );

        if (electionsProvider) {
          setAiProvider(electionsProvider);
          console.log('Elections AI Provider loaded:', electionsProvider.name);
        } else {
          console.warn('No AI provider assigned to elections dashboard');
        }
      } catch (error) {
        console.error('Error loading AI provider:', error);
      } finally {
        setLoadingProvider(false);
      }
    };

    loadAIProvider();
  }, []);

  // Pre-select race when dialog opens with defaultRaceId
  useEffect(() => {
    if (isDialogOpen && defaultRaceId && !selectedRaces.includes(defaultRaceId)) {
      setSelectedRaces([defaultRaceId]);
    }
  }, [isDialogOpen, defaultRaceId]);

  // Load saved insights
  useEffect(() => {
    loadSavedInsights();
  }, []);

  const loadSavedInsights = async () => {
    try {
      setLoadingInsights(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ai_insights/elections`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to load insights: ${response.status} - ${errorText}`);
        throw new Error(`Failed to load saved insights: ${response.status}`);
      }

      const data = await response.json();
      setSavedInsights(data.insights || []);
      console.log(`✅ Loaded ${data.insights?.length || 0} saved election AI insights from database`);
    } catch (error) {
      console.error('Error loading saved insights:', error);
      toast.error('Failed to load saved insights');
      setSavedInsights([]); // Set empty array on error
    } finally {
      setLoadingInsights(false);
    }
  };

  const clearAllRaces = () => {
    setSelectedRaces([]);
  };

  const toggleYearSelection = (year: string) => {
    setSelectedYears(prev => 
      prev.includes(year)
        ? prev.filter(y => y !== year)
        : [...prev, year]
    );
  };

  const clearAllYears = () => {
    setSelectedYears([]);
  };

  const toggleRaceTypeSelection = (raceType: string) => {
    const newSelection = selectedRaceTypes.includes(raceType)
      ? selectedRaceTypes.filter(type => type !== raceType)
      : [...selectedRaceTypes, raceType];
    
    setSelectedRaceTypes(newSelection);
    
    // Sync with parent dashboard if callback provided
    if (onRaceTypeChange && newSelection.length === 1) {
      onRaceTypeChange(newSelection[0]);
    } else if (onRaceTypeChange && newSelection.length === 0) {
      onRaceTypeChange('all');
    }
  };

  const clearAllRaceTypes = () => {
    setSelectedRaceTypes([]);
    if (onRaceTypeChange) {
      onRaceTypeChange('all');
    }
  };

  // Sync with parent race type when it changes
  useEffect(() => {
    if (parentRaceType && parentRaceType !== 'all') {
      // If parent has a race type selected, sync it to our multi-select
      if (!selectedRaceTypes.includes(parentRaceType)) {
        setSelectedRaceTypes([parentRaceType]);
      }
    }
  }, [parentRaceType]);

  const toggleRaceSelection = (raceId: string) => {
    setSelectedRaces(prev => 
      prev.includes(raceId)
        ? prev.filter(id => id !== raceId)
        : [...prev, raceId]
    );
  };

  const getSelectedRaceName = (raceId: string) => {
    const race = races.find(r => r.id === raceId);
    if (!race) return raceId;
    
    // Get basic fields
    const raceType = getFieldValue(race.raceType) || getFieldValue(race.race_type) || '';
    const state = getFieldValue(race.state) || '';
    const district = race.district || '';
    const office = getFieldValue(race.office) || '';
    const title = getFieldValue(race.title) || '';
    
    // Build the display name with more detail
    let displayName = '';
    
    // Use title if available (most descriptive)
    if (title && title !== raceType) {
      displayName = title;
    } else {
      // Build from components
      const typeLabel = getRaceTypeLabel(raceType);
      
      if (district) {
        displayName = `${typeLabel} District ${district}`;
      } else if (office && office !== raceType) {
        displayName = office;
      } else {
        displayName = typeLabel;
      }
      
      // Add state
      if (state) {
        displayName += ` - ${state}`;
      }
    }
    
    return displayName || raceId;
  };

  const getRaceTypeLabel = (raceType: string): string => {
    const labels: Record<string, string> = {
      'PRESIDENT': 'Presidential',
      'SENATE': 'Senate',
      'HOUSE': 'House',
      'GOVERNOR': 'Governor',
      'STATE_SENATE': 'State Senate',
      'STATE_HOUSE': 'State House',
      'MAYOR': 'Mayor',
      'LOCAL': 'Local'
    };
    return labels[raceType] || raceType;
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    
    if (!aiProvider) {
      toast.error('No AI provider configured for elections dashboard. Please configure one in AI Connections.');
      return;
    }

    try {
      setSendingMessage(true);
      setAiResponse(null);

      // Build context from selected races and insight type
      let context = 'You are a helpful election AI assistant analyzing electoral data and voting patterns. Please provide 3-10 insightful bullet points with short sentences containing specific percentages, vote counts, and quantifiable metrics that can be easily visualized. Format for easy visualization (e.g., "55% vote share", "Margin: +3.2%", "Turnout: 65%", "Lead: 12,500 votes"). Focus on actionable, data-rich insights with concrete numbers.\\n\\n';
      
      const selectedInsight = insightTypes.find(type => type.value === selectedInsightType);
      
      if (selectedInsight && selectedInsight.value !== 'all') {
        context += `Focus Area: ${selectedInsight.label} - ${selectedInsight.description}\\n\\n`;
      }

      if (selectedRaces.length > 0) {
        context += `Selected Races:\\n`;
        selectedRaces.forEach(raceId => {
          const race = races.find(r => r.id === raceId);
          if (race) {
            const raceType = getRaceTypeLabel(getFieldValue(race.race_type) || '');
            const state = getFieldValue(race.state) || '';
            const status = getFieldValue(race.status) || '';
            const candidates = race.candidates.slice(0, 3);
            
            context += `- ${raceType} in ${state} (${status}):\\n`;
            candidates.forEach((candidate, idx) => {
              const name = getFieldValue(candidate.name) || 'Unknown';
              const votes = getFieldValue(candidate.votes) || 0;
              const voteShare = getFieldValue(candidate.vote_share) || 0;
              context += `  ${idx + 1}. ${name}: ${votes.toLocaleString()} votes (${voteShare.toFixed(1)}%)\\n`;
            });
          }
        });
        context += '\\n';
      } else {
        context += 'Analyzing all monitored races.\\n\\n';
      }

      context += `User Question: ${chatMessage}`;

      console.log('Sending elections AI request:', {
        providerId: aiProvider.id,
        providerName: aiProvider.name,
        dashboard: 'elections',
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
            dashboard: 'elections',
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
              { duration: 10000 }
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
        `https://${projectId}.supabase.co/functions/v1/ai_insights/elections`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: currentQuestion,
            response: aiResponse,
            selectedRaces: selectedRaces,
            insightType: selectedInsightType || 'all',
            provider: aiProvider?.name || 'Unknown',
            model: currentModel,
            category: selectedInsightType || 'general',
            topic: currentQuestion.substring(0, 100),
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
      console.log(`Attempting to delete election insight with ID: ${insightId}`);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ai_insights/elections/${insightId}`,
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
      insight.metadata?.question?.toLowerCase().includes(query) ||
      insight.insight.toLowerCase().includes(query) ||
      insight.category?.toLowerCase().includes(query) ||
      insight.topic?.toLowerCase().includes(query)
    );
  }, [savedInsights, searchQuery]);

  // Filter races based on search query
  const searchFilteredRaces = useMemo(() => {
    let filtered = races;
    
    // Filter by selected years
    if (selectedYears.length > 0) {
      filtered = filtered.filter(race => {
        const raceYear = getFieldValue(race.year) || getFieldValue(race.election_year) || '';
        return selectedYears.includes(raceYear.toString());
      });
    }
    
    // Filter by selected race types
    if (selectedRaceTypes.length > 0) {
      filtered = filtered.filter(race => {
        const raceType = getFieldValue(race.raceType) || getFieldValue(race.race_type) || '';
        return selectedRaceTypes.includes(raceType);
      });
    }
    
    // Filter by search query
    if (raceSearchQuery.trim()) {
      const query = raceSearchQuery.toLowerCase();
      filtered = filtered.filter(race => {
        const raceName = getSelectedRaceName(race.id).toLowerCase();
        const raceType = getFieldValue(race.race_type)?.toLowerCase() || '';
        const state = getFieldValue(race.state)?.toLowerCase() || '';
        return raceName.includes(query) || raceType.includes(query) || state.includes(query);
      });
    }
    
    return filtered;
  }, [races, selectedYears, selectedRaceTypes, raceSearchQuery]);

  // Debug: Log races data when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      console.log('🔍 ElectionAIInsights Debug:', {
        totalRaces: races.length,
        raceSearchQuery,
        searchFilteredCount: searchFilteredRaces.length,
        sampleRaces: races.slice(0, 5).map(r => ({
          id: r.id,
          name: getSelectedRaceName(r.id),
          type: getFieldValue(r.race_type),
          state: getFieldValue(r.state)
        }))
      });
    }
  }, [isDialogOpen, races.length, searchFilteredRaces.length, raceSearchQuery]);

  if (compact) {
    return (
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" 
        onClick={() => {
          loadSavedInsights(); // Refresh insights on click
          if (onClick) onClick();
        }}
      >
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
            <p className="text-xs text-muted-foreground">
              {loadingInsights ? 'Loading...' : 'Saved analyses (click to refresh)'}
            </p>
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
          <h3 className="font-semibold">AI Election Insights</h3>
          <Badge variant="secondary">
            {searchQuery ? `${filteredInsights.length} of ${savedInsights.length}` : `${savedInsights.length} Saved`}
          </Badge>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedRaces([]);
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
              <DialogContent className="max-w-none max-h-[80vh]" style={{ maxWidth: '1200px', width: '90vw' }}>
                <DialogHeader className="space-y-0 pb-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <DialogTitle>Election AI Insight Generator</DialogTitle>
                  </div>
                  <DialogDescription>
                    Select year, races and an insight type, then ask the AI assistant for election analysis and predictions.
                  </DialogDescription>
                </DialogHeader>
                
                {/* Three dropdowns side by side */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Year</label>
                    <Popover open={isYearPopoverOpen} onOpenChange={setIsYearPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-auto min-h-9"
                        >
                          {selectedYears.length === 0 ? (
                            <span className="text-muted-foreground">Select years</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {selectedYears.map((year) => (
                                <Badge
                                  key={year}
                                  variant="secondary"
                                  className="gap-1"
                                >
                                  {year}
                                  <X
                                    className="w-3 h-3 cursor-pointer hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleYearSelection(year);
                                    }}
                                  />
                                </Badge>
                              ))}
                            </div>
                          )}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[250px] p-0" align="start">
                        <ScrollArea className="max-h-[300px]">
                          <div className="p-2">
                            {availableYears.map((yearObj) => (
                              <div
                                key={yearObj.value}
                                className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-accent rounded-sm"
                                onClick={() => toggleYearSelection(yearObj.value)}
                              >
                                <Checkbox
                                  checked={selectedYears.includes(yearObj.value)}
                                  onCheckedChange={() => toggleYearSelection(yearObj.value)}
                                />
                                <span className="flex-1">{yearObj.label}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        {selectedYears.length > 0 && (
                          <div className="p-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearAllYears}
                              className="w-full"
                            >
                              Clear all ({selectedYears.length})
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Race Type</label>
                    <Popover open={isRaceTypePopoverOpen} onOpenChange={setIsRaceTypePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-auto min-h-9"
                        >
                          {selectedRaceTypes.length === 0 ? (
                            <span className="text-muted-foreground">Select types</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {selectedRaceTypes.map((type) => {
                                const raceTypeObj = availableRaceTypes.find(t => t.value === type);
                                return (
                                  <Badge
                                    key={type}
                                    variant="secondary"
                                    className="gap-1"
                                  >
                                    {raceTypeObj?.label.split(' ')[1] || type}
                                    <X
                                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleRaceTypeSelection(type);
                                      }}
                                    />
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[250px] p-0" align="start">
                        <ScrollArea className="max-h-[300px]">
                          <div className="p-2">
                            {availableRaceTypes.map((typeObj) => (
                              <div
                                key={typeObj.value}
                                className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-accent rounded-sm"
                                onClick={() => toggleRaceTypeSelection(typeObj.value)}
                              >
                                <Checkbox
                                  checked={selectedRaceTypes.includes(typeObj.value)}
                                  onCheckedChange={() => toggleRaceTypeSelection(typeObj.value)}
                                />
                                <span className="flex-1">{typeObj.label}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        {selectedRaceTypes.length > 0 && (
                          <div className="p-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearAllRaceTypes}
                              className="w-full"
                            >
                              Clear all ({selectedRaceTypes.length})
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2 relative">
                    <label className="text-sm font-medium">Races</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                      <Input
                        placeholder="Search races..."
                        value={raceSearchQuery}
                        onChange={(e) => setRaceSearchQuery(e.target.value)}
                        onFocus={() => setIsRacePopoverOpen(true)}
                        className="pl-9 pr-20"
                      />
                      {selectedRaces.length > 0 && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Badge variant="secondary" className="text-xs">
                            {selectedRaces.length} selected
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {/* Selected Races Badges */}
                    {selectedRaces.length > 0 && (
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-2 border rounded-md bg-muted/20">
                        {selectedRaces.map((raceId) => (
                          <Badge
                            key={raceId}
                            variant="secondary"
                            className="gap-1 max-w-full"
                          >
                            <span className="truncate">{getSelectedRaceName(raceId)}</span>
                            <X
                              className="w-3 h-3 cursor-pointer hover:text-destructive"
                              onClick={() => toggleRaceSelection(raceId)}
                            />
                          </Badge>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllRaces}
                          className="h-5 text-xs px-2"
                        >
                          Clear all
                        </Button>
                      </div>
                    )}
                    
                    {/* Race Search Results */}
                    {isRacePopoverOpen && (
                      <div className="absolute top-full left-0 z-[100] mt-1 border rounded-lg bg-popover shadow-lg" style={{ minWidth: '400px', width: 'max-content', maxWidth: '600px' }}>
                        <ScrollArea className="max-h-[300px]">
                          <div className="p-2">
                            {searchFilteredRaces.length === 0 ? (
                              <div className="text-center py-4 text-sm text-muted-foreground">
                                No races found
                              </div>
                            ) : (
                              searchFilteredRaces.map((race) => (
                                <div
                                  key={race.id}
                                  className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-accent rounded-sm"
                                  onClick={() => {
                                    toggleRaceSelection(race.id);
                                  }}
                                >
                                  <Checkbox
                                    checked={selectedRaces.includes(race.id)}
                                    onCheckedChange={() => toggleRaceSelection(race.id)}
                                  />
                                  <Vote className="w-4 h-4 text-blue-600 shrink-0" />
                                  <span className="flex-1 text-sm">{getSelectedRaceName(race.id)}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                        <div className="p-2 border-t flex justify-between items-center bg-muted/50">
                          <span className="text-xs text-muted-foreground">
                            {searchFilteredRaces.length} race{searchFilteredRaces.length !== 1 ? 's' : ''}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsRacePopoverOpen(false)}
                            className="h-7 text-xs"
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    )}
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
                      <h3 className="font-semibold text-lg">Election AI Assistant</h3>
                      {loadingProvider ? (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Loading AI provider...</span>
                        </div>
                      ) : !aiProvider ? (
                        <p className="text-muted-foreground max-w-md mx-auto">
                          No AI provider configured for elections dashboard. 
                          Please configure one in Settings → AI Connections.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-muted-foreground max-w-md mx-auto">
                            Select races and insight type above, then ask me to analyze voting patterns, 
                            predict outcomes, assess competitive races, or provide electoral insights.
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
                        <Button
                          onClick={handleSaveInsight}
                          disabled={savingInsight || insightSaved}
                          size="sm"
                        >
                          {savingInsight ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : insightSaved ? (
                            '✓ Saved'
                          ) : (
                            'Save Insight'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                {!aiResponse && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask about voting trends, race competitiveness, turnout analysis..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !sendingMessage && handleSendMessage()}
                      className="flex-1"
                      disabled={sendingMessage || !aiProvider}
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!chatMessage.trim() || sendingMessage || !aiProvider}
                      size="sm"
                      className="gap-2"
                    >
                      {sendingMessage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search insights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Insights List */}
        {loadingInsights ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredInsights.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="mb-2">No insights found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Try a different search term' : 'Click "Add AI Insights" to create your first insight'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInsights.map((insight) => {
              const isExpanded = expandedInsights.has(insight.id);
              const question = insight.metadata?.question || insight.topic || 'No question';
              const insightType = insight.metadata?.insightType || insight.category || 'general';
              const provider = insight.metadata?.provider || 'Unknown';
              const model = insight.metadata?.model || '';
              
              return (
                <div
                  key={insight.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded">
                      <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{question}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {insightType}
                            </Badge>
                            {provider && (
                              <span>{provider}</span>
                            )}
                            {model && (
                              <>
                                <span>•</span>
                                <span>{model}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{new Date(insight.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleInsightExpansion(insight.id)}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronDown 
                              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteInsight(insight.id)}
                            className="h-8 w-8 p-0 hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                            {insight.insight}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}