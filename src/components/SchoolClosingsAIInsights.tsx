import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { 
  Brain, Loader2, ChevronDown, ChevronRight, Search, Trash2, 
  TrendingUp, AlertTriangle, School, MapPin, Target, X
} from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { SchoolClosingsAIInsightsDialog } from "./SchoolClosingsAIInsightsDialog";

interface SchoolClosing {
  id?: number;
  provider_id: string;
  region_id: string;
  state: string | null;
  city: string | null;
  county_name: string | null;
  organization_name: string | null;
  type: string;
  status_day: string | null;
  status_description: string | null;
  notes: string | null;
  event_name: string | null;
  event_date: string | null;
  delay_duration: number | null;
  school_openings: boolean | null;
}

interface SavedInsight {
  id: string;
  question: string;
  response: string;
  model: string;
  closing_ids: number[];
  created_at: string;
}

interface SchoolClosingsAIInsightsProps {
  closings: SchoolClosing[];
  compact?: boolean;
  listView?: boolean;
  onClick?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SchoolClosingsAIInsights({ 
  closings, 
  compact = false, 
  listView = false,
  onClick,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: SchoolClosingsAIInsightsProps) {
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const isDialogOpen = controlledOpen !== undefined ? controlledOpen : internalDialogOpen;
  const setIsDialogOpen = controlledOnOpenChange || setInternalDialogOpen;

  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  // Load saved insights
  const loadSavedInsights = async () => {
    try {
      setLoadingInsights(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ai_insights/school-closings`,
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
      
      // Transform database format to component format (matching Finance/News implementation)
      const transformedInsights = (data.insights || []).map((saved: any) => {
        const metadata = saved.metadata ? (typeof saved.metadata === 'string' ? JSON.parse(saved.metadata) : saved.metadata) : {};
        return {
          id: saved.id,
          question: metadata.question || saved.topic,
          response: metadata.response || saved.insight,
          model: metadata.model || 'Unknown',
          closing_ids: metadata.selectedClosings || [],
          created_at: saved.created_at
        };
      });
      
      setSavedInsights(transformedInsights);
      console.log(`[SchoolClosingsAIInsights] Loaded ${transformedInsights.length} saved school closing AI insights`);
    } catch (error) {
      console.error('[SchoolClosingsAIInsights] Error loading saved insights:', error);
      toast.error('Failed to load saved insights');
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    loadSavedInsights();
  }, []);

  const handleDeleteInsight = async (insightId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ai_insights/school-closings/${insightId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete insight');
      }

      setSavedInsights(prev => prev.filter(i => i.id !== insightId));
      toast.success('Insight deleted');
    } catch (error) {
      console.error('[SchoolClosingsAIInsights] Error deleting insight:', error);
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

  // Compact mode - just the card (enhanced visual design)
  if (compact) {
    return (
      <>
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

        {/* Dialog controlled externally */}
        <SchoolClosingsAIInsightsDialog
          closings={closings}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onInsightSaved={loadSavedInsights}
          onInsightDeleted={loadSavedInsights}
        />
      </>
    );
  }

  // List view - expanded view with saved insights (enhanced visual design)
  if (listView) {
    return (
      <div className="space-y-4 border rounded-lg p-6 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/10 dark:to-blue-950/10">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3>AI School Closing Insights</h3>
          <Badge variant="secondary">
            {searchQuery ? `${filteredInsights.length} of ${savedInsights.length}` : `${savedInsights.length} Saved`}
          </Badge>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsDialogOpen(true)}
          >
            <Brain className="w-4 h-4 mr-2" />
            Add AI Insights
          </Button>
          
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

        {/* Saved Insights */}
        {loadingInsights ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600 mr-2" />
            <span className="text-muted-foreground">Loading insights...</span>
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
            {filteredInsights.map((insight, index) => (
              <Collapsible
                key={insight.id || `insight-${index}`}
                open={expandedInsights.has(insight.id)}
                onOpenChange={() => toggleInsightExpansion(insight.id)}
                className="min-w-[350px] max-w-[350px] flex-shrink-0 snap-start"
              >
                <Card className="overflow-hidden h-full border-l-4 border-purple-400 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="space-y-3">
                      {/* Header Row with Title and Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity text-left">
                          <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 shrink-0">
                            {expandedInsights.has(insight.id) ? (
                              <ChevronDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
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
                        const response = insight.response || '';
                        const percentages = response.match(/(\d+)%/g) || [];
                        const numbers = response.match(/(\d+)\s*(schools?|districts?|closures?|delays?)/gi) || [];
                        
                        // Detect sentiment/urgency keywords
                        const hasAlert = /emergency|severe|critical|alert|urgent|warning/i.test(response);
                        const hasTrending = /increase|rising|surge|growing|trending|spike/i.test(response);
                        const hasNegative = /decline|decrease|improve|clearing|resolution/i.test(response);
                        
                        // Extract key phrases (first sentence)
                        const firstSentence = response.split(/[.!?]\s/)[0];
                        const summary = firstSentence.length > 100 ? firstSentence.substring(0, 100) + '...' : firstSentence;
                        
                        return (
                          <div className="space-y-2.5">
                            {/* Status Banner - Prominent visual indicator */}
                            {(hasAlert || hasTrending || hasNegative) && (
                              <div className={`px-3 py-2 rounded-lg border-l-4 ${
                                hasAlert 
                                  ? 'bg-red-50 dark:bg-red-950/30 border-red-500' 
                                  : hasTrending 
                                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500' 
                                  : 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-500'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {hasAlert && <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />}
                                  {hasTrending && !hasAlert && <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                                  {hasNegative && !hasAlert && !hasTrending && <Target className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />}
                                  <span className={`text-xs ${
                                    hasAlert 
                                      ? 'text-red-700 dark:text-red-300' 
                                      : hasTrending 
                                      ? 'text-blue-700 dark:text-blue-300' 
                                      : 'text-yellow-700 dark:text-yellow-300'
                                  }`}>
                                    {hasAlert ? 'Critical Alert' : hasTrending ? 'Trending Closures' : 'Status Update'}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Key Metrics - Compact 2x2 Grid */}
                            {(percentages.length > 0 || numbers.length > 0) && (
                              <div className="grid grid-cols-2 gap-2">
                                {percentages.slice(0, 2).map((pct, idx) => (
                                  <div key={`pct-${idx}`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-950/40 dark:to-purple-950/20 border border-purple-200 dark:border-purple-800">
                                    <Target className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                    <span className="text-xs text-purple-700 dark:text-purple-300">{pct}</span>
                                  </div>
                                ))}
                                {numbers.slice(0, 2).map((num, idx) => (
                                  <div key={`num-${idx}`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/40 dark:to-blue-950/20 border border-blue-200 dark:border-blue-800">
                                    <School className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                    <span className="text-xs text-blue-700 dark:text-blue-300 truncate">{num}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Summary Text - One-liner */}
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {summary}
                            </p>
                            
                            {/* Metadata Footer */}
                            <div className="flex items-center gap-2 pt-1">
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted/50">
                                <School className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{insight.closing_ids?.length || 0}</span>
                              </div>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {new Date(insight.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </CardHeader>

                  {/* Expanded Content */}
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">
                            {insight.response}
                          </div>
                        </div>
                        
                        {/* Metadata in expanded view */}
                        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <School className="w-3.5 h-3.5" />
                            <span>{insight.closing_ids?.length || 0} closings analyzed</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{insight.model}</span>
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

        <SchoolClosingsAIInsightsDialog
          closings={closings}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onInsightSaved={loadSavedInsights}
          onInsightDeleted={loadSavedInsights}
        />
      </div>
    );
  }

  // Default - just the dialog (shouldn't be used, but here for completeness)
  return (
    <SchoolClosingsAIInsightsDialog
      closings={closings}
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
    />
  );
}
