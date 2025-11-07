import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { useNewsProviders } from "../utils/useNewsProviders";
import { Article } from "../utils/useNewsFeed";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { NewsDebugPanel } from "./NewsDebugPanel";
import { NewsAIInsights } from "./NewsAIInsights";
import { 
  Newspaper, Database, Clock, RefreshCw, Loader2, ExternalLink, Archive, Rss
} from "lucide-react";
import { Switch } from "./ui/switch";

interface NewsDashboardProps {
  onNavigateToFeeds?: () => void;
}

export function NewsDashboard({ 
  onNavigateToFeeds
}: NewsDashboardProps) {
  // Filter states for API
  const [q, setQ] = useState<string>('');
  const [country, setCountry] = useState<string>('us');
  const [language, setLanguage] = useState<string>('en');
  const [perProviderLimit, setPerProviderLimit] = useState<number>(10);
  const [totalLimit, setTotalLimit] = useState<number>(100);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [useStoredArticles, setUseStoredArticles] = useState<boolean>(true);

  // Prepare API params (convert "all" to undefined for API)
  const apiCountry = country === 'all' ? undefined : country;
  const apiLanguage = language === 'all' ? undefined : language;

  // Manual fetch state
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Insights state
  const [showAIInsights, setShowAIInsights] = useState(false);

  // Load providers (enabled = true) - keep this for display
  const { providers, loading: loadingProviders } = useNewsProviders();

  // Fetch available providers from database (for filter dropdown)
  const [availableProviders, setAvailableProviders] = useState<Array<{
    id: string;
    name: string;
    type: string;
    is_active: boolean;
  }>>([]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/rest/v1/data_providers_public?select=id,name,type,is_active&category=eq.news`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              apikey: publicAnonKey,
            },
          }
        );

        if (response.ok) {
          const providerList = await response.json();
          setAvailableProviders(providerList);
        }
      } catch (err) {
        console.error('Failed to fetch providers for filter:', err);
      }
    };

    fetchProviders();
  }, []);

  // Manual fetch function using RPC (same pattern as Finance Dashboard)
  const handleFetchArticles = async () => {
    console.log('🔄 [NEWS] Starting fetch articles...');
    setLoadingArticles(true);
    setError(null);
    
    try {
      // Step 1: Get active news providers from data_providers_public table
      console.log('📡 [NEWS] Fetching providers from data_providers_public...');
      
      const listResponse = await fetch(
        `https://${projectId}.supabase.co/rest/v1/data_providers_public?select=id,name,type,is_active&category=eq.news`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            apikey: publicAnonKey,
          },
        }
      );

      if (!listResponse.ok) {
        throw new Error(`Failed to fetch news providers: ${listResponse.status}`);
      }

      const newsProviders = await listResponse.json();
      console.log('✅ [NEWS] All news providers:', newsProviders);
      
      const activeProviders = newsProviders.filter((p: any) => p.is_active);
      console.log('✅ [NEWS] Active providers:', activeProviders);

      if (activeProviders.length === 0) {
        console.warn('⚠️ [NEWS] No active providers found');
        toast.warning('No active news providers found. Please configure providers in Data Feeds.');
        setArticles([]);
        setLoadingArticles(false);
        return;
      }

      // Step 2: Get provider details with credentials using RPC
      console.log('📡 [NEWS] Fetching provider credentials via RPC...');
      const providerDetailsPromises = activeProviders.map(async (provider: any) => {
        const rpcResponse = await fetch(
          `https://${projectId}.supabase.co/rest/v1/rpc/get_provider_details`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              apikey: publicAnonKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ p_id: provider.id }),
          }
        );

        if (!rpcResponse.ok) {
          console.error(`❌ [NEWS] RPC failed for ${provider.name}: ${rpcResponse.status}`);
          return null;
        }

        const details = await rpcResponse.json();
        return details && details.length > 0 ? details[0] : null;
      });

      const providerDetails = (await Promise.all(providerDetailsPromises)).filter(Boolean);
      console.log('✅ [NEWS] Provider details fetched:', providerDetails.length);

      if (providerDetails.length === 0) {
        console.warn('⚠️ [NEWS] No providers with valid credentials found');
        toast.warning('No configured news providers found. Please add API keys in Data Feeds.');
        setArticles([]);
        setLoadingArticles(false);
        return;
      }

      // Step 3: Fetch articles from backend endpoint with provider credentials
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/news-articles`;

      console.log('📡 [NEWS] Fetching articles from:', url);
      console.log('📡 [NEWS] Sending providers:', providerDetails.map(p => ({ name: p.name, type: p.type })));
      console.log('📡 [NEWS] Params:', { perProviderLimit, totalLimit, q, country: apiCountry, language: apiLanguage });

      const articlesResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          providers: providerDetails,
          q,
          country: apiCountry,
          language: apiLanguage,
          perProviderLimit,
          totalLimit
        })
      });

      console.log('📡 [NEWS] Articles response status:', articlesResponse.status);

      if (!articlesResponse.ok) {
        const errorText = await articlesResponse.text();
        console.error('❌ [NEWS] Articles fetch failed:', errorText);
        throw new Error(`Failed to fetch articles (${articlesResponse.status}): ${errorText}`);
      }

      const data = await articlesResponse.json();
      console.log('✅ [NEWS] Articles response data:', data);
      console.log('✅ [NEWS] Articles count:', data.articles?.length || 0);
      console.log('✅ [NEWS] First article sample:', data.articles?.[0]);
      
      setArticles(data.articles ?? []);
      toast.success(`Fetched ${data.articles?.length || 0} articles from ${activeProviders.length} provider(s)`);
      
    } catch (err) {
      console.error('❌ [NEWS] Error fetching news:', err);
      setError(String(err));
      toast.error(err instanceof Error ? err.message : 'Failed to fetch articles');
    } finally {
      setLoadingArticles(false);
      console.log('🏁 [NEWS] Fetch complete');
    }
  };

  // Fetch stored articles from database
  const handleFetchStoredArticles = async () => {
    console.log('🔄 [NEWS] Fetching stored articles from database...');
    setLoadingArticles(true);
    setError(null);

    try {
      const url = new URL(`https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/news-articles/stored`);
      
      // Add filters as query parameters
      if (selectedProvider !== 'all') {
        url.searchParams.set('provider', selectedProvider);
      }
      if (apiLanguage) {
        url.searchParams.set('language', apiLanguage);
      }
      if (apiCountry) {
        url.searchParams.set('country', apiCountry);
      }
      url.searchParams.set('limit', String(totalLimit));

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'apikey': publicAnonKey,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [NEWS] Response error:', errorText);
        throw new Error(`Failed to fetch stored articles: ${response.status}. ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ [NEWS] Fetched stored articles:', data.articles?.length || 0);
      
      setArticles(data.articles ?? []);
      toast.success(`Loaded ${data.articles?.length || 0} stored articles from database`);

    } catch (err) {
      console.error('❌ [NEWS] Error fetching stored articles:', err);
      setError(String(err));
      toast.error(err instanceof Error ? err.message : 'Failed to fetch stored articles');
    } finally {
      setLoadingArticles(false);
    }
  };

  // Auto-fetch articles when switching between live/stored
  useEffect(() => {
    if (useStoredArticles) {
      handleFetchStoredArticles();
    }
  }, [useStoredArticles]);

  // Counts by provider for "Data Providers" widget
  const providerCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of articles) {
      map.set(a.provider, (map.get(a.provider) || 0) + 1);
    }
    return map;
  }, [articles]);

  // Filter articles by selected provider
  const filteredArticles = useMemo(() => {
    if (selectedProvider === 'all') {
      return articles;
    }
    return articles.filter(a => a.provider === selectedProvider);
  }, [articles, selectedProvider]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 mb-1 text-[24px]">
            <Newspaper className="w-6 h-6 text-blue-600" />
            News Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor and manage news articles across multiple providers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background">
            <Database className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Live</span>
            <Switch
              checked={useStoredArticles}
              onCheckedChange={setUseStoredArticles}
            />
            <Archive className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Stored</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={useStoredArticles ? handleFetchStoredArticles : handleFetchArticles}
            disabled={loadingArticles}
            className="gap-2"
          >
            {loadingArticles ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                {useStoredArticles ? 'Refresh Stored' : 'Fetch Live'}
              </>
            )}
          </Button>
          <NewsDebugPanel />
        </div>
      </div>

      {/* Summary Statistics (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Newspaper className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Articles</p>
                <p className="text-2xl font-semibold">{loadingArticles ? '...' : articles.length}</p>
                <p className="text-xs text-muted-foreground">
                  {loadingArticles ? 'Loading...' : 'From all sources'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <NewsAIInsights
          articles={filteredArticles}
          compact={true}
          onClick={() => setShowAIInsights(!showAIInsights)}
        />

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Database className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Mode</p>
                <p className="text-2xl font-semibold">{useStoredArticles ? 'Stored' : 'Live'}</p>
                <p className="text-xs text-muted-foreground">
                  {useStoredArticles ? 'From database' : 'Real-time fetch'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={onNavigateToFeeds ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
          onClick={onNavigateToFeeds}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Rss className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Providers</p>
                <p className="text-2xl font-semibold">
                  {availableProviders.filter(p => p.is_active).length}/{availableProviders.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {availableProviders.filter(p => p.is_active).length} active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Section - Expanded View */}
      {showAIInsights && (
        <NewsAIInsights 
          articles={filteredArticles}
          listView={true}
        />
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            <div className="lg:col-span-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search titles, content..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="provider">Provider</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {availableProviders.map(provider => {
                    const count = providerCounts.get(provider.type) || 0;
                    return (
                      <SelectItem key={provider.id} value={provider.type}>
                        {provider.name} ({count})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="gb">United Kingdom</SelectItem>
                  <SelectItem value="ca">Canada</SelectItem>
                  <SelectItem value="au">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="perProvider">Per Provider</Label>
              <Input
                id="perProvider"
                type="number"
                min={1}
                max={100}
                value={perProviderLimit}
                onChange={(e) => setPerProviderLimit(Number(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="totalLimit">Total Limit</Label>
              <Input
                id="totalLimit"
                type="number"
                min={1}
                max={500}
                value={totalLimit}
                onChange={(e) => setTotalLimit(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Articles List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Newspaper className="w-5 h-5" />
            Articles ({loadingArticles ? '...' : filteredArticles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
              <p className="text-sm">Error loading articles: {error}</p>
            </div>
          )}

          {loadingArticles ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-12">
              <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="mb-2">No articles found</h3>
              <p className="text-sm text-muted-foreground">
                {selectedProvider !== 'all' 
                  ? `No articles from ${selectedProvider.toUpperCase()}. Try selecting a different provider.`
                  : 'Try adjusting your filters or check back later for new content.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredArticles.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="grid grid-cols-[160px_1fr] gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow no-underline text-foreground"
                >
                  <div className="w-[160px] h-[100px] bg-muted rounded overflow-hidden">
                    {article.imageUrl ? (
                      <img
                        src={article.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Newspaper className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="flex-1">{article.title}</h3>
                      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Badge variant="outline" className="text-xs">
                        {article.provider.toUpperCase()}
                      </Badge>
                      {article.sourceName && (
                        <span>{article.sourceName}</span>
                      )}
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{new Date(article.publishedAt).toLocaleString()}</span>
                    </div>
                    {article.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {article.description}
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
