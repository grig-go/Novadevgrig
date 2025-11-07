export interface Cluster {
  id: string;
  title: string;
  description: string | null;
  keywords: string[];
  category: string | null;
  sentiment: string | null;
  article_ids: string[];
  article_count: number;
  created_at: string;
  updated_at: string;
}

export interface ClusterStats {
  totalClusters: number;
  totalArticles: number;
  byCategory: Record<string, number>;
  bySentiment: Record<string, number>;
}

export interface ClusterFilters {
  category: string;
  sentiment: string;
  searchTerm: string;
}
