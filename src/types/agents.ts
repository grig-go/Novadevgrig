export type AgentFormat = 'RSS' | 'ATOM' | 'JSON';
export type AgentStatus = 'ACTIVE' | 'PAUSED' | 'ERROR';
export type AgentCacheType = 'OFF' | '5M' | '15M' | '30M' | '1H';
export type AgentAuthType = 'none' | 'basic' | 'bearer' | 'api_key';
export type AgentDataType = 'Elections' | 'Finance' | 'Sports' | 'Weather' | 'News';

export interface AgentDataSource {
  id: string;
  name: string;
  feedId?: string; // Reference to an existing feed
  category: AgentDataType;
}

export interface AgentDataRelationship {
  sourceId: string;
  targetId: string;
  joinType: 'inner' | 'left' | 'right';
  joinField: string;
}

export interface AgentFieldMapping {
  outputField: string;
  sourceId: string;
  sourcePath: string;
  transform?: string;
}

export interface AgentTransform {
  type: 'filter' | 'map' | 'extract' | 'format' | 'sort' | 'deduplicate';
  config: Record<string, any>;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  // Step 2: Data Type
  dataType?: AgentDataType;
  // Step 3: Data Sources
  dataSources?: AgentDataSource[];
  // Step 4: Data Relationships
  relationships?: AgentDataRelationship[];
  // Step 5: Output Format
  format: AgentFormat;
  itemPath?: string; // JSONPath for generating items
  fieldMappings?: AgentFieldMapping[];
  fixedFields?: Record<string, string>; // For RSS/ATOM fixed fields
  // Step 6: Transformations
  transforms?: AgentTransform[];
  // Step 7: Security
  auth: AgentAuthType;
  apiKey?: string;
  requiresAuth?: boolean;
  // Runtime
  status: AgentStatus;
  cache: AgentCacheType;
  url?: string; // Generated endpoint URL
  created: string;
  lastRun?: string;
  runCount?: number;
  schedule?: string; // cron expression
}

export interface AgentsData {
  agents: Agent[];
  lastUpdated: string;
}
