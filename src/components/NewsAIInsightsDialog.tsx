import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Article } from "../utils/useNewsFeed";
import { 
  Brain, Send, Loader2, X, Newspaper, ChevronDown, ChevronRight,
  Save, Trash2, Search, ExternalLink
} from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { Input } from "./ui/input";

interface SavedInsight {
  id: string;
  question: string;
  response: string;
  model: string;
  article_ids: string[];
  created_at: string;
}

interface NewsAIInsightsDialogProps {
  articles: Article[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsightSaved?: () => void;
  onInsightDeleted?: () => void;
}

export function NewsAIInsightsDialog({ articles, open, onOpenChange, onInsightSaved, onInsightDeleted }: NewsAIInsightsDialogProps) {
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [aiProvider, setAiProvider] = useState<any>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [currentModel, setCurrentModel] = useState<string>("");
  const [savingInsight, setSavingInsight] = useState(false);
  const [insightSaved, setInsightSaved] = useState(false);
  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  // Load AI provider assigned to news dashboard
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
        
        // Find provider assigned to news dashboard
        const newsProvider = data.providers?.find((p: any) =>
          p.dashboardAssignments?.some((d: any) => 
            d.dashboard === 'news' && d.textProvider
          )
        );

        if (newsProvider) {
          setAiProvider(newsProvider);
          console.log('News AI Provider loaded:', newsProvider.name);
        } else {
          console.warn('No AI provider assigned to news dashboard');
        }
      } catch (error) {
        console.error('Error loading AI provider:', error);
      } finally {
        setLoadingProvider(false);
      }
    };

    if (open) {
      loadAIProvider();
    }
  }, [open]);

  // Load saved insights
  useEffect(() => {
    const loadSavedInsights = async () => {
      try {
        setLoadingInsights(true);
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/news_dashboard/news-ai-insights`,
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
        console.log(`Loaded ${data.insights?.length || 0} saved news AI insights`);
      } catch (error) {
        console.error('Error loading saved insights:', error);
        toast.error('Failed to load saved insights');
      } finally {
        setLoadingInsights(false);
      }
    };

    if (open) {
      loadSavedInsights();
    }
  }, [open]);

  const toggleArticleSelection = (articleId: string) => {
    setSelectedArticles(prev => 
      prev.includes(articleId)
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  const clearAllArticles = () => {
    setSelectedArticles([]);
  };

  const selectAllArticles = () => {
    setSelectedArticles(articles.map(a => a.id));
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    
    if (!aiProvider) {
      toast.error('No AI provider configured for news dashboard. Please configure one in AI Connections.');
      return;
    }

    try {
      setSendingMessage(true);
      setAiResponse(null);

      // Build context from selected articles
      let context = 'You are a helpful news AI assistant analyzing news articles. Please provide 3-10 insightful bullet points with short sentences containing specific themes, trends, and patterns. Focus on actionable insights with concrete observations.\n\n';
      
      if (selectedArticles.length > 0) {
        context += `Selected Articles (${selectedArticles.length}):\n`;
        selectedArticles.forEach(articleId => {
          const article = articles.find(a => a.id === articleId);
          if (article) {
            context += `- "${article.title}" (${article.provider.toUpperCase()}, ${article.sourceName || 'Unknown source'})\n`;
            if (article.description) {
              context += `  ${article.description.substring(0, 150)}...\n`;
            }
          }
        });
        context += '\n';
      } else {
        context += `Analyzing all ${articles.length} articles.\n\n`;
      }

      context += `User Question: ${chatMessage}`;

      console.log('Sending news AI request:', {
        providerId: aiProvider.id,
        providerName: aiProvider.name,
        dashboard: 'news',
        messageLength: chatMessage.length,
        contextLength: context.length,
        selectedArticlesCount: selectedArticles.length
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
            message: context,
            dashboard: 'news',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();
      console.log('News AI response received:', {
        providerId: data.providerId,
        modelUsed: data.model,
        responseLength: data.response?.length
      });

      setAiResponse(data.response);
      setCurrentQuestion(chatMessage);
      setCurrentModel(data.model || aiProvider.model || 'Unknown');
      setInsightSaved(false);
      toast.success('AI insight generated successfully');
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get AI response');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSaveInsight = async () => {
    if (!aiResponse || !currentQuestion) return;

    try {
      setSavingInsight(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/news_dashboard/news-ai-insights`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: currentQuestion,
            response: aiResponse,
            model: currentModel,
            article_ids: selectedArticles.length > 0 ? selectedArticles : articles.map(a => a.id),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save insight');
      }

      const data = await response.json();
      setSavedInsights(prev => [data.insight, ...prev]);
      setInsightSaved(true);
      toast.success('Insight saved successfully');
      
      // Notify parent to refresh
      if (onInsightSaved) {
        onInsightSaved();
      }
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
        `https://${projectId}.supabase.co/functions/v1/news_dashboard/news-ai-insights/${insightId}`,
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
      
      // Notify parent to refresh
      if (onInsightDeleted) {
        onInsightDeleted();
      }
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

  const filteredSavedInsights = savedInsights.filter(insight =>
    searchQuery === "" ||
    insight.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    insight.response.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader className="space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <DialogTitle>News AI Insight Generator</DialogTitle>
          </div>
          <DialogDescription>
            Select articles and ask the AI assistant for news analysis, trends, and insights.
          </DialogDescription>
        </DialogHeader>
        
        {/* Article selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm">Articles ({selectedArticles.length} selected)</label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllArticles}
                disabled={selectedArticles.length === articles.length}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllArticles}
                disabled={selectedArticles.length === 0}
              >
                Clear
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[200px] border rounded-md">
            <div className="p-2 space-y-1">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-start gap-2 p-2 cursor-pointer hover:bg-accent rounded-sm"
                  onClick={() => toggleArticleSelection(article.id)}
                >
                  <Checkbox
                    checked={selectedArticles.includes(article.id)}
                    onCheckedChange={() => toggleArticleSelection(article.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Newspaper className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm line-clamp-1">{article.title}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {article.provider.toUpperCase()}
                      </Badge>
                      {article.sourceName && (
                        <span className="text-xs text-muted-foreground">{article.sourceName}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat interface */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm">Ask AI Assistant</label>
            <Textarea
              placeholder="E.g., What are the main themes? Any emerging trends?"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              rows={3}
              disabled={loadingProvider || sendingMessage}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSendMessage}
              disabled={!chatMessage.trim() || loadingProvider || sendingMessage || !aiProvider}
              className="flex-1"
            >
              {sendingMessage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Generate Insight
                </>
              )}
            </Button>
            {!aiProvider && !loadingProvider && (
              <Button variant="outline" disabled>
                No AI Provider
              </Button>
            )}
          </div>

          {/* AI Response */}
          {aiResponse && (
            <div className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-950/20 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm mb-1">
                    <strong>Question:</strong> {currentQuestion}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Model: {currentModel} • Articles: {selectedArticles.length || articles.length}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleSaveInsight}
                  disabled={savingInsight || insightSaved}
                >
                  {savingInsight ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : insightSaved ? (
                    <>Saved</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </>
                  )}
                </Button>
              </div>
              <div className="text-sm whitespace-pre-wrap">{aiResponse}</div>
            </div>
          )}
        </div>

        {/* Saved Insights */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm">Saved Insights ({savedInsights.length})</h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search insights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-[200px]"
              />
            </div>
          </div>

          {loadingInsights ? (
            <div className="text-center py-4">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filteredSavedInsights.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {searchQuery ? 'No matching insights found' : 'No saved insights yet'}
            </p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-4">
                {filteredSavedInsights.map((insight, index) => (
                  <Collapsible
                    key={insight.id || `insight-${index}`}
                    open={expandedInsights.has(insight.id)}
                    onOpenChange={() => toggleInsightExpansion(insight.id)}
                  >
                    <div className="border rounded-lg p-3 bg-background">
                      <div className="flex items-start justify-between gap-2">
                        <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                          {expandedInsights.has(insight.id) ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm">{insight.question}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(insight.created_at).toLocaleDateString()} • {insight.model}
                            </p>
                          </div>
                        </CollapsibleTrigger>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInsight(insight.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <CollapsibleContent className="mt-2 pt-2 border-t">
                        <div className="text-sm whitespace-pre-wrap">{insight.response}</div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}