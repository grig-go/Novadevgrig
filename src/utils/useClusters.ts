import { useState, useEffect } from 'react';
import { Cluster, ClusterStats } from '../types/clusters';
import { projectId, publicAnonKey } from './supabase/info';

export function useClusters() {
  console.log('🔵 useClusters hook called');
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [stats, setStats] = useState<ClusterStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClusters = async () => {
    console.log('📡 Fetching clusters...');
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/clusters/clusters`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch clusters');
      }

      const data = await response.json();
      setClusters(data.clusters || []);
    } catch (err) {
      console.error('Error fetching clusters:', err);
      setClusters([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/clusters/clusters/stats`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const createCluster = async (clusterData: {
    title: string;
    description?: string;
    keywords?: string[];
    category?: string;
    sentiment?: string;
    article_ids?: string[];
  }) => {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/clusters/clusters`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clusterData),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create cluster');
    }

    await fetchClusters();
    await fetchStats();
  };

  const updateCluster = async (id: string, clusterData: Partial<Cluster>) => {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/clusters/clusters/${id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clusterData),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update cluster');
    }

    await fetchClusters();
    await fetchStats();
  };

  const deleteCluster = async (id: string) => {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/clusters/clusters/${id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete cluster');
    }

    await fetchClusters();
    await fetchStats();
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchClusters(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, []);

  return {
    clusters,
    stats,
    loading,
    createCluster,
    updateCluster,
    deleteCluster,
    refresh: async () => {
      await fetchClusters();
      await fetchStats();
    },
  };
}