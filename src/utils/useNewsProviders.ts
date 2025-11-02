import { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from './supabase/info';

export type NewsProvider = {
  id: string;
  name: string;
  type: 'newsapi' | 'newsdata' | string;
  apiKey: string;
  baseUrl: string;
  country: string;
  language: string;
  pageSize: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function useNewsProviders() {
  const [providers, setProviders] = useState<NewsProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Fetch news providers from backend
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/news-providers`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Cache-Control': 'no-cache'
            }
          }
        );

        if (!mounted) return;
        
        if (!response.ok) {
          console.error('Failed to fetch news providers:', {
            status: response.status,
            statusText: response.statusText
          });
          
          setProviders([]);
          setLoading(false);
          return;
        }

        const data = await response.json();
        setProviders((data.providers || []).filter((p: NewsProvider) => p.isActive));
        setLoading(false);
      } catch (error) {
        if (!mounted) return;
        console.error('Error fetching news providers:', error);
        setProviders([]);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { providers, loading };
}
