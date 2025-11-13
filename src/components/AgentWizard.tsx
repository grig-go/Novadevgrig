import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import {
  Agent,
  AgentFormat,
  AgentStatus,
  AgentDataType,
  AgentDataSource,
  AgentDataRelationship,
  AgentFieldMapping,
  AgentTransform
} from "../types/agents";
import { ChevronLeft, ChevronRight, Check, Plus, X, Vote, TrendingUp, Trophy, Cloud, Newspaper, Link2, Database, AlertCircle } from "lucide-react";
import { Switch } from "./ui/switch";
import { supabase } from "../utils/supabase/client";
import OutputFormatStep from "./OutputFormatStep";
import TransformationStep from "./TransformationStep";
import SecurityStep, { SecurityStepRef } from "./SecurityStep";
import { useFetchProxy } from "../hooks/useFetchProxy";
import { isDevelopment, SKIP_AUTH_IN_DEV, DEV_USER_ID } from '../utils/constants';

interface AgentWizardProps {
  open: boolean;
  onClose: () => void;
  onSave: (agent: Agent, closeDialog?: boolean) => void;
  editAgent?: Agent;
  availableFeeds?: Array<{ id: string; name: string; category: string }>;
}

type WizardStep = 'basic' | 'dataType' | 'dataSources' | 'configureNewSources' | 'relationships' | 'outputFormat' | 'transformations' | 'security' | 'review';

const dataTypeCategories: AgentDataType[] = ['Elections', 'Finance', 'Sports', 'Weather', 'News'];

const dataTypeIcons: Record<AgentDataType, any> = {
  'Elections': Vote,
  'Finance': TrendingUp,
  'Sports': Trophy,
  'Weather': Cloud,
  'News': Newspaper
};

export function AgentWizard({ open, onClose, onSave, editAgent, availableFeeds = [] }: AgentWizardProps) {
  const { fetchViaProxy } = useFetchProxy();

  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [visitedSteps, setVisitedSteps] = useState<Set<WizardStep>>(() => {
    // In edit mode, all steps are considered visited
    if (editAgent) {
      return new Set<WizardStep>([
        'basic', 'dataType', 'dataSources', 'configureNewSources',
        'relationships', 'outputFormat', 'transformations', 'security', 'review'
      ]);
    }
    // In create mode, only the first step is visited
    return new Set(['basic']);
  });
  const [formData, setFormData] = useState<Partial<Agent>>(editAgent || {
    name: '',
    description: '',
    icon: '🤖',
    slug: '',
    environment: 'production' as 'production' | 'staging' | 'development',
    autoStart: true,
    generateDocs: true,
    dataType: [],
    dataSources: [],
    relationships: [],
    format: 'JSON',
    formatOptions: {},
    itemPath: '',
    fieldMappings: [],
    fixedFields: {},
    transforms: [],
    auth: 'none',
    requiresAuth: false,
    status: 'ACTIVE',
    cache: '15M'
  });

  // Ref to SecurityStep to sync auth data before saving
  const securityStepRef = useRef<SecurityStepRef>(null);

  // State for adding new items in various steps
  const [newRelationship, setNewRelationship] = useState<Partial<AgentDataRelationship>>({});
  const [newMapping, setNewMapping] = useState<Partial<AgentFieldMapping>>({});
  const [newFixedField, setNewFixedField] = useState({ key: '', value: '' });

  // State for fetching data sources from Supabase
  const [availableDataSources, setAvailableDataSources] = useState<Array<{ id: string; name: string; type: string; category: string }>>([]);
  const [loadingDataSources, setLoadingDataSources] = useState(false);

  // State for new data sources to be created
  const [newDataSources, setNewDataSources] = useState<any[]>([]);
  const [isSavingDataSources, setIsSavingDataSources] = useState(false);

  // State for test connection results
  const [testResults, setTestResults] = useState<Record<number, any>>({});
  const [testLoading, setTestLoading] = useState<Record<number, boolean>>({});
  const [testParams, setTestParams] = useState<Record<number, Record<string, string>>>({});

  // State for sample data from data sources
  const [sampleData, setSampleData] = useState<Record<string, any>>({});

  // Helper function to extract JSON fields
  const extractJsonFields = (data: any, prefix: string = ''): string[] => {
    const fields: string[] = [];

    if (data === null || data === undefined) return fields;

    if (Array.isArray(data)) {
      if (data.length > 0 && typeof data[0] === 'object') {
        return extractJsonFields(data[0], prefix);
      }
      return fields;
    }

    if (typeof data === 'object') {
      Object.keys(data).forEach(key => {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        fields.push(fullPath);

        // Don't recurse too deep - just one level for now
        if (!prefix && data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
          const nestedFields = extractJsonFields(data[key], fullPath);
          fields.push(...nestedFields);
        }
      });
    }

    return [...new Set(fields)];
  };

  // Test API connection
  const testAPIConnection = async (index: number) => {
    const source = newDataSources[index];
    console.log('Testing API connection for source:', source);

    if (!source.api_config?.url) {
      setTestResults(prev => ({
        ...prev,
        [index]: {
          success: false,
          error: 'No URL configured'
        }
      }));
      return;
    }

    // Check for required parameters
    const paramMappings = source.api_config.parameter_mappings || [];
    const requiredMappings = paramMappings.filter((m: any) => m.required);
    const currentTestParams = testParams[index] || {};

    // Validate required parameters
    for (const mapping of requiredMappings) {
      if (!currentTestParams[mapping.queryParam]) {
        setTestResults(prev => ({
          ...prev,
          [index]: {
            success: false,
            error: `⚠️ Required test parameter '${mapping.queryParam}' is missing. Please provide a value above.`
          }
        }));
        return;
      }
    }

    setTestLoading(prev => ({ ...prev, [index]: true }));

    try {
      // Substitute parameters in URL
      let testUrl = source.api_config.url;
      for (const mapping of paramMappings) {
        const paramValue = currentTestParams[mapping.queryParam];
        if (paramValue) {
          testUrl = testUrl.replace(`{${mapping.urlPlaceholder}}`, paramValue);
        }
      }

      console.log('Testing URL:', testUrl);

      // Build headers including authentication
      const headers: Record<string, string> = { ...(source.api_config.headers || {}) };

      // Add authentication headers if configured
      if (source.api_config.auth_type === 'bearer' && source.api_config.bearer_token) {
        headers['Authorization'] = `Bearer ${source.api_config.bearer_token}`;
      } else if (source.api_config.auth_type === 'api_key_header' && source.api_config.api_key_header && source.api_config.api_key_value) {
        headers[source.api_config.api_key_header] = source.api_config.api_key_value;
      }

      // Try to fetch directly, fallback to using a proxy if CORS fails
      let response;
      let result;

      try {
        response = await fetch(testUrl, {
          method: source.api_config.method || 'GET',
          headers,
          mode: 'cors'
        });
        result = { data: await response.json(), status: response.status };
      } catch (corsError) {
        console.log('CORS failed, trying without CORS mode');
        // If CORS fails, try without mode specification
        try {
          response = await fetch(testUrl, {
            method: source.api_config.method || 'GET',
            headers
          });
          result = { data: await response.json(), status: response.status };
        } catch (fetchError) {
          throw new Error('Failed to connect. Please check the URL and ensure CORS is enabled on the API.');
        }
      }

      if (!response || !response.ok) {
        throw new Error(`HTTP error ${response?.status || 'unknown'}`);
      }

      // Extract fields from the response
      let extractedFields: string[] = [];
      let dataToAnalyze = result.data;

      // If there's a data_path, navigate to it
      if (source.api_config.data_path) {
        const pathParts = source.api_config.data_path.split('.');
        let current = result.data;

        for (const part of pathParts) {
          if (current && typeof current === 'object') {
            current = current[part];
          }
        }

        if (current) {
          dataToAnalyze = current;
        }
      }

      extractedFields = extractJsonFields(dataToAnalyze);

      setTestResults(prev => ({
        ...prev,
        [index]: {
          success: true,
          message: 'Connection successful!',
          status: result.status,
          fields: extractedFields,
          testedUrl: testUrl
        }
      }));

      // Store fields for later use
      const updated = [...newDataSources];
      updated[index] = {
        ...updated[index],
        fields: extractedFields,
        sample_data: Array.isArray(dataToAnalyze) ? dataToAnalyze.slice(0, 5) : [dataToAnalyze]
      };
      setNewDataSources(updated);

    } catch (error) {
      console.error('Test connection error:', error);
      setTestResults(prev => ({
        ...prev,
        [index]: {
          success: false,
          error: error instanceof Error ? error.message : 'Connection failed'
        }
      }));
    } finally {
      setTestLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  // Test RSS feed
  const testRSSFeed = async (index: number) => {
    const source = newDataSources[index];
    if (!source.rss_config?.url) {
      setTestResults(prev => ({
        ...prev,
        [index]: {
          success: false,
          error: 'No RSS URL configured'
        }
      }));
      return;
    }

    setTestLoading(prev => ({ ...prev, [index]: true }));

    try {
      // Try to fetch RSS feed
      let response;
      let result;

      try {
        response = await fetch(source.rss_config.url, {
          method: 'GET',
          mode: 'cors'
        });
        const text = await response.text();
        result = { data: text, status: response.status };
      } catch (corsError) {
        console.log('CORS failed, trying without CORS mode');
        try {
          response = await fetch(source.rss_config.url, {
            method: 'GET'
          });
          const text = await response.text();
          result = { data: text, status: response.status };
        } catch (fetchError) {
          throw new Error('Failed to load RSS feed. Please check the URL and ensure CORS is enabled.');
        }
      }

      if (!response || !response.ok) {
        throw new Error(`HTTP error ${response?.status || 'unknown'}`);
      }

      // Standard RSS fields
      const extractedFields = ['title', 'description', 'link', 'pubDate', 'guid', 'author', 'category'];

      setTestResults(prev => ({
        ...prev,
        [index]: {
          success: true,
          message: 'RSS feed validated!',
          status: result.status,
          fields: extractedFields
        }
      }));

      // Store fields for later use
      const updated = [...newDataSources];
      updated[index] = {
        ...updated[index],
        fields: extractedFields
      };
      setNewDataSources(updated);

    } catch (error) {
      console.error('RSS test error:', error);
      setTestResults(prev => ({
        ...prev,
        [index]: {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load RSS feed'
        }
      }));
    } finally {
      setTestLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  // Fetch data sources from Supabase when dialog opens or dataType changes
  useEffect(() => {
    const categories = Array.isArray(formData.dataType) ? formData.dataType : (formData.dataType ? [formData.dataType] : []);

    if (open && categories.length > 0) {
      const fetchDataSources = async () => {
        setLoadingDataSources(true);
        console.log('Fetching data sources for categories:', categories);
        try {
          const { data, error } = await supabase
            .from('data_sources')
            .select('id, name, type, category')
            .in('category', categories)
            .order('name');

          console.log('Data sources query result:', { data, error, count: data?.length });

          if (error) throw error;
          setAvailableDataSources(data || []);
        } catch (error) {
          console.error('Error fetching data sources:', error);
          setAvailableDataSources([]);
        } finally {
          setLoadingDataSources(false);
        }
      };

      fetchDataSources();
    } else if (open) {
      // Clear data sources if no categories selected
      setAvailableDataSources([]);
    }
  }, [open, formData.dataType]);

  // Combine existing selected sources and newly saved sources
  const allDataSources = React.useMemo(() => {
    const selectedExisting = (formData.dataSources || []).filter((ds: AgentDataSource) =>
      !newDataSources.some((newDs: any) => newDs.id === ds.id)
    );
    const validNew = newDataSources.filter((ds: any) => ds.id && ds.name && ds.type).map((ds: any) => ({
      id: ds.id,
      name: ds.name,
      type: ds.type,
      category: ds.category,
      feedId: ds.id  // Use database UUID as feedId for junction table
    }));

    return [...selectedExisting, ...validNew];
  }, [formData.dataSources, newDataSources]);

  // Update formData.dataSources whenever allDataSources changes
  useEffect(() => {
    if (allDataSources.length > 0 && JSON.stringify(formData.dataSources) !== JSON.stringify(allDataSources)) {
      setFormData((prev: Partial<Agent>) => ({ ...prev, dataSources: allDataSources }));
    }
  }, [allDataSources]);

  // Update formData when editAgent changes
  useEffect(() => {
    if (editAgent && open) {
      setFormData(editAgent);
      // When editing, start at the review step (Step 8) like nova-old
      setCurrentStep('review');
      // In edit mode, mark all steps as visited
      setVisitedSteps(new Set<WizardStep>([
        'basic', 'dataType', 'dataSources', 'configureNewSources',
        'relationships', 'outputFormat', 'transformations', 'security', 'review'
      ]));
    } else if (!editAgent && open) {
      // Reset to default when creating a new agent
      setFormData({
        name: '',
        description: '',
        icon: '🤖',
        slug: '',
        environment: 'production' as 'production' | 'staging' | 'development',
        autoStart: true,
        generateDocs: true,
        dataType: [],
        dataSources: [],
        relationships: [],
        format: 'JSON',
        itemPath: '',
        fieldMappings: [],
        fixedFields: {},
        transforms: [],
        auth: 'none',
        requiresAuth: false,
        status: 'ACTIVE',
        cache: '15M'
      });
      setCurrentStep('basic');
      // In create mode, reset visited steps to only 'basic'
      setVisitedSteps(new Set<WizardStep>(['basic']));
    }
  }, [editAgent, open]);

  // Dynamic steps - include configureNewSources only if there are new sources to configure
  const steps: WizardStep[] = [
    'basic',
    'dataType',
    'dataSources',
    ...(newDataSources.filter(ds => ds.name && ds.type).length > 0 ? ['configureNewSources' as WizardStep] : []),
    'relationships',
    'outputFormat',
    'transformations',
    'security',
    'review'
  ];
  const currentStepIndex = steps.indexOf(currentStep);

  const saveAllNewDataSources = async (): Promise<boolean> => {
    const unsavedDataSources = newDataSources.filter((ds: any) => !ds.id && ds.name && ds.type);

    if (unsavedDataSources.length === 0) {
      return true; // Nothing to save
    }

    setIsSavingDataSources(true);

    try {
      // Get user ID with dev mode support
      let userId = DEV_USER_ID;

      if (!isDevelopment || !SKIP_AUTH_IN_DEV) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }
        userId = user.id;
      }

      // Save all unsaved data sources
      for (let i = 0; i < newDataSources.length; i++) {
        const source = newDataSources[i];

        // Skip if already saved or incomplete
        if (source.id || !source.name || !source.type) {
          continue;
        }

        // Validate based on type
        if (source.type === 'api' && !source.api_config?.url) {
          alert(`Data source "${source.name}" is missing required API URL`);
          setIsSavingDataSources(false);
          return false;
        }

        if (source.type === 'rss' && !source.rss_config?.url) {
          alert(`Data source "${source.name}" is missing required RSS feed URL`);
          setIsSavingDataSources(false);
          return false;
        }

        if (source.type === 'file' && !source.file_config?.url) {
          alert(`Data source "${source.name}" is missing required file URL`);
          setIsSavingDataSources(false);
          return false;
        }

        const dataSourceData: any = {
          name: source.name,
          type: source.type,
          category: source.category,
          active: true,
          api_config: source.type === 'api' ? source.api_config : null,
          database_config: source.type === 'database' ? source.database_config : null,
          file_config: source.type === 'file' ? source.file_config : null,
          rss_config: source.type === 'rss' ? source.rss_config : null,
          user_id: userId
        };

        const { data, error } = await supabase
          .from('data_sources')
          .insert(dataSourceData)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to save ${source.name}: ${error.message}`);
        }

        // Update the data source with the saved ID
        setNewDataSources((prev: any) => prev.map((ds: any, idx: number) =>
          idx === i ? { ...ds, id: data.id, isNew: false } : ds
        ));
      }

      console.log(`Successfully saved ${unsavedDataSources.length} data source(s)`);
      setIsSavingDataSources(false);
      return true;

    } catch (error: any) {
      console.error('Error saving data sources:', error);
      alert(`Failed to save data sources: ${error.message}`);
      setIsSavingDataSources(false);
      return false;
    }
  };

  const handleNext = async () => {
    // Check if we're leaving the "configureNewSources" step
    if (currentStep === 'configureNewSources') {
      // Check if there are unsaved data sources
      const hasUnsavedDataSources = newDataSources.some((ds: any) => !ds.id && ds.name && ds.type);

      if (hasUnsavedDataSources) {
        // Save all data sources before proceeding
        const saveSuccess = await saveAllNewDataSources();

        if (!saveSuccess) {
          // Stay on current step if save failed
          return;
        }
      }
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      const nextStep = steps[nextIndex];
      setCurrentStep(nextStep);
      setVisitedSteps((prev: Set<WizardStep>) => new Set([...prev, nextStep]));
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleSave = async (closeDialog: boolean = true) => {
    // Sync auth settings from SecurityStep before saving
    securityStepRef.current?.syncAuthToFormData();

    // First, save new data sources to the database (only those not yet saved)
    const savedDataSourceIds: string[] = [];
    const newlySavedSources: AgentDataSource[] = [];

    // Only save data sources that don't have an ID yet (haven't been saved)
    const unsavedSources = newDataSources.filter(ds => !ds.id && ds.name && ds.type);
    if (unsavedSources.length > 0) {
      console.log('Saving new data sources to database...');

      for (const newSource of unsavedSources) {
        try {
          const { data, error } = await supabase
            .from('data_sources')
            .insert({
              name: newSource.name,
              type: newSource.type,
              category: newSource.category || null,
              api_config: newSource.api_config || null,
              rss_config: newSource.rss_config || null,
              file_config: newSource.file_config || null,
              database_config: newSource.database_config || null
            })
            .select()
            .single();

          if (error) {
            console.error('Error saving data source:', error);
            throw error;
          }

          if (data) {
            console.log('Saved data source:', data);
            savedDataSourceIds.push((data as any).id);

            // Track newly saved source
            const newAgentSource: AgentDataSource = {
              id: (data as any).id, // Use database UUID directly, no temporary ID
              name: (data as any).name,
              feedId: (data as any).id,
              category: (data as any).category as AgentDataType
            };

            newlySavedSources.push(newAgentSource);

            setFormData(prev => ({
              ...prev,
              dataSources: [...(prev.dataSources || []), newAgentSource]
            }));
          }
        } catch (error) {
          console.error('Failed to save new data source:', error);
          // Continue with other sources even if one fails
        }
      }

      console.log(`Saved ${savedDataSourceIds.length} new data sources`);
    }

    // Combine existing and newly saved sources
    const allDataSources = [...(formData.dataSources || []), ...newlySavedSources];

    // No need to update sourceMappings - they already use database UUIDs directly
    const newAgent: Agent = {
      id: editAgent?.id || `agent-${Date.now()}`,
      name: formData.name || 'Unnamed Agent',
      description: formData.description,
      icon: formData.icon,
      slug: formData.slug,
      environment: formData.environment,
      autoStart: formData.autoStart,
      generateDocs: formData.generateDocs,
      dataType: formData.dataType,
      dataSources: allDataSources,
      relationships: formData.relationships || [],
      format: formData.format || 'JSON',
      formatOptions: formData.formatOptions || {},
      itemPath: formData.itemPath,
      fieldMappings: formData.fieldMappings || [],
      fixedFields: formData.fixedFields || {},
      transforms: formData.transforms || [],
      auth: formData.auth || 'none',
      apiKey: formData.apiKey,
      requiresAuth: formData.requiresAuth,
      authConfig: formData.authConfig, // Include auth credentials
      status: formData.status || 'ACTIVE',
      cache: formData.cache || '15M',
      url: `${window.location.origin}/api/${formData.slug || formData.name?.toLowerCase().replace(/\s+/g, '-')}`,
      created: editAgent?.created || new Date().toISOString(),
      lastRun: editAgent?.lastRun,
      runCount: editAgent?.runCount || 0
    };

    // Pass closeDialog parameter to parent
    onSave(newAgent, closeDialog);

    // Only close dialog locally if requested
    if (closeDialog) {
      handleClose();
    }
  };

  const handleClose = () => {
    setCurrentStep('basic');
    setFormData({
      name: '',
      description: '',
      icon: '🤖',
      slug: '',
      environment: 'production' as 'production' | 'staging' | 'development',
      autoStart: true,
      generateDocs: true,
      dataType: [],
      dataSources: [],
      relationships: [],
      format: 'JSON',
      itemPath: '',
      fieldMappings: [],
      fixedFields: {},
      transforms: [],
      auth: 'none',
      requiresAuth: false,
      status: 'ACTIVE',
      cache: '15M'
    });
    setNewDataSources([]); // Clear new data sources
    onClose();
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 'basic':
        return formData.name && formData.name.trim().length > 0 &&
               formData.slug && formData.slug.trim().length > 0;
      case 'dataType':
        return Array.isArray(formData.dataType) ? formData.dataType.length > 0 : formData.dataType !== undefined;
      case 'dataSources':
        // Valid if there are existing selected sources OR new sources to create
        return (formData.dataSources && formData.dataSources.length > 0) ||
               newDataSources.filter(ds => ds.name && ds.type).length > 0;
      case 'configureNewSources':
        // All new data sources must have required fields based on their type
        return newDataSources.filter(ds => ds.name && ds.type).every(ds => {
          if (ds.type === 'api') {
            return ds.api_config?.url;
          } else if (ds.type === 'rss') {
            return ds.rss_config?.url;
          } else if (ds.type === 'file') {
            // File source validation depends on source type
            if (ds.file_config?.source === 'url') {
              return ds.file_config?.url;
            }
            // For upload and path, we just need the source field
            return ds.file_config?.source;
          } else if (ds.type === 'database') {
            // Database just needs dbType selected
            return ds.database_config?.dbType;
          }
          return false;
        });
      case 'relationships':
        return true; // Optional step
      case 'outputFormat':
        return formData.format !== undefined;
      case 'transformations':
        return true; // Optional step
      case 'security':
        return true; // Optional step
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="space-y-2">
        <p className="text-xs text-center text-muted-foreground">
          {editAgent ? 'Click on any step to navigate' : 'Click on visited steps to navigate'}
        </p>
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, index) => {
            const isClickable = editAgent || visitedSteps.has(step);
            return (
              <div key={step} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => isClickable && setCurrentStep(step)}
                  disabled={!isClickable}
                  title={
                    isClickable
                      ? `Go to step ${index + 1}`
                      : `Complete previous steps first`
                  }
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all group relative ${
                    isClickable ? 'cursor-pointer hover:scale-110 hover:shadow-md' : 'cursor-not-allowed opacity-50'
                  } ${
                    index < currentStepIndex
                      ? 'bg-blue-600 text-white'
                      : index === currentStepIndex
                        ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                  {index < currentStepIndex ? (
                    <>
                      <Check className="w-4 h-4 group-hover:hidden" />
                      <span className="hidden group-hover:block text-xs font-semibold">{index + 1}</span>
                    </>
                  ) : (
                    index + 1
                  )}
                </button>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 ${
                    index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const generateSlugFromName = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const renderBasicInfo = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Agent Name *</Label>
        <Input
          id="name"
          value={formData.name || ''}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value });
            // Auto-generate slug if it's empty or matches the previous auto-generated slug
            if (!formData.slug || formData.slug === generateSlugFromName(formData.name || '')) {
              setFormData(prev => ({ ...prev, slug: generateSlugFromName(e.target.value) }));
            }
          }}
          placeholder="e.g., Breaking News Feed"
        />
      </div>

      <div>
        <Label htmlFor="slug">URL Slug *</Label>
        <div className="space-y-2">
          <Input
            id="slug"
            value={formData.slug || ''}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="my-api-endpoint"
          />
          {formData.slug && (
            <div className="bg-muted p-2 rounded text-sm">
              <span className="text-muted-foreground">Your API will be available at:</span>{' '}
              <code className="text-foreground">/api/{formData.slug}</code>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of what this agent does"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="icon">Icon (Emoji)</Label>
        <Input
          id="icon"
          value={formData.icon || ''}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          placeholder="🤖"
          maxLength={2}
        />
      </div>
    </div>
  );

  const renderDataType = () => {
    const selectedCategories = Array.isArray(formData.dataType) ? formData.dataType : (formData.dataType ? [formData.dataType] : []);

    const toggleCategory = (category: AgentDataType) => {
      const isSelected = selectedCategories.includes(category);
      let newCategories: AgentDataType[];

      if (isSelected) {
        // Remove category
        newCategories = selectedCategories.filter(c => c !== category);
      } else {
        // Add category
        newCategories = [...selectedCategories, category];
      }

      setFormData({ ...formData, dataType: newCategories });
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Select one or more data categories (click to toggle)
        </p>
        <div className="grid grid-cols-2 gap-4">
          {dataTypeCategories.map((category) => {
            const IconComponent = dataTypeIcons[category];
            const isSelected = selectedCategories.includes(category);
            return (
              <Card
                key={category}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                    : 'hover:border-gray-400 dark:hover:border-gray-600'
                }`}
                onClick={() => toggleCategory(category)}
              >
                <CardContent className="p-6 flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{category}</h3>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-blue-600" />}
                </CardContent>
              </Card>
            );
          })}
        </div>
        {selectedCategories.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Selected {selectedCategories.length} {selectedCategories.length === 1 ? 'category' : 'categories'}: {selectedCategories.join(', ')}
          </p>
        )}
      </div>
    );
  };

  const renderDataSources = () => {
    const selectedCategories = Array.isArray(formData.dataType) ? formData.dataType : (formData.dataType ? [formData.dataType] : []);

    const addDataSource = (sourceId: string, sourceName: string, sourceCategory: string, sourceType: string) => {
      const newSource: AgentDataSource = {
        id: sourceId, // Use database UUID directly, no temporary ID
        name: sourceName,
        feedId: sourceId,
        category: sourceCategory as AgentDataType,
        type: sourceType
      };
      setFormData({
        ...formData,
        dataSources: [...(formData.dataSources || []), newSource]
      });
    };

    const removeDataSource = (sourceId: string) => {
      setFormData({
        ...formData,
        dataSources: formData.dataSources?.filter(s => s.id !== sourceId)
      });
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {selectedCategories.length > 0
            ? `Select one or more data sources from: ${selectedCategories.join(', ')}`
            : 'Please select at least one category in the previous step'}
        </p>

        {/* Selected Sources */}
        {formData.dataSources && formData.dataSources.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Sources ({formData.dataSources.length})</Label>
            <div className="space-y-2">
              {formData.dataSources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">{source.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {source.category}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDataSource(source.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Data Sources from Supabase */}
        <div className="space-y-2">
          <Label>Available Sources</Label>
          {loadingDataSources ? (
            <div className="p-4 text-center text-sm text-muted-foreground bg-muted rounded-lg">
              Loading data sources...
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {availableDataSources.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground bg-muted rounded-lg">
                  {selectedCategories.length === 0
                    ? 'Please select at least one category in step 2'
                    : `No data sources available for ${selectedCategories.join(', ')}`}
                </div>
              ) : (
                availableDataSources.map((source) => {
                  const isAdded = formData.dataSources?.some(s => s.feedId === source.id);
                  return (
                    <div
                      key={source.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{source.name}</div>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {source.type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {source.category}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isAdded ? "outline" : "default"}
                        onClick={() => isAdded ? null : addDataSource(source.id, source.name, source.category, source.type)}
                        disabled={isAdded}
                      >
                        {isAdded ? 'Added' : 'Add'}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Create New Data Sources */}
        <div className="space-y-2 mt-6">
          <div className="flex items-center justify-between">
            <Label>Create New Data Sources</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newIndex = newDataSources.length;
                setNewDataSources([...newDataSources, { name: '', type: '', category: selectedCategories[0] || '' }]);
                // Clear test results for the new source index
                setTestResults(prev => {
                  const updated = { ...prev };
                  delete updated[newIndex];
                  return updated;
                });
                setTestLoading(prev => {
                  const updated = { ...prev };
                  delete updated[newIndex];
                  return updated;
                });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Source
            </Button>
          </div>

          {newDataSources.length > 0 ? (
            <div className="space-y-3">
              {newDataSources.map((source, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Name <span className="text-red-500">*</span></Label>
                            <Input
                              value={source.name}
                              onChange={(e) => {
                                const updated = [...newDataSources];
                                updated[index] = { ...updated[index], name: e.target.value };
                                setNewDataSources(updated);
                              }}
                              placeholder="e.g., My Custom API"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Type <span className="text-red-500">*</span></Label>
                            <Select
                              value={source.type}
                              onValueChange={(value) => {
                                const updated = [...newDataSources];
                                const typeConfig: any = { type: value };
                                if (value === 'api') {
                                  typeConfig.api_config = { method: 'GET', auth_type: 'none', headers: {} };
                                } else if (value === 'database') {
                                  typeConfig.database_config = { connections: {} };
                                } else if (value === 'file') {
                                  typeConfig.file_config = { source: 'url', format: 'csv' };
                                } else if (value === 'rss') {
                                  typeConfig.rss_config = {};
                                }
                                updated[index] = { ...updated[index], ...typeConfig };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="api">REST API</SelectItem>
                                <SelectItem value="database">Database</SelectItem>
                                <SelectItem value="file">File</SelectItem>
                                <SelectItem value="rss">RSS Feed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select
                            value={source.category}
                            onValueChange={(value) => {
                              const updated = [...newDataSources];
                              updated[index] = { ...updated[index], category: value };
                              setNewDataSources(updated);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                            <SelectContent>
                              {dataTypeCategories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {source.type && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                              You'll configure the details of this {source.type} source in the next step.
                            </p>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNewDataSources(newDataSources.filter((_, i) => i !== index));
                        }}
                        className="ml-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground bg-muted rounded-lg">
              No new data sources. Click "Add New Source" to create one.
            </div>
          )}
        </div>

        {/* Summary */}
        {(formData.dataSources && formData.dataSources.length > 0) || newDataSources.filter(ds => ds.name && ds.type).length > 0 ? (
          <Card className="p-4 bg-muted mt-4">
            <div className="flex items-center gap-3 text-sm">
              <Database className="w-4 h-4" />
              <strong>Summary:</strong>
              <Badge variant="default">
                {formData.dataSources?.length || 0} existing selected
              </Badge>
              <Badge variant="secondary">
                {newDataSources.filter(ds => ds.name && ds.type).length} new configured
              </Badge>
              <Badge variant="outline">
                {(formData.dataSources?.length || 0) + newDataSources.filter(ds => ds.name && ds.type).length} total sources
              </Badge>
            </div>
          </Card>
        ) : null}
      </div>
    );
  };

  const renderConfigureNewSources = () => {
    const validNewSources = newDataSources.filter(ds => ds.name && ds.type);

    if (validNewSources.length === 0) {
      return (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">No new data sources to configure.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Configure the connection details for each new data source. These sources will be saved to your database.
        </p>

        {validNewSources.map((source, index) => {
          const actualIndex = newDataSources.indexOf(source);

          return (
            <Card key={index} className="p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Database className="w-5 h-5" />
                  <h3 className="font-semibold">{source.name}</h3>
                  <Badge variant="outline">{source.type}</Badge>
                  {source.category && <Badge variant="secondary">{source.category}</Badge>}
                </div>

                {/* API Configuration */}
                {source.type === 'api' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>API URL <span className="text-red-500">*</span></Label>
                      <Input
                        value={source.api_config?.url || ''}
                        onChange={(e) => {
                          const updated = [...newDataSources];
                          updated[actualIndex] = {
                            ...updated[actualIndex],
                            api_config: { ...updated[actualIndex].api_config, url: e.target.value }
                          };
                          setNewDataSources(updated);
                        }}
                        placeholder="https://api.example.com/v1/data"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>HTTP Method</Label>
                        <Select
                          value={source.api_config?.method || 'GET'}
                          onValueChange={(value) => {
                            const updated = [...newDataSources];
                            updated[actualIndex] = {
                              ...updated[actualIndex],
                              api_config: { ...updated[actualIndex].api_config, method: value }
                            };
                            setNewDataSources(updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Authentication Type</Label>
                        <Select
                          value={source.api_config?.auth_type || 'none'}
                          onValueChange={(value) => {
                            const updated = [...newDataSources];
                            updated[actualIndex] = {
                              ...updated[actualIndex],
                              api_config: { ...updated[actualIndex].api_config, auth_type: value }
                            };
                            setNewDataSources(updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Authentication</SelectItem>
                            <SelectItem value="basic">Basic Auth</SelectItem>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                            <SelectItem value="api_key_header">API Key (Header)</SelectItem>
                            <SelectItem value="api_key_query">API Key (Query)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {source.api_config?.auth_type === 'bearer' && (
                      <div className="space-y-2">
                        <Label>Bearer Token</Label>
                        <Input
                          type="password"
                          value={source.api_config?.bearer_token || ''}
                          onChange={(e) => {
                            const updated = [...newDataSources];
                            updated[actualIndex] = {
                              ...updated[actualIndex],
                              api_config: { ...updated[actualIndex].api_config, bearer_token: e.target.value }
                            };
                            setNewDataSources(updated);
                          }}
                          placeholder="Your bearer token"
                        />
                      </div>
                    )}

                    {source.api_config?.auth_type === 'api_key_header' && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>API Key Header Name</Label>
                          <Input
                            value={source.api_config?.api_key_header || 'X-API-Key'}
                            onChange={(e) => {
                              const updated = [...newDataSources];
                              updated[actualIndex] = {
                                ...updated[actualIndex],
                                api_config: { ...updated[actualIndex].api_config, api_key_header: e.target.value }
                              };
                              setNewDataSources(updated);
                            }}
                            placeholder="X-API-Key"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>API Key Value</Label>
                          <Input
                            type="password"
                            value={source.api_config?.api_key_value || ''}
                            onChange={(e) => {
                              const updated = [...newDataSources];
                              updated[actualIndex] = {
                                ...updated[actualIndex],
                                api_config: { ...updated[actualIndex].api_config, api_key_value: e.target.value }
                              };
                              setNewDataSources(updated);
                            }}
                            placeholder="Your API key"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Data Path (optional)</Label>
                      <Input
                        value={source.api_config?.data_path || ''}
                        onChange={(e) => {
                          const updated = [...newDataSources];
                          updated[actualIndex] = {
                            ...updated[actualIndex],
                            api_config: { ...updated[actualIndex].api_config, data_path: e.target.value }
                          };
                          setNewDataSources(updated);
                        }}
                        placeholder="data.items"
                      />
                      <p className="text-xs text-muted-foreground">
                        JSON path to the array of items (e.g., 'data.items' or 'results')
                      </p>
                    </div>

                    {/* Dynamic URL Parameters Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Dynamic URL Parameters</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Map query parameters from your endpoint URL to placeholders in this data source URL
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const updated = [...newDataSources];
                            const newMapping = { queryParam: '', urlPlaceholder: '', required: false };
                            updated[actualIndex] = {
                              ...updated[actualIndex],
                              api_config: {
                                ...updated[actualIndex].api_config,
                                parameter_mappings: [...(updated[actualIndex].api_config?.parameter_mappings || []), newMapping]
                              }
                            };
                            setNewDataSources(updated);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Parameter
                        </Button>
                      </div>

                      {source.api_config?.parameter_mappings?.length > 0 && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                            <AlertCircle className="w-3 h-3 inline mr-1" />
                            <strong>Example:</strong> If your URL is <code>http://api.com/races/{'{raceId}'}</code>,
                            add a mapping where placeholder is "raceId" and query param is "id".
                            Then calling <code>/api/your-endpoint?id=ND_393</code> will fetch from <code>http://api.com/races/ND_393</code>
                          </p>
                        </div>
                      )}

                      {source.api_config?.parameter_mappings?.map((mapping: any, mappingIndex: number) => (
                        <Card key={mappingIndex} className="p-3 relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = [...newDataSources];
                              const newMappings = updated[actualIndex].api_config.parameter_mappings.filter((_: any, i: number) => i !== mappingIndex);
                              updated[actualIndex] = {
                                ...updated[actualIndex],
                                api_config: { ...updated[actualIndex].api_config, parameter_mappings: newMappings }
                              };
                              setNewDataSources(updated);
                            }}
                            className="absolute top-2 right-2"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <div className="grid grid-cols-3 gap-2 pr-8">
                            <div className="space-y-2">
                              <Label className="text-xs">Query Parameter</Label>
                              <Input
                                value={mapping.queryParam || ''}
                                onChange={(e) => {
                                  const updated = [...newDataSources];
                                  const newMappings = [...(updated[actualIndex].api_config.parameter_mappings || [])];
                                  newMappings[mappingIndex] = { ...mapping, queryParam: e.target.value };
                                  updated[actualIndex] = {
                                    ...updated[actualIndex],
                                    api_config: { ...updated[actualIndex].api_config, parameter_mappings: newMappings }
                                  };
                                  setNewDataSources(updated);
                                }}
                                placeholder="id"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">URL Placeholder</Label>
                              <Input
                                value={mapping.urlPlaceholder || ''}
                                onChange={(e) => {
                                  const updated = [...newDataSources];
                                  const newMappings = [...(updated[actualIndex].api_config.parameter_mappings || [])];
                                  newMappings[mappingIndex] = { ...mapping, urlPlaceholder: e.target.value };
                                  updated[actualIndex] = {
                                    ...updated[actualIndex],
                                    api_config: { ...updated[actualIndex].api_config, parameter_mappings: newMappings }
                                  };
                                  setNewDataSources(updated);
                                }}
                                placeholder="raceId"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Required?</Label>
                              <div className="flex items-center h-9">
                                <input
                                  type="checkbox"
                                  checked={mapping.required || false}
                                  onChange={(e) => {
                                    const updated = [...newDataSources];
                                    const newMappings = [...(updated[actualIndex].api_config.parameter_mappings || [])];
                                    newMappings[mappingIndex] = { ...mapping, required: e.target.checked };
                                    updated[actualIndex] = {
                                      ...updated[actualIndex],
                                      api_config: { ...updated[actualIndex].api_config, parameter_mappings: newMappings }
                                    };
                                    setNewDataSources(updated);
                                  }}
                                  className="w-4 h-4"
                                />
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Test Parameters Section for APIs with dynamic parameters */}
                    {source.api_config?.parameter_mappings && source.api_config.parameter_mappings.length > 0 && (
                      <div className="space-y-3 pt-3 border-t">
                        <div>
                          <Label>Test Parameters</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Provide values for parameters to test the connection
                          </p>
                        </div>

                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <p className="text-xs text-yellow-700 dark:text-yellow-300">
                            <AlertCircle className="w-3 h-3 inline mr-1" />
                            This data source uses dynamic parameters. Provide test values below to discover fields.
                          </p>
                        </div>

                        {source.api_config.parameter_mappings.map((mapping: any, mappingIdx: number) => (
                          <div key={mappingIdx} className="space-y-2">
                            <Label className="text-sm">
                              {mapping.queryParam}
                              {mapping.required && <span className="text-red-500 ml-1">*</span>}
                              {mapping.required && <span className="text-xs text-muted-foreground ml-2">(required)</span>}
                            </Label>
                            <Input
                              value={testParams[actualIndex]?.[mapping.queryParam] || ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setTestParams((prev: Record<number, Record<string, string>>) => ({
                                  ...prev,
                                  [actualIndex]: {
                                    ...prev[actualIndex],
                                    [mapping.queryParam]: e.target.value
                                  }
                                }));
                              }}
                              placeholder={`e.g., value for {${mapping.urlPlaceholder}}`}
                              className={mapping.required && !testParams[actualIndex]?.[mapping.queryParam] ? 'border-red-500' : ''}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Test Connection Button for API */}
                    <div className="pt-3 border-t">
                      <Button
                        variant="outline"
                        onClick={() => testAPIConnection(actualIndex)}
                        disabled={!source.api_config?.url || testLoading[actualIndex]}
                      >
                        {testLoading[actualIndex] ? 'Testing...' : 'Test Connection'}
                      </Button>

                      {testResults[actualIndex] && (
                        <div className={`mt-3 p-3 rounded-lg border ${
                          testResults[actualIndex].success
                            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                        }`}>
                          <p className={`text-sm font-medium ${
                            testResults[actualIndex].success
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-red-700 dark:text-red-300'
                          }`}>
                            {testResults[actualIndex].success ? '✓' : '✗'}
                            {' '}
                            {testResults[actualIndex].success ? testResults[actualIndex].message : (testResults[actualIndex].error || testResults[actualIndex].message)}
                          </p>
                          {testResults[actualIndex].fields && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Found {testResults[actualIndex].fields.length} fields:</p>
                              <div className="flex flex-wrap gap-1">
                                {testResults[actualIndex].fields.map((field: string) => (
                                  <Badge key={field} variant="secondary" className="text-xs">
                                    {field}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* RSS Configuration */}
                {source.type === 'rss' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>RSS Feed URL <span className="text-red-500">*</span></Label>
                      <Input
                        value={source.rss_config?.url || ''}
                        onChange={(e) => {
                          const updated = [...newDataSources];
                          updated[actualIndex] = {
                            ...updated[actualIndex],
                            rss_config: { ...updated[actualIndex].rss_config, url: e.target.value }
                          };
                          setNewDataSources(updated);
                        }}
                        placeholder="https://example.com/feed.xml"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Update Frequency</Label>
                      <Select
                        value={source.rss_config?.update_frequency || '15min'}
                        onValueChange={(value) => {
                          const updated = [...newDataSources];
                          updated[actualIndex] = {
                            ...updated[actualIndex],
                            rss_config: { ...updated[actualIndex].rss_config, update_frequency: value }
                          };
                          setNewDataSources(updated);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5min">Every 5 minutes</SelectItem>
                          <SelectItem value="15min">Every 15 minutes</SelectItem>
                          <SelectItem value="30min">Every 30 minutes</SelectItem>
                          <SelectItem value="1hour">Every hour</SelectItem>
                          <SelectItem value="6hours">Every 6 hours</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Test RSS Feed Button */}
                    <div className="pt-3 border-t">
                      <Button
                        variant="outline"
                        onClick={() => testRSSFeed(actualIndex)}
                        disabled={!source.rss_config?.url || testLoading[actualIndex]}
                      >
                        {testLoading[actualIndex] ? 'Testing...' : 'Test RSS Feed'}
                      </Button>

                      {testResults[actualIndex] && (
                        <div className={`mt-3 p-3 rounded-lg border ${
                          testResults[actualIndex].success
                            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                        }`}>
                          <p className={`text-sm font-medium ${
                            testResults[actualIndex].success
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-red-700 dark:text-red-300'
                          }`}>
                            {testResults[actualIndex].success ? '✓' : '✗'}
                            {' '}
                            {testResults[actualIndex].success ? testResults[actualIndex].message : (testResults[actualIndex].error || testResults[actualIndex].message)}
                          </p>
                          {testResults[actualIndex].fields && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Available RSS fields:</p>
                              <div className="flex flex-wrap gap-1">
                                {testResults[actualIndex].fields.map((field: string) => (
                                  <Badge key={field} variant="secondary" className="text-xs">
                                    {field}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* File Configuration */}
                {source.type === 'file' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>File Source</Label>
                      <Select
                        value={source.file_config?.source || 'url'}
                        onValueChange={(value) => {
                          const updated = [...newDataSources];
                          updated[actualIndex] = {
                            ...updated[actualIndex],
                            file_config: { ...updated[actualIndex].file_config, source: value }
                          };
                          setNewDataSources(updated);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="url">URL</SelectItem>
                          <SelectItem value="upload">Upload</SelectItem>
                          <SelectItem value="path">Server Path</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {source.file_config?.source === 'url' && (
                      <div className="space-y-2">
                        <Label>File URL <span className="text-red-500">*</span></Label>
                        <Input
                          value={source.file_config?.url || ''}
                          onChange={(e) => {
                            const updated = [...newDataSources];
                            updated[actualIndex] = {
                              ...updated[actualIndex],
                              file_config: { ...updated[actualIndex].file_config, url: e.target.value }
                            };
                            setNewDataSources(updated);
                          }}
                          placeholder="https://example.com/data.csv"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>File Format</Label>
                      <Select
                        value={source.file_config?.format || 'csv'}
                        onValueChange={(value) => {
                          const updated = [...newDataSources];
                          updated[actualIndex] = {
                            ...updated[actualIndex],
                            file_config: { ...updated[actualIndex].file_config, format: value }
                          };
                          setNewDataSources(updated);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="xml">XML</SelectItem>
                          <SelectItem value="excel">Excel (XLSX)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Database Configuration */}
                {source.type === 'database' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Database Type</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {['mysql', 'postgresql', 'mssql'].map(dbType => (
                          <Card
                            key={dbType}
                            className={`p-4 cursor-pointer transition-colors ${
                              source.database_config?.dbType === dbType
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => {
                              const updated = [...newDataSources];
                              updated[actualIndex] = {
                                ...updated[actualIndex],
                                database_config: { ...updated[actualIndex].database_config, dbType }
                              };
                              setNewDataSources(updated);
                            }}
                          >
                            <div className="text-center">
                              <Database className="w-6 h-6 mx-auto mb-2" />
                              <div className="text-sm font-medium">
                                {dbType.toUpperCase()}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {source.database_config?.dbType && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          Database connections and queries will be configured in a later step after saving this data source.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            These data sources will be saved to your database when you complete the wizard.
          </p>
        </div>
      </div>
    );
  };

  const renderRelationships = () => {
    const addRelationship = () => {
      if (newRelationship.sourceId && newRelationship.targetId && newRelationship.joinField) {
        setFormData({
          ...formData,
          relationships: [
            ...(formData.relationships || []),
            {
              sourceId: newRelationship.sourceId,
              targetId: newRelationship.targetId,
              joinType: newRelationship.joinType || 'inner',
              joinField: newRelationship.joinField
            }
          ]
        });
        setNewRelationship({});
      }
    };

    const removeRelationship = (index: number) => {
      setFormData({
        ...formData,
        relationships: formData.relationships?.filter((_, i) => i !== index)
      });
    };

    const sources = formData.dataSources || [];

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Define how data sources should be joined together (optional for single source agents)
        </p>

        {/* Existing Relationships */}
        {formData.relationships && formData.relationships.length > 0 && (
          <div className="space-y-2">
            {formData.relationships.map((rel, index) => {
              const sourceSource = sources.find(s => s.id === rel.sourceId);
              const targetSource = sources.find(s => s.id === rel.targetId);
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                >
                  <Link2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm flex-1">
                    <span className="font-medium">{sourceSource?.name}</span>
                    {' '}→{' '}
                    <span className="font-medium">{targetSource?.name}</span>
                    {' '}on{' '}
                    <code className="bg-background px-1 rounded">{rel.joinField}</code>
                    {' '}({rel.joinType})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRelationship(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add New Relationship */}
        {sources.length >= 2 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Label>Add New Relationship</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="rel-source" className="text-xs">Source</Label>
                  <Select
                    value={newRelationship.sourceId}
                    onValueChange={(value) => setNewRelationship({ ...newRelationship, sourceId: value })}
                  >
                    <SelectTrigger id="rel-source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rel-target" className="text-xs">Target</Label>
                  <Select
                    value={newRelationship.targetId}
                    onValueChange={(value) => setNewRelationship({ ...newRelationship, targetId: value })}
                  >
                    <SelectTrigger id="rel-target">
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rel-join-type" className="text-xs">Join Type</Label>
                  <Select
                    value={newRelationship.joinType}
                    onValueChange={(value: 'inner' | 'left' | 'right') => setNewRelationship({ ...newRelationship, joinType: value })}
                  >
                    <SelectTrigger id="rel-join-type">
                      <SelectValue placeholder="Inner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inner">Inner Join</SelectItem>
                      <SelectItem value="left">Left Join</SelectItem>
                      <SelectItem value="right">Right Join</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rel-field" className="text-xs">Join Field</Label>
                  <Input
                    id="rel-field"
                    value={newRelationship.joinField || ''}
                    onChange={(e) => setNewRelationship({ ...newRelationship, joinField: e.target.value })}
                    placeholder="e.g., id"
                  />
                </div>
              </div>
              <Button onClick={addRelationship} size="sm" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Relationship
              </Button>
            </CardContent>
          </Card>
        )}

        {sources.length < 2 && (
          <div className="p-4 text-center text-sm text-muted-foreground bg-muted rounded-lg">
            Add at least 2 data sources to create relationships
          </div>
        )}
      </div>
    );
  };

  // Handler for testing data sources in OutputFormat step
  const handleTestDataSource = async (source: any) => {
    try {
      let fields: string[] = [];
      let responseData: any = null;

      // First, fetch the full data source from the database if we only have a reference
      let fullSource = source;
      const sourceDbId = source.feedId || source.id;
      if (sourceDbId && !source.config && !source.api_config && !source.rss_config) {
        const { data: dbSource, error } = await supabase
          .from('data_sources')
          .select('*')
          .eq('id', sourceDbId)
          .single();

        if (error) {
          throw new Error(`Failed to fetch data source: ${error.message}`);
        }

        if (dbSource) {
          const ds = dbSource as any;
          fullSource = {
            ...source,
            type: ds.type,
            config: ds.api_config || ds.rss_config || ds.file_config || ds.database_config,
            api_config: ds.api_config,
            rss_config: ds.rss_config,
            file_config: ds.file_config,
            database_config: ds.database_config
          };
        }
      }

      // Handle different possible structures for API config (matching nova-old)
      let apiConfig: any = null;

      // For API sources, make real API calls
      if (fullSource.type === 'api') {
        // Check different possible locations for API configuration
        if (fullSource.config && typeof fullSource.config === 'object') {
          // If config is an object, it might be the API config directly
          if ('url' in fullSource.config) {
            apiConfig = fullSource.config;
          }
          // Or it might be nested under api_config
          else if ('api_config' in fullSource.config && fullSource.config.api_config) {
            apiConfig = fullSource.config.api_config;
          }
        }
        // Check if api_config is at root level
        else if (fullSource.api_config) {
          apiConfig = fullSource.api_config;
        }
        // Check if URL is at root level (legacy structure)
        else if ('url' in fullSource) {
          apiConfig = {
            url: fullSource.url,
            method: fullSource.method || 'GET',
            headers: fullSource.headers || {}
          };
        }

        if (!apiConfig || !apiConfig.url) {
          throw new Error(`API URL not found for ${fullSource.name}. Please check the data source configuration.`);
        }

        // Build headers including authentication
        const headers: Record<string, string> = { ...(apiConfig.headers || {}) };

        // Add authentication headers if configured
        if (apiConfig.auth_type === 'bearer' && apiConfig.bearer_token) {
          headers['Authorization'] = `Bearer ${apiConfig.bearer_token}`;
        } else if (apiConfig.auth_type === 'api_key_header' && apiConfig.api_key_header && apiConfig.api_key_value) {
          headers[apiConfig.api_key_header] = apiConfig.api_key_value;
        }

        // Build the test URL with params
        let testUrl = apiConfig.url;
        if (apiConfig.params && Object.keys(apiConfig.params).length > 0) {
          const params = new URLSearchParams(apiConfig.params);
          testUrl += (testUrl.includes('?') ? '&' : '?') + params.toString();
        }

        // Use fetchViaProxy for the API request
        const result = await fetchViaProxy(testUrl, {
          method: apiConfig.method || 'GET',
          headers,
          body: apiConfig.body
        });

        // The data from fetchViaProxy is in result.data
        let data = result.data;

        // Parse JSON if it's a string
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            console.warn('Response is not JSON:', e);
            throw new Error('API returned non-JSON response');
          }
        }

        // Store the full response data
        responseData = data;

        // Navigate to the data path if specified
        let targetData = data;
        const dataPath = apiConfig.data_path || apiConfig.dataPath;
        if (dataPath) {
          const pathParts = dataPath.split('.');
          for (const part of pathParts) {
            if (targetData && typeof targetData === 'object' && part in targetData) {
              targetData = targetData[part];
            } else {
              console.warn(`Data path "${dataPath}" not found in response`);
              break;
            }
          }
        }

        // Extract fields from the response
        if (Array.isArray(targetData) && targetData.length > 0) {
          const firstItem = targetData[0];
          if (typeof firstItem === 'object' && firstItem !== null) {
            fields = Object.keys(firstItem).filter(key =>
              !key.startsWith('_') && !key.startsWith('$')
            );
          }
        } else if (typeof targetData === 'object' && targetData !== null) {
          fields = Object.keys(targetData).filter(key =>
            !key.startsWith('_') && !key.startsWith('$')
          );
        }
      } else if (fullSource.type === 'rss') {
        // RSS feeds have standard fields
        fields = ['title', 'description', 'link', 'pubDate', 'guid', 'author', 'category', 'content'];
        responseData = {
          items: [
            {
              title: 'RSS Item 1',
              description: 'RSS Description 1',
              link: 'https://example.com/rss/1',
              pubDate: new Date().toISOString(),
              guid: 'rss-1',
              author: 'RSS Author',
              category: 'RSS Category'
            },
            {
              title: 'RSS Item 2',
              description: 'RSS Description 2',
              link: 'https://example.com/rss/2',
              pubDate: new Date().toISOString(),
              guid: 'rss-2',
              author: 'RSS Author 2',
              category: 'News'
            }
          ]
        };
      } else if (fullSource.type === 'database') {
        // Database sources need to be synced first
        throw new Error('Database field discovery requires the data source to be synced first');
      } else {
        // If we got here, the source type is not recognized or not supported for testing
        throw new Error(`Unable to test data source "${fullSource.name}". Source type "${fullSource.type || 'unknown'}" is not supported or API configuration is missing.`);
      }

      // Store sample data (full response object with nested arrays)
      setSampleData((prev: Record<string, any>) => ({
        ...prev,
        [source.id]: responseData
      }));

      // Update the source with discovered fields
      setFormData((prev: Partial<Agent>) => ({
        ...prev,
        dataSources: prev.dataSources?.map((ds: AgentDataSource) =>
          ds.id === source.id
            ? { ...ds, fields }
            : ds
        )
      }));

      return { fields, data: responseData };
    } catch (error) {
      console.error('Failed to test data source:', error);
      throw error;
    }
  };

  const renderOutputFormat = () => {
    return (
      <OutputFormatStep
        formData={formData}
        setFormData={setFormData}
        sampleData={sampleData}
        onTestDataSource={handleTestDataSource}
        isCreateMode={!editAgent}
      />
    );
  };

  const renderTransformations = () => {
    return (
      <TransformationStep
        formData={formData}
        setFormData={setFormData}
        sampleData={sampleData}
      />
    );
  };


  const renderReview = () => {
    const IconComponent = formData.dataType ? dataTypeIcons[formData.dataType] : null;

    return (
      <div className="space-y-4">
        {/* Deployment Settings */}
        <div className="space-y-4">
          <h3 className="font-medium">Deployment Settings</h3>

          <div>
            <Label htmlFor="review-name">Agent Name *</Label>
            <Input
              id="review-name"
              value={formData.name || ''}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                // Auto-generate slug if it's empty or matches the previous auto-generated slug
                if (!formData.slug || formData.slug === generateSlugFromName(formData.name || '')) {
                  setFormData(prev => ({ ...prev, slug: generateSlugFromName(e.target.value) }));
                }
              }}
              placeholder="e.g., Breaking News Feed"
            />
          </div>

          <div>
            <Label htmlFor="review-slug">URL Slug *</Label>
            <div className="space-y-2">
              <Input
                id="review-slug"
                value={formData.slug || ''}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="my-api-endpoint"
              />
              {formData.slug && (
                <div className="bg-muted p-2 rounded text-sm">
                  <span className="text-muted-foreground">Your API will be available at:</span>{' '}
                  <code className="text-foreground">/api/{formData.slug}</code>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="review-environment">Environment</Label>
            <Select
              value={formData.environment || 'production'}
              onValueChange={(value) => setFormData({ ...formData, environment: value as 'production' | 'staging' | 'development' })}
            >
              <SelectTrigger id="review-environment">
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="development">Development</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="review-auto-start"
                checked={formData.autoStart !== false}
                onCheckedChange={(checked) => setFormData({ ...formData, autoStart: checked })}
              />
              <Label htmlFor="review-auto-start" className="cursor-pointer">
                Auto-start endpoint after deployment
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="review-generate-docs"
                checked={formData.generateDocs !== false}
                onCheckedChange={(checked) => setFormData({ ...formData, generateDocs: checked })}
              />
              <Label htmlFor="review-generate-docs" className="cursor-pointer">
                Generate API documentation
              </Label>
            </div>
          </div>
        </div>

        {/* Configuration Summary */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Configuration Summary
            </h4>

            {/* Basic Info */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Agent Name</p>
              <p className="font-medium">{formData.icon} {formData.name}</p>
              {formData.description && (
                <p className="text-sm text-muted-foreground mt-1">{formData.description}</p>
              )}
            </div>

            {/* URL Slug */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">URL Slug</p>
              <code className="text-sm bg-muted px-2 py-1 rounded">/api/{formData.slug || formData.name?.toLowerCase().replace(/\s+/g, '-')}</code>
            </div>

            {/* Environment & Deployment */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Environment</p>
                <p className="font-medium capitalize">{formData.environment || 'production'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Auto-start</p>
                <p className="font-medium">{formData.autoStart ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Generate Docs</p>
                <p className="font-medium">{formData.generateDocs ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <p className="font-medium">{formData.status}</p>
              </div>
            </div>

            {/* Data Type */}
            {formData.dataType && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Data Type</p>
                <div className="flex items-center gap-2">
                  {IconComponent && <IconComponent className="w-4 h-4" />}
                  <span className="font-medium">{formData.dataType}</span>
                </div>
              </div>
            )}

            {/* Data Sources */}
            {formData.dataSources && formData.dataSources.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Data Sources</p>
                <div className="flex flex-wrap gap-2">
                  {formData.dataSources.map(source => (
                    <Badge key={source.id} variant="outline">
                      {source.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Relationships */}
            {formData.relationships && formData.relationships.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Data Relationships</p>
                <p className="text-sm">{formData.relationships.length} relationship(s) defined</p>
              </div>
            )}

            {/* Output Format */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Output Format</p>
                <p className="font-medium">{formData.format}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Cache Duration</p>
                <p className="font-medium">{formData.cache}</p>
              </div>
            </div>

            {/* Field Mappings */}
            {formData.fieldMappings && formData.fieldMappings.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Field Mappings</p>
                <p className="text-sm">{formData.fieldMappings.length} field(s) mapped</p>
              </div>
            )}

            {/* Transformations */}
            {formData.transforms && formData.transforms.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Transformations</p>
                <div className="flex flex-wrap gap-2">
                  {formData.transforms.map((t, i) => (
                    <Badge key={i} variant="outline" className="capitalize">
                      {t.type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Security */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Security</p>
              <div className="space-y-1 text-sm">
                <p>Authentication: {formData.requiresAuth ? formData.auth : 'None'}</p>
              </div>
            </div>

            {/* Generated URL */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Generated Endpoint</p>
              <code className="text-xs bg-muted p-2 rounded block break-all">
                {window.location.origin}/api/{formData.slug || formData.name?.toLowerCase().replace(/\s+/g, '-')}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'basic':
        return 'Basic Information';
      case 'dataType':
        return 'Data Type';
      case 'dataSources':
        return 'Data Sources';
      case 'configureNewSources':
        return 'Configure New Sources';
      case 'relationships':
        return 'Data Relationships';
      case 'outputFormat':
        return 'Output Format';
      case 'transformations':
        return 'Transformations';
      case 'security':
        return 'Security';
      case 'review':
        return 'Review & Create';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'basic':
        return 'Give your agent a name and description';
      case 'dataType':
        return 'Choose the category of data to work with';
      case 'dataSources':
        return 'Select specific feeds to aggregate';
      case 'configureNewSources':
        return 'Configure connection details for new data sources';
      case 'relationships':
        return 'Define how sources relate to each other';
      case 'outputFormat':
        return 'Configure the output format and field mappings';
      case 'transformations':
        return 'Add optional data transformations';
      case 'security':
        return 'Configure authentication and caching';
      case 'review':
        return 'Review your configuration before creating';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => { if (!isOpen) handleClose(); }}>
      <DialogContent
        className="max-w-90vw sm:max-w-90vw max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e: Event) => {
          // Prevent closing on overlay click in create mode
          if (!editAgent) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle>
                {editAgent ? 'Edit Agent' : 'Create New Agent'}
              </DialogTitle>
              <DialogDescription>
                {getStepDescription()}
              </DialogDescription>
            </div>
            {editAgent && (
              <Button onClick={() => handleSave(false)} size="sm" className="ml-4 mr-4">
                <Check className="w-4 h-4 mr-2" />
                Save
              </Button>
            )}
          </div>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="min-h-[400px]">
          <h3 className="mb-4">{getStepTitle()}</h3>
          {currentStep === 'basic' && renderBasicInfo()}
          {currentStep === 'dataType' && renderDataType()}
          {currentStep === 'dataSources' && renderDataSources()}
          {currentStep === 'configureNewSources' && renderConfigureNewSources()}
          {currentStep === 'relationships' && renderRelationships()}
          {currentStep === 'outputFormat' && renderOutputFormat()}
          {currentStep === 'transformations' && renderTransformations()}
          {currentStep === 'security' && (
            <SecurityStep
              ref={securityStepRef}
              formData={formData}
              setFormData={setFormData}
              agentId={editAgent?.id}
            />
          )}
          {currentStep === 'review' && renderReview()}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {currentStepIndex < steps.length - 1 ? (
              <Button onClick={handleNext} disabled={!isStepValid() || isSavingDataSources}>
                {isSavingDataSources ? 'Saving...' : 'Next'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={!isStepValid()}>
                <Check className="w-4 h-4 mr-2" />
                {editAgent ? 'Save Changes' : 'Create Agent'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
