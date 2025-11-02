import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "./supabase/info";

export interface FinanceDataStats {
  totalSecurities: number;
  stockCount: number;
  cryptoCount: number;
  hasLivePrices: boolean;
  hasAnalystRatings: boolean;
  lastUpdated: string;
  loading: boolean;
  error: string | null;
}

export function useFinanceData() {
  const [stats, setStats] = useState<FinanceDataStats>({
    totalSecurities: 0,
    stockCount: 0,
    cryptoCount: 0,
    hasLivePrices: false,
    hasAnalystRatings: false,
    lastUpdated: new Date().toISOString(),
    loading: true,
    error: null,
  });

  const fetchFinanceData = async () => {
    try {
      // Fetch both stocks and cryptos in parallel
      const [stocksResponse, cryptosResponse] = await Promise.all([
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
      ]);

      let stockCount = 0;
      let cryptoCount = 0;
      let hasLivePrices = false;
      let hasAnalystRatings = false;

      // Process stocks
      if (stocksResponse.ok) {
        const stocksData = await stocksResponse.json();
        const stocks = stocksData.stocks || [];
        stockCount = stocks.length;
        
        // Check if we have live prices (at least one stock has a price)
        hasLivePrices = stocks.some((stock: any) => stock.price !== undefined && stock.price !== null);
        
        // Check if we have analyst ratings
        hasAnalystRatings = stocks.some((stock: any) => stock.rating !== undefined && stock.rating !== null);
      }

      // Process cryptos
      if (cryptosResponse.ok) {
        const cryptosData = await cryptosResponse.json();
        const cryptos = cryptosData.cryptos || [];
        cryptoCount = cryptos.length;
        
        // Crypto always has live prices if any exist
        if (cryptoCount > 0) {
          hasLivePrices = true;
        }
      }

      const totalSecurities = stockCount + cryptoCount;

      setStats({
        totalSecurities,
        stockCount,
        cryptoCount,
        hasLivePrices,
        hasAnalystRatings,
        lastUpdated: new Date().toISOString(),
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching finance data:", error);
      setStats((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  };

  useEffect(() => {
    fetchFinanceData();

    // Refresh every 5 minutes to match the dashboard
    const interval = setInterval(() => {
      fetchFinanceData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { stats, refresh: fetchFinanceData };
}
