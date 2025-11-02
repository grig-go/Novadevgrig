import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { CryptoSearch } from "./CryptoSearch";
import { CryptoCard } from "./CryptoCard";
import { TrendingUp, TrendingDown, Coins, Database, Rss, Loader2, RefreshCw, Search, Filter, Brain } from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

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

interface CryptoDashboardProps {
  onNavigateToFeeds?: () => void;
}

export function CryptoDashboard({ onNavigateToFeeds }: CryptoDashboardProps) {
  const [cryptos, setCryptos] = useState<CryptoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Load cryptos on mount
  useEffect(() => {
    loadCryptos();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(() => {
      refreshCryptos();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const loadCryptos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/rest/v1/alpaca_stocks?type=eq.CRYPTO`,
        {
          headers: {
            apikey: publicAnonKey,
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load cryptocurrencies');
      }

      const data = await response.json();
      
      // Transform database rows to CryptoData format
      const transformedCryptos = (data || []).map((item: any) => ({
        id: item.symbol,
        cgId: item.symbol,
        symbol: item.symbol,
        name: item.custom_name || item.name,
        customName: item.custom_name,
        image: '',
        currentPrice: item.price || 0,
        priceChange24h: item.change_1d || 0,
        priceChangePercentage24h: item.change_1d_pct || 0,
        marketCap: 0,
        marketCapRank: 0,
        totalVolume: 0,
        high24h: item.year_high || 0,
        low24h: item.year_low || 0,
        lastUpdated: item.last_update || new Date().toISOString(),
      }));
      
      setCryptos(transformedCryptos);
      setLastRefresh(new Date().toISOString());
    } catch (error) {
      console.error('Error loading cryptocurrencies:', error);
      toast.error('Failed to load cryptocurrencies');
      setCryptos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCryptos = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/rest/v1/alpaca_stocks?type=eq.CRYPTO`,
        {
          headers: {
            apikey: publicAnonKey,
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to refresh cryptocurrency data');
      }

      const data = await response.json();
      
      // Transform database rows to CryptoData format
      const transformedCryptos = (data || []).map((item: any) => ({
        id: item.symbol,
        cgId: item.symbol,
        symbol: item.symbol,
        name: item.custom_name || item.name,
        customName: item.custom_name,
        image: '',
        currentPrice: item.price || 0,
        priceChange24h: item.change_1d || 0,
        priceChangePercentage24h: item.change_1d_pct || 0,
        marketCap: 0,
        marketCapRank: 0,
        totalVolume: 0,
        high24h: item.year_high || 0,
        low24h: item.year_low || 0,
        lastUpdated: item.last_update || new Date().toISOString(),
      }));
      
      setCryptos(transformedCryptos);
      setLastRefresh(new Date().toISOString());
      toast.success('Cryptocurrency data refreshed');
    } catch (error) {
      console.error('Error refreshing cryptocurrencies:', error);
      toast.error('Failed to refresh cryptocurrency data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCryptoUpdate = (updatedCrypto: CryptoData) => {
    setCryptos(prevCryptos =>
      prevCryptos.map(crypto =>
        crypto.cgId === updatedCrypto.cgId ? updatedCrypto : crypto
      )
    );
  };

  // Filter cryptos
  const filteredCryptos = cryptos.filter(crypto => {
    const matchesSearch = searchQuery === "" ||
      crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = 
      filterType === "all" ||
      (filterType === "gainers" && crypto.priceChangePercentage24h > 0) ||
      (filterType === "losers" && crypto.priceChangePercentage24h < 0);

    return matchesSearch && matchesFilter;
  });

  // Calculate statistics
  const stats = {
    total: cryptos.length,
    gainers: cryptos.filter(c => c.priceChangePercentage24h > 0).length,
    losers: cryptos.filter(c => c.priceChangePercentage24h < 0).length,
    totalMarketCap: cryptos.reduce((sum, c) => sum + c.marketCap, 0),
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(2)}T`;
    } else if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(2)}B`;
    }
    return `$${(marketCap / 1e6).toFixed(2)}M`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            <Coins className="w-8 h-8 text-orange-600" />
            Cryptocurrencies
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track your favorite cryptocurrencies from CoinGecko
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshCryptos}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <CryptoSearch onCryptoAdded={loadCryptos} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Cryptos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total Market Cap: {formatMarketCap(stats.totalMarketCap)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Gainers (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600">{stats.gainers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? ((stats.gainers / stats.total) * 100).toFixed(1) : 0}% of portfolio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              Losers (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-red-600">{stats.losers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? ((stats.losers / stats.total) * 100).toFixed(1) : 0}% of portfolio
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={onNavigateToFeeds}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4" />
              Data Provider
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Rss className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">CoinGecko API</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Click to manage feed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search cryptocurrencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <Filter className="w-4 h-4 mr-2" />
              {filterType === "all" && "All"}
              {filterType === "gainers" && "Gainers"}
              {filterType === "losers" && "Losers"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilterType("all")}>
              All Cryptos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType("gainers")}>
              <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
              Gainers Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType("losers")}>
              <TrendingDown className="w-4 h-4 mr-2 text-red-600" />
              Losers Only
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Crypto Cards Grid */}
      {filteredCryptos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Coins className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              {searchQuery || filterType !== "all" ? "No cryptocurrencies found" : "No cryptocurrencies added"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || filterType !== "all" 
                ? "Try adjusting your search or filters" 
                : "Add cryptocurrencies to start tracking"}
            </p>
            {!searchQuery && filterType === "all" && (
              <CryptoSearch onCryptoAdded={loadCryptos} />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCryptos.map((crypto) => (
            <CryptoCard
              key={crypto.id}
              crypto={crypto}
              onDelete={loadCryptos}
              onUpdate={handleCryptoUpdate}
            />
          ))}
        </div>
      )}

      {/* Last Refresh */}
      {lastRefresh && (
        <div className="text-center text-sm text-muted-foreground">
          Last updated: {new Date(lastRefresh).toLocaleString()}
        </div>
      )}
    </div>
  );
}
