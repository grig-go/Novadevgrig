import { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { SecuritySearch } from "./SecuritySearch";
import { CryptoSearch } from "./CryptoSearch";
import { AlpacaDebugPanel } from "./AlpacaDebugPanel";
import { StockNameEdit } from "./StockNameEdit";
import { FinanceAIInsights } from "./FinanceAIInsights";
import { TrendingUp, TrendingDown, BarChart3, Database, Rss, Loader2, RefreshCw, Trash2, ChevronDown, Brain, Search, Filter, Coins, X } from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { FinanceSecurityWithSnapshot } from "../types/finance";

interface StockData {
  symbol: string;
  name: string;
  type: string;
  price?: number;
  change1d?: number;
  change1dPct?: number;
  change1yPct?: number;
  yearHigh?: number;
  yearLow?: number;
  chart1y?: Array<{ t: string; c: number }>;
  rating?: any;
  lastUpdate?: string;
  customName?: string | null; // Custom display name set by user
}

interface CryptoData {
  id: string;
  cgId: string;
  symbol: string;
  name: string;
  customName?: string | null;
  image: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  priceChangePercentage7d?: number;
  priceChangePercentage30d?: number;
  marketCap: number;
  marketCapRank: number;
  totalVolume: number;
  high24h: number;
  low24h: number;
  ath?: number;
  athDate?: string;
  atl?: number;
  atlDate?: string;
  lastUpdated: string;
}

type CombinedAsset = {
  id: string;
  name: string;
  symbol: string;
  type: 'EQUITY' | 'ETF' | 'INDEX' | 'CRYPTO';
  price: number;
  change24h: number;
  changePct24h: number;
  image?: string;
  marketCap?: number;
  volume?: number;
  high24h?: number;
  low24h?: number;
  yearHigh?: number;
  yearLow?: number;
  customName?: string | null;
  cgId?: string;
  lastUpdate?: string;
};

interface AlpacaStocksDashboardProps {
  onNavigateToFeeds?: () => void;
}

export function AlpacaStocksDashboard({ onNavigateToFeeds }: AlpacaStocksDashboardProps) {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [cryptos, setCryptos] = useState<CryptoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showOverridesDialog, setShowOverridesDialog] = useState(false);
  const [savedInsightsCount, setSavedInsightsCount] = useState(0);
  const [loadingInsightsCount, setLoadingInsightsCount] = useState(true);

  // Load both stocks and cryptos on mount
  useEffect(() => {
    loadAllAssets();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(() => {
      refreshAllAssets();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Load saved insights count
  useEffect(() => {
    const loadSavedInsightsCount = async () => {
      try {
        setLoadingInsightsCount(true);
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/finance-ai-insights`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setSavedInsightsCount(data.insights?.length || 0);
        }
      } catch (error) {
        console.error('Error loading saved insights count:', error);
      } finally {
        setLoadingInsightsCount(false);
      }
    };

    loadSavedInsightsCount();
  }, []);

  const loadAllAssets = async () => {
    setIsLoading(true);
    try {
      // Load stocks, cryptos, and custom names in parallel
      const [stocksResponse, cryptosResponse, customNamesResponse] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/stocks`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/crypto`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/stocks/custom-names/all`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        ),
      ]);

      // Load stocks
      if (stocksResponse.ok) {
        const stocksData = await stocksResponse.json();
        const stocks = stocksData.stocks || [];

        // Load custom names
        if (customNamesResponse.ok) {
          const customNamesData = await customNamesResponse.json();
          setCustomNames(customNamesData.customNames || {});
          
          // Merge custom names into stock data
          const stocksWithCustomNames = stocks.map((stock: StockData) => ({
            ...stock,
            customName: customNamesData.customNames?.[stock.symbol] || null,
          }));
          setStocks(stocksWithCustomNames);
        } else {
          setStocks(stocks);
        }
      }

      // Load cryptos
      if (cryptosResponse.ok) {
        const cryptosData = await cryptosResponse.json();
        setCryptos(cryptosData.cryptos || []);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
      toast.error('Failed to load market data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAllAssets = async (forceClear = false) => {
    setIsRefreshing(true);
    try {
      console.log(`Refreshing all assets${forceClear ? ' (force clearing cache)' : ''}...`);
      
      // Refresh stocks and cryptos in parallel
      const [stocksResponse, cryptosResponse] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/stocks/refresh${forceClear ? '?forceClear=true' : ''}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/crypto/refresh`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        ),
      ]);

      if (!stocksResponse.ok && !cryptosResponse.ok) {
        throw new Error('Failed to refresh market data');
      }

      setLastRefresh(new Date().toISOString());

      // Reload all assets to get fresh data
      await loadAllAssets();
      
      toast.success(forceClear ? 'Cache cleared and prices updated' : 'Market data updated');
    } catch (error) {
      console.error('Error refreshing assets:', error);
      toast.error('Failed to refresh market data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const deleteCrypto = async (cgId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/crypto/${cgId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete cryptocurrency');
      }

      // Reload assets
      await loadAllAssets();
      toast.success('Cryptocurrency removed');
    } catch (error) {
      console.error('Error deleting cryptocurrency:', error);
      toast.error('Failed to delete cryptocurrency');
    }
  };

  const deleteStock = async (symbol: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/stocks/${symbol}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove stock');
      }

      toast.success(`Removed ${symbol} from watchlist`);
      await loadAllAssets();
    } catch (error) {
      console.error('Error removing stock:', error);
      toast.error(`Failed to remove ${symbol}`);
    }
  };

  const saveCustomName = async (identifier: string, customName: string | null, assetType?: 'CRYPTO' | 'EQUITY' | 'ETF' | 'INDEX') => {
    try {
      // Determine if this is crypto or stock based on the identifier pattern or asset type
      // Crypto IDs are typically lowercase with hyphens (e.g., "bitcoin", "ethereum")
      // Stock symbols are typically uppercase (e.g., "AAPL", "GOOGL")
      const isCrypto = assetType === 'CRYPTO' || identifier.toLowerCase() === identifier;
      
      const endpoint = isCrypto 
        ? `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/crypto/${identifier}/custom-name`
        : `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/stocks/${identifier}/custom-name`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customName }),
      });

      if (!response.ok) {
        throw new Error('Failed to save custom name');
      }

      // Update local state
      setCustomNames(prev => {
        const updated = { ...prev };
        if (customName === null) {
          delete updated[identifier];
        } else {
          updated[identifier] = customName;
        }
        return updated;
      });

      // Update appropriate array
      if (isCrypto) {
        setCryptos(prev => prev.map(crypto => 
          crypto.cgId === identifier 
            ? { ...crypto, customName }
            : crypto
        ));
      } else {
        setStocks(prev => prev.map(stock => 
          stock.symbol === identifier 
            ? { ...stock, customName }
            : stock
        ));
      }
    } catch (error) {
      console.error('Error saving custom name:', error);
      throw error; // Re-throw to let the component handle toast
    }
  };

  const clearOverride = async (identifier: string, assetType: 'CRYPTO' | 'EQUITY' | 'ETF' | 'INDEX') => {
    try {
      await saveCustomName(identifier, null, assetType);
      toast.success('Override cleared');
    } catch (error) {
      console.error('Error clearing override:', error);
      toast.error('Failed to clear override');
    }
  };

  const clearAllOverrides = async () => {
    try {
      // Get all overridden assets
      const overriddenAssets = combinedAssets.filter(asset => asset.customName);
      
      // Clear all overrides in parallel
      await Promise.all(
        overriddenAssets.map(asset => 
          saveCustomName(
            asset.type === 'CRYPTO' ? asset.cgId! : asset.symbol,
            null,
            asset.type
          )
        )
      );
      
      toast.success(`Cleared ${overriddenAssets.length} override${overriddenAssets.length === 1 ? '' : 's'}`);
      setShowOverridesDialog(false);
    } catch (error) {
      console.error('Error clearing all overrides:', error);
      toast.error('Failed to clear all overrides');
    }
  };

  // Combine stocks and cryptos into a unified list
  const combinedAssets = useMemo((): CombinedAsset[] => {
    const stockAssets: CombinedAsset[] = stocks.map(stock => ({
      id: stock.symbol,
      name: stock.customName || stock.name,
      symbol: stock.symbol,
      type: stock.type as 'EQUITY' | 'ETF' | 'INDEX',
      price: stock.price || 0,
      change24h: stock.change1d || 0,
      changePct24h: stock.change1dPct || 0,
      yearHigh: stock.yearHigh,
      yearLow: stock.yearLow,
      customName: stock.customName,
      lastUpdate: stock.lastUpdate,
    }));

    const cryptoAssets: CombinedAsset[] = cryptos.map(crypto => ({
      id: crypto.cgId,
      name: crypto.customName || crypto.name,
      symbol: crypto.symbol.toUpperCase(),
      type: 'CRYPTO' as const,
      price: crypto.currentPrice,
      change24h: crypto.priceChange24h,
      changePct24h: crypto.priceChangePercentage24h,
      image: crypto.image,
      marketCap: crypto.marketCap,
      volume: crypto.totalVolume,
      high24h: crypto.high24h,
      low24h: crypto.low24h,
      customName: crypto.customName,
      cgId: crypto.cgId,
      lastUpdate: crypto.lastUpdated,
    }));

    return [...stockAssets, ...cryptoAssets];
  }, [stocks, cryptos]);

  const summary = useMemo(() => {
    return {
      total: combinedAssets.length,
      stocks: stocks.length,
      cryptos: cryptos.length,
      gainers: combinedAssets.filter(a => a.changePct24h > 0).length,
      losers: combinedAssets.filter(a => a.changePct24h < 0).length,
      unchanged: combinedAssets.filter(a => a.changePct24h === 0).length,
    };
  }, [combinedAssets, stocks.length, cryptos.length]);

  // Filtered and searched assets
  const filteredAssets = useMemo(() => {
    let filtered = combinedAssets;

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter(a => a.type === filterType);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.symbol.toLowerCase().includes(query) ||
        a.name.toLowerCase().includes(query) ||
        (a.customName && a.customName.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [combinedAssets, filterType, searchQuery]);

  // Convert stocks and cryptos to FinanceSecurityWithSnapshot format for AI Insights
  const securitiesForAI = useMemo(() => {
    const stockSecurities = stocks.map((stock): FinanceSecurityWithSnapshot => ({
      security: {
        id: stock.symbol,
        uniqueKey: stock.symbol,
        symbol: stock.symbol,
        name: { value: stock.customName || stock.name },
        type: stock.type as 'EQUITY' | 'ETF' | 'INDEX' | 'CRYPTO',
        exchange: 'UNKNOWN',
      },
      snapshot: {
        price: { value: stock.price || 0 },
        changePct: { value: stock.change1dPct || 0 },
        change: { value: stock.change1d || 0 },
        high52w: { value: stock.yearHigh || 0 },
        low52w: { value: stock.yearLow || 0 },
      }
    }));

    const cryptoSecurities = cryptos.map((crypto): FinanceSecurityWithSnapshot => ({
      security: {
        id: crypto.cgId,
        uniqueKey: crypto.cgId,
        symbol: crypto.symbol.toUpperCase(),
        cgId: crypto.cgId,
        name: { value: crypto.customName || crypto.name },
        type: 'CRYPTO',
        exchange: 'COINGECKO',
      },
      snapshot: {
        price: { value: crypto.currentPrice },
        changePct: { value: crypto.priceChangePercentage24h },
        change: { value: crypto.priceChange24h },
        high52w: { value: crypto.ath || 0 },
        low52w: { value: crypto.atl || 0 },
      }
    }));

    return [...stockSecurities, ...cryptoSecurities];
  }, [stocks, cryptos]);

  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null || isNaN(price)) {
      return "N/A";
    }
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatChange = (change: number | undefined | null, isPercent = false) => {
    if (change === undefined || change === null || isNaN(change)) {
      return "N/A";
    }
    const formatted = isPercent
      ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`
      : `${change >= 0 ? '+' : ''}${change.toFixed(2)}`;
    return formatted;
  };

  const getChangeColor = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) {
      return 'text-muted-foreground';
    }
    if (value > 0) return 'text-green-600 dark:text-green-400';
    if (value < 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
              Finance Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time market data from Alpaca Markets & CoinGecko
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isRefreshing}
                    className="gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => refreshAllAssets(false)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Normal Refresh
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => refreshAllAssets(true)}>
                    <Database className="w-4 h-4 mr-2" />
                    Force Refresh (Clear Cache)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <SecuritySearch
                onStockAdded={loadAllAssets}
                buttonText="Add Stock"
              />
              <CryptoSearch
                onCryptoAdded={loadAllAssets}
                buttonText="Add Crypto"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {lastRefresh ? `Last updated ${new Date(lastRefresh).toLocaleTimeString()}` : 'Never refreshed'}
            </div>
          </div>
        </div>

        {/* Market Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card key="summary-stocks">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-2xl font-semibold">{summary.stocks}</p>
                  <p className="text-xs text-muted-foreground">Stocks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card key="summary-cryptos">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-orange-600" />
                <div>
                  <p className="text-2xl font-semibold">{summary.cryptos}</p>
                  <p className="text-xs text-muted-foreground">Cryptos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            key="summary-ai-insights"
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowAIInsights(!showAIInsights)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-2xl font-semibold text-purple-600">
                    {loadingInsightsCount ? "..." : savedInsightsCount}
                  </p>
                  <p className="text-xs text-muted-foreground">AI Insights</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            key="summary-overrides" 
            className="cursor-pointer hover:border-amber-600 transition-colors"
            onClick={() => setShowOverridesDialog(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="text-2xl font-semibold text-amber-600">{combinedAssets.filter(a => a.customName).length}</p>
                  <p className="text-xs text-muted-foreground">Overrides</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            key="summary-providers"
            className={onNavigateToFeeds ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
            onClick={onNavigateToFeeds}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Rss className="w-4 h-4 text-purple-600" />
                <div className="flex-1">
                  <p className="text-2xl font-semibold text-purple-600">2</p>
                  <p className="text-xs text-muted-foreground">Data Providers</p>
                  <div className="flex gap-1 mt-1">
                    <Badge 
                      variant="secondary" 
                      className="text-xs px-1.5 py-0 cursor-pointer hover:bg-secondary/80 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDebugPanel(!showDebugPanel);
                      }}
                    >
                      alpaca
                    </Badge>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      coingecko
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Debug Panel - Toggle with alpaca badge */}
      {showDebugPanel && <AlpacaDebugPanel />}

      {/* AI Insights Section */}
      {showAIInsights && (
        <FinanceAIInsights 
          securities={securitiesForAI}
          listView={true}
        />
      )}

      {/* Overrides Management Dialog */}
      <Dialog open={showOverridesDialog} onOpenChange={setShowOverridesDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-600" />
              Name Overrides
            </DialogTitle>
            <DialogDescription>
              Manage custom names you've set for stocks and cryptocurrencies
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {combinedAssets.filter(asset => asset.customName).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No name overrides yet
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {combinedAssets.filter(asset => asset.customName).length} override{combinedAssets.filter(asset => asset.customName).length === 1 ? '' : 's'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllOverrides}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                </div>

                <div className="space-y-2">
                  {combinedAssets
                    .filter(asset => asset.customName)
                    .map(asset => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          {asset.image && (
                            <img 
                              src={asset.image} 
                              alt={asset.name}
                              className="w-8 h-8 rounded-full flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{asset.customName}</p>
                              <Badge className={`text-xs ${
                                asset.type === 'EQUITY' 
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200' 
                                  : asset.type === 'ETF'
                                  ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200'
                                  : asset.type === 'INDEX'
                                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200'
                                  : 'bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200'
                              }`}>
                                {asset.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Original: {asset.name} ({asset.symbol})
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearOverride(
                            asset.type === 'CRYPTO' ? asset.cgId! : asset.symbol,
                            asset.type
                          )}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Clear
                        </Button>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Search and Filter */}
      {combinedAssets.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by symbol, name, or custom name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                {filterType === "all" ? "All Types" : filterType}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterType("all")}>
                All Types
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("EQUITY")}>
                Stocks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("ETF")}>
                ETFs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("INDEX")}>
                Indices
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("CRYPTO")}>
                Crypto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Assets Grid */}
      {combinedAssets.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">No assets in your watchlist</p>
          <div className="flex items-center justify-center gap-2">
            <SecuritySearch onStockAdded={loadAllAssets} buttonText="Add Stock" />
            <CryptoSearch onCryptoAdded={loadAllAssets} buttonText="Add Crypto" />
          </div>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">No assets match your search or filter</p>
          <Button variant="outline" onClick={() => { setSearchQuery(""); setFilterType("all"); }}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 flex items-start gap-3">
                    {asset.image && (
                      <img 
                        src={asset.image} 
                        alt={asset.name}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold mb-1">
                        <StockNameEdit
                          originalName={asset.name}
                          customName={asset.customName || null}
                          onSave={(customName) => saveCustomName(
                            asset.type === 'CRYPTO' ? asset.cgId! : asset.symbol,
                            customName,
                            asset.type
                          )}
                        />
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{asset.symbol}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs font-medium ${
                      asset.type === 'EQUITY' 
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200' 
                        : asset.type === 'ETF'
                        ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200'
                        : asset.type === 'INDEX'
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200'
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200'
                    }`}>
                      {asset.type}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 -mr-2"
                      onClick={() => asset.type === 'CRYPTO' ? deleteCrypto(asset.cgId!) : deleteStock(asset.symbol)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price Section */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Price</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold">
                      ${asset.price < 0.01 
                        ? asset.price.toFixed(6) 
                        : asset.price < 1 
                        ? asset.price.toFixed(4)
                        : formatPrice(asset.price)}
                    </p>
                  </div>
                </div>

                {/* Change Section */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Change (24h)</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium flex items-center justify-end gap-1 ${getChangeColor(asset.changePct24h)}`}>
                      {asset.changePct24h && asset.changePct24h > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {formatChange(asset.changePct24h, true)}
                    </p>
                    <p className={`text-xs ${getChangeColor(asset.changePct24h)}`}>
                      {formatChange(asset.change24h)}
                    </p>
                  </div>
                </div>

                {/* Type-specific stats */}
                {asset.type === 'CRYPTO' ? (
                  <div className="border-t pt-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {asset.marketCap && (
                        <div>
                          <div className="text-muted-foreground mb-1">Market Cap</div>
                          <div className="font-medium">
                            ${asset.marketCap >= 1e9 
                              ? `${(asset.marketCap / 1e9).toFixed(2)}B` 
                              : `${(asset.marketCap / 1e6).toFixed(2)}M`}
                          </div>
                        </div>
                      )}
                      {asset.volume && (
                        <div>
                          <div className="text-muted-foreground mb-1">Volume (24h)</div>
                          <div className="font-medium">
                            ${asset.volume >= 1e9 
                              ? `${(asset.volume / 1e9).toFixed(2)}B` 
                              : `${(asset.volume / 1e6).toFixed(2)}M`}
                          </div>
                        </div>
                      )}
                      {asset.high24h && (
                        <div>
                          <div className="text-muted-foreground mb-1">24h High</div>
                          <div className="font-medium">${formatPrice(asset.high24h)}</div>
                        </div>
                      )}
                      {asset.low24h && (
                        <div>
                          <div className="text-muted-foreground mb-1">24h Low</div>
                          <div className="font-medium">${formatPrice(asset.low24h)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  asset.yearHigh || asset.yearLow ? (
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium mb-2">52 Week Range</p>
                      <div className="flex items-center gap-4 text-xs">
                        {asset.yearLow && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Low</span>
                            <span className="font-medium">${formatPrice(asset.yearLow)}</span>
                          </div>
                        )}
                        {asset.yearHigh && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">High</span>
                            <span className="font-medium">${formatPrice(asset.yearHigh)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null
                )}

                {/* Last Updated */}
                <div className="border-t pt-3 text-xs text-muted-foreground">
                  Last updated: {asset.lastUpdate ? new Date(asset.lastUpdate).toLocaleString() : 'Unknown'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
