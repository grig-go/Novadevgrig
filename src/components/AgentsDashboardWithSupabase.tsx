import { useState, useEffect } from "react";
import { APIEndpoint, Agent } from "../types/agents";
import { Feed } from "../types/feeds";
import { AgentWizard } from "./AgentWizard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Plus,
  Search,
  Pencil,
  Copy,
  Trash2,
  ExternalLink,
  MoreVertical,
  Bot,
  RefreshCw,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "../utils/supabase/client";
import { useToast } from "./ui/use-toast";

interface AgentsDashboardWithSupabaseProps {
  feeds?: Feed[];
}

// Helper function to convert APIEndpoint to Agent for UI compatibility
function convertAPIEndpointToAgent(endpoint: APIEndpoint): Agent {
  return {
    id: endpoint.id,
    name: endpoint.name,
    description: endpoint.description,
    icon: '📡', // Default icon
    format: endpoint.output_format?.toUpperCase() as 'JSON' | 'RSS' | 'ATOM' || 'JSON',
    auth: endpoint.auth_config?.type || 'none',
    requiresAuth: endpoint.auth_config?.required || false,
    status: endpoint.active ? 'ACTIVE' : 'PAUSED',
    cache: endpoint.cache_config?.enabled
      ? (endpoint.cache_config.ttl === 300 ? '5M' :
         endpoint.cache_config.ttl === 900 ? '15M' :
         endpoint.cache_config.ttl === 1800 ? '30M' :
         endpoint.cache_config.ttl === 3600 ? '1H' : 'OFF')
      : 'OFF',
    url: `/api/${endpoint.slug}`,
    created: endpoint.created_at,
    // Optional fields that might not be in database
    dataType: undefined,
    dataSources: [],
    relationships: [],
    fieldMappings: [],
    transforms: []
  };
}

// Helper function to convert Agent back to APIEndpoint for database operations
function convertAgentToAPIEndpoint(agent: Agent): Partial<APIEndpoint> {
  const ttlMap = {
    'OFF': 0,
    '5M': 300,
    '15M': 900,
    '30M': 1800,
    '1H': 3600
  };

  return {
    name: agent.name,
    slug: agent.url?.replace('/api/', '') || agent.name.toLowerCase().replace(/\s+/g, '-'),
    description: agent.description,
    output_format: agent.format.toLowerCase() as 'json' | 'rss' | 'xml' | 'csv' | 'custom',
    schema_config: {},
    transform_config: {},
    relationship_config: {},
    cache_config: {
      enabled: agent.cache !== 'OFF',
      ttl: ttlMap[agent.cache] || 0
    },
    auth_config: {
      required: agent.requiresAuth || false,
      type: agent.auth as 'none' | 'api-key' | 'bearer' | 'basic' | 'oauth2' | 'custom'
    },
    rate_limit_config: {
      enabled: false,
      requests_per_minute: 60
    },
    active: agent.status === 'ACTIVE'
  };
}

export function AgentsDashboardWithSupabase({
  feeds = []
}: AgentsDashboardWithSupabaseProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | undefined>(undefined);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Transform feeds to format expected by AgentWizard
  const availableFeeds = feeds.map(feed => ({
    id: feed.id,
    name: feed.name,
    category: feed.category
  }));

  // Load agents from database
  const loadAgents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('api_endpoints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load agents:', error);
        toast({
          title: "Error",
          description: "Failed to load agents from database",
          variant: "destructive"
        });
        return;
      }

      // Convert APIEndpoint to Agent format for UI
      const convertedAgents = (data || []).map(convertAPIEndpointToAgent);
      setAgents(convertedAgents);
    } catch (error) {
      console.error('Failed to load agents:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load agents on component mount
  useEffect(() => {
    loadAgents();
  }, []);

  // Refresh agents
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAgents();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Agents list has been updated"
    });
  };

  const filteredAgents = agents.filter(agent => {
    const searchLower = searchTerm.toLowerCase();
    return (
      agent.name.toLowerCase().includes(searchLower) ||
      (agent.url && agent.url.toLowerCase().includes(searchLower)) ||
      agent.format.toLowerCase().includes(searchLower)
    );
  });

  const handleEdit = async (agent: Agent) => {
    try {
      // Fetch the complete endpoint data with all relationships
      const { data: fullEndpoint, error } = await supabase
        .from('api_endpoints')
        .select(`
          *,
          api_endpoint_sources (
            *,
            data_source:data_sources (*)
          )
        `)
        .eq('id', agent.id)
        .single();

      if (error) throw error;

      // Convert back to Agent format with full data
      const fullAgent = convertAPIEndpointToAgent(fullEndpoint);
      setEditingAgent(fullAgent);
      setWizardOpen(true);
    } catch (error) {
      console.error('Failed to load agent details:', error);
      toast({
        title: "Error",
        description: "Failed to load agent details",
        variant: "destructive"
      });
    }
  };

  const handleDuplicate = async (agent: Agent) => {
    try {
      // Generate a unique slug
      const timestamp = Date.now();
      const newSlug = `${agent.url?.replace('/api/', '')}-copy-${timestamp}`;

      const duplicatedEndpoint = {
        ...convertAgentToAPIEndpoint(agent),
        name: `${agent.name} (Copy)`,
        slug: newSlug,
        active: false // Start duplicates as inactive
      };

      const { data, error } = await supabase
        .from('api_endpoints')
        .insert(duplicatedEndpoint)
        .select()
        .single();

      if (error) throw error;

      // Reload agents list
      await loadAgents();

      toast({
        title: "Success",
        description: "Agent duplicated successfully"
      });
    } catch (error) {
      console.error('Failed to duplicate agent:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate agent",
        variant: "destructive"
      });
    }
  };

  const handleWizardClose = () => {
    setWizardOpen(false);
    setEditingAgent(undefined);
  };

  const handleWizardSave = async (agent: Agent) => {
    try {
      const endpointData = convertAgentToAPIEndpoint(agent);

      if (editingAgent) {
        // Update existing agent
        const { error } = await supabase
          .from('api_endpoints')
          .update(endpointData)
          .eq('id', agent.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Agent updated successfully"
        });
      } else {
        // Create new agent
        const { error } = await supabase
          .from('api_endpoints')
          .insert(endpointData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Agent created successfully"
        });
      }

      // Reload agents list
      await loadAgents();
      handleWizardClose();
    } catch (error) {
      console.error('Failed to save agent:', error);
      toast({
        title: "Error",
        description: editingAgent ? "Failed to update agent" : "Failed to create agent",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('api_endpoints')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      // Reload agents list
      await loadAgents();

      toast({
        title: "Success",
        description: "Agent deleted successfully"
      });
    } catch (error) {
      console.error('Failed to delete agent:', error);
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive"
      });
    }
  };

  const toggleAgentStatus = async (agent: Agent) => {
    try {
      const { error } = await supabase
        .from('api_endpoints')
        .update({ active: agent.status !== 'ACTIVE' })
        .eq('id', agent.id);

      if (error) throw error;

      // Reload agents list
      await loadAgents();

      toast({
        title: "Success",
        description: `Agent ${agent.status === 'ACTIVE' ? 'deactivated' : 'activated'}`
      });
    } catch (error) {
      console.error('Failed to toggle agent status:', error);
      toast({
        title: "Error",
        description: "Failed to update agent status",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500';
      case 'PAUSED':
        return 'bg-yellow-500';
      case 'ERROR':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEndpointUrl = (agent: Agent) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}${agent.url}`;
  };

  const copyEndpointUrl = (agent: Agent) => {
    const url = getEndpointUrl(agent);
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied",
      description: "URL copied to clipboard"
    });
  };

  const testEndpoint = (agent: Agent) => {
    const url = getEndpointUrl(agent);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 mb-1 text-[24px]">
            <Bot className="w-6 h-6 text-purple-600" />
            Agents
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure and manage AI-powered data agents (Connected to Supabase)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
          <Button onClick={() => setWizardOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create New Agent
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredAgents.length} of {agents.length} agents
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Agent URL</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cache</TableHead>
                <TableHead>Auth</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No agents found matching your search.' : 'No agents found. Create your first agent to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgents.map((agent) => (
                  <TableRow key={agent.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{agent.icon || '📡'}</span>
                        <span className="font-medium">{agent.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {agent.dataType ? (
                        <Badge variant="secondary">{agent.dataType}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm text-muted-foreground max-w-[300px] truncate block">
                          {agent.url || 'Not configured'}
                        </code>
                        {agent.url && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => copyEndpointUrl(agent)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => testEndpoint(agent)}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{agent.format}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${getStatusColor(agent.status)} text-white cursor-pointer`}
                        onClick={() => toggleAgentStatus(agent)}
                      >
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{agent.cache}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{agent.auth}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(agent.created), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8"
                          onClick={() => handleEdit(agent)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8"
                          onClick={() => handleDuplicate(agent)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-destructive"
                          onClick={() => handleDeleteAgent(agent.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Wizard Dialog */}
      <AgentWizard
        open={wizardOpen}
        onClose={handleWizardClose}
        onSave={handleWizardSave}
        editAgent={editingAgent}
        availableFeeds={availableFeeds}
      />
    </div>
  );
}