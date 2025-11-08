import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import {
  Agent,
  AgentFormat,
  AgentStatus,
  AgentCacheType,
  AgentAuthType,
  AgentDataType,
  AgentDataSource,
  AgentDataRelationship,
  AgentFieldMapping,
  AgentTransform
} from "../types/agents";
import { ChevronLeft, ChevronRight, Check, Plus, X, Vote, TrendingUp, Trophy, Cloud, Newspaper, Link2, Database, Key, AlertCircle } from "lucide-react";
import { Switch } from "./ui/switch";
import { supabase } from "../utils/supabase/client";

interface AgentWizardProps {
  open: boolean;
  onClose: () => void;
  onSave: (agent: Agent, closeDialog?: boolean) => void;
  editAgent?: Agent;
  availableFeeds?: Array<{ id: string; name: string; category: string }>;
}

type WizardStep = 'basic' | 'dataType' | 'dataSources' | 'relationships' | 'outputFormat' | 'transformations' | 'security' | 'review';

const dataTypeCategories: AgentDataType[] = ['Elections', 'Finance', 'Sports', 'Weather', 'News'];

const dataTypeIcons: Record<AgentDataType, any> = {
  'Elections': Vote,
  'Finance': TrendingUp,
  'Sports': Trophy,
  'Weather': Cloud,
  'News': Newspaper
};

export function AgentWizard({ open, onClose, onSave, editAgent, availableFeeds = [] }: AgentWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
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
    itemPath: '',
    fieldMappings: [],
    fixedFields: {},
    transforms: [],
    auth: 'none',
    requiresAuth: false,
    status: 'ACTIVE',
    cache: '15M'
  });

  // State for adding new items in various steps
  const [newRelationship, setNewRelationship] = useState<Partial<AgentDataRelationship>>({});
  const [newMapping, setNewMapping] = useState<Partial<AgentFieldMapping>>({});
  const [newFixedField, setNewFixedField] = useState({ key: '', value: '' });
  const [newTransform, setNewTransform] = useState<Partial<AgentTransform>>({ type: 'filter' });

  // State for fetching data sources from Supabase
  const [availableDataSources, setAvailableDataSources] = useState<Array<{ id: string; name: string; type: string; category: string }>>([]);
  const [loadingDataSources, setLoadingDataSources] = useState(false);

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

  // Update formData when editAgent changes
  useEffect(() => {
    if (editAgent && open) {
      setFormData(editAgent);
      // When editing, start at the review step (Step 8) like nova-old
      setCurrentStep('review');
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
    }
  }, [editAgent, open]);

  const steps: WizardStep[] = ['basic', 'dataType', 'dataSources', 'relationships', 'outputFormat', 'transformations', 'security', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleSave = (closeDialog: boolean = true) => {
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
      dataSources: formData.dataSources || [],
      relationships: formData.relationships || [],
      format: formData.format || 'JSON',
      itemPath: formData.itemPath,
      fieldMappings: formData.fieldMappings || [],
      fixedFields: formData.fixedFields || {},
      transforms: formData.transforms || [],
      auth: formData.auth || 'none',
      apiKey: formData.apiKey,
      requiresAuth: formData.requiresAuth,
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
        return formData.dataSources && formData.dataSources.length > 0;
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

  const renderStepIndicator = () => (
    <div className="space-y-2">
      {editAgent && (
        <p className="text-xs text-center text-muted-foreground">
          Click on any step to navigate
        </p>
      )}
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => editAgent && setCurrentStep(step)}
              disabled={!editAgent}
              title={editAgent ? `Go to step ${index + 1}` : index < currentStepIndex ? `Step ${index + 1} (Completed)` : ''}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all group relative ${
                editAgent ? 'cursor-pointer hover:scale-110 hover:shadow-md' : 'cursor-default'
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
        ))}
      </div>
    </div>
  );

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

    const addDataSource = (sourceId: string, sourceName: string, sourceCategory: string) => {
      const newSource: AgentDataSource = {
        id: `source-${Date.now()}`,
        name: sourceName,
        feedId: sourceId,
        category: sourceCategory as AgentDataType
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
                        onClick={() => isAdded ? null : addDataSource(source.id, source.name, source.category)}
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

  const renderOutputFormat = () => {
    const addFieldMapping = () => {
      if (newMapping.outputField && newMapping.sourceId && newMapping.sourcePath) {
        setFormData({
          ...formData,
          fieldMappings: [
            ...(formData.fieldMappings || []),
            {
              outputField: newMapping.outputField,
              sourceId: newMapping.sourceId,
              sourcePath: newMapping.sourcePath,
              transform: newMapping.transform
            }
          ]
        });
        setNewMapping({});
      }
    };

    const removeFieldMapping = (index: number) => {
      setFormData({
        ...formData,
        fieldMappings: formData.fieldMappings?.filter((_, i) => i !== index)
      });
    };

    const addFixedField = () => {
      if (newFixedField.key && newFixedField.value) {
        setFormData({
          ...formData,
          fixedFields: {
            ...formData.fixedFields,
            [newFixedField.key]: newFixedField.value
          }
        });
        setNewFixedField({ key: '', value: '' });
      }
    };

    const removeFixedField = (key: string) => {
      const updated = { ...formData.fixedFields };
      delete updated[key];
      setFormData({ ...formData, fixedFields: updated });
    };

    const sources = formData.dataSources || [];

    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="format">Output Format *</Label>
          <Select
            value={formData.format}
            onValueChange={(value: AgentFormat) => setFormData({ ...formData, format: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="JSON">JSON</SelectItem>
              <SelectItem value="RSS">RSS 2.0</SelectItem>
              <SelectItem value="ATOM">Atom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(formData.format === 'RSS' || formData.format === 'ATOM') && (
          <>
            <div>
              <Label htmlFor="item-path">Item Generation Path</Label>
              <Input
                id="item-path"
                value={formData.itemPath || ''}
                onChange={(e) => setFormData({ ...formData, itemPath: e.target.value })}
                placeholder="e.g., $.data.items"
              />
              <p className="text-xs text-muted-foreground mt-1">
                JSONPath to the array of items in the source data
              </p>
            </div>

            {/* Fixed Fields for RSS/ATOM */}
            <div className="space-y-2">
              <Label>Fixed Feed Fields</Label>
              <div className="space-y-2">
                {Object.entries(formData.fixedFields || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <code className="text-xs flex-1">{key}: {value}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFixedField(key)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Field name"
                  value={newFixedField.key}
                  onChange={(e) => setNewFixedField({ ...newFixedField, key: e.target.value })}
                />
                <Input
                  placeholder="Value"
                  value={newFixedField.value}
                  onChange={(e) => setNewFixedField({ ...newFixedField, value: e.target.value })}
                />
                <Button onClick={addFixedField} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Field Mappings */}
            <div className="space-y-2">
              <Label>Field Mappings</Label>
              <div className="space-y-2">
                {formData.fieldMappings?.map((mapping, index) => {
                  const source = sources.find(s => s.id === mapping.sourceId);
                  return (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                      <span className="flex-1">
                        <span className="font-medium">{mapping.outputField}</span> ← {source?.name}.{mapping.sourcePath}
                        {mapping.transform && <span className="text-muted-foreground ml-2">| {mapping.transform}</span>}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFieldMapping(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <Card>
                <CardContent className="p-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Output field"
                      value={newMapping.outputField || ''}
                      onChange={(e) => setNewMapping({ ...newMapping, outputField: e.target.value })}
                    />
                    <Select
                      value={newMapping.sourceId}
                      onValueChange={(value) => setNewMapping({ ...newMapping, sourceId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Source" />
                      </SelectTrigger>
                      <SelectContent>
                        {sources.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Source path"
                      value={newMapping.sourcePath || ''}
                      onChange={(e) => setNewMapping({ ...newMapping, sourcePath: e.target.value })}
                    />
                  </div>
                  <Input
                    placeholder="Transform (optional)"
                    value={newMapping.transform || ''}
                    onChange={(e) => setNewMapping({ ...newMapping, transform: e.target.value })}
                  />
                  <Button onClick={addFieldMapping} size="sm" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Field Mapping
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderTransformations = () => {
    const addTransform = () => {
      if (newTransform.type) {
        setFormData({
          ...formData,
          transforms: [
            ...(formData.transforms || []),
            {
              type: newTransform.type,
              config: newTransform.config || {}
            }
          ]
        });
        setNewTransform({ type: 'filter' });
      }
    };

    const removeTransform = (index: number) => {
      setFormData({
        ...formData,
        transforms: formData.transforms?.filter((_, i) => i !== index)
      });
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Add optional transformations to filter, sort, or modify the output data
        </p>

        {/* Existing Transforms */}
        {formData.transforms && formData.transforms.length > 0 && (
          <div className="space-y-2">
            {formData.transforms.map((transform, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div>
                  <Badge variant="outline" className="capitalize">{transform.type}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {JSON.stringify(transform.config)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTransform(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Transform */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <Label>Add Transformation</Label>
            <Select
              value={newTransform.type}
              onValueChange={(value: any) => setNewTransform({ type: value, config: {} })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="filter">Filter</SelectItem>
                <SelectItem value="map">Map</SelectItem>
                <SelectItem value="sort">Sort</SelectItem>
                <SelectItem value="deduplicate">Deduplicate</SelectItem>
                <SelectItem value="extract">Extract</SelectItem>
                <SelectItem value="format">Format</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder='Configuration (JSON): e.g., {"field": "status", "value": "active"}'
              rows={3}
              value={JSON.stringify(newTransform.config || {}, null, 2)}
              onChange={(e) => {
                try {
                  const config = JSON.parse(e.target.value);
                  setNewTransform({ ...newTransform, config });
                } catch (err) {
                  // Invalid JSON, ignore
                }
              }}
            />
            <Button onClick={addTransform} size="sm" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Transformation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSecurity = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="requires-auth"
          checked={formData.requiresAuth || false}
          onCheckedChange={(checked) => setFormData({ ...formData, requiresAuth: checked as boolean })}
        />
        <Label htmlFor="requires-auth" className="cursor-pointer">
          Require authentication to access this feed
        </Label>
      </div>

      {formData.requiresAuth && (
        <>
          <div>
            <Label htmlFor="auth">Authentication Type</Label>
            <Select
              value={formData.auth}
              onValueChange={(value: AgentAuthType) => setFormData({ ...formData, auth: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="basic">Basic Auth</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="api_key">API Key</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.auth === 'api_key' && (
            <div>
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={formData.apiKey || ''}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="Enter API key"
              />
            </div>
          )}
        </>
      )}

      <div>
        <Label htmlFor="cache">Cache Duration</Label>
        <Select
          value={formData.cache}
          onValueChange={(value: AgentCacheType) => setFormData({ ...formData, cache: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OFF">Off</SelectItem>
            <SelectItem value="5M">5 minutes</SelectItem>
            <SelectItem value="15M">15 minutes</SelectItem>
            <SelectItem value="30M">30 minutes</SelectItem>
            <SelectItem value="1H">1 hour</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <div className="flex items-start gap-2">
          <Key className="w-4 h-4 mt-0.5 text-muted-foreground" />
          <div className="text-sm">
            <p className="font-medium mb-1">Security Note</p>
            <p className="text-muted-foreground">
              This agent will be accessible at a generated endpoint. Enable authentication 
              to restrict access and protect sensitive data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

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
      <DialogContent className="max-w-6xl sm:max-w-6xl max-h-[90vh] overflow-y-auto">
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
          {currentStep === 'relationships' && renderRelationships()}
          {currentStep === 'outputFormat' && renderOutputFormat()}
          {currentStep === 'transformations' && renderTransformations()}
          {currentStep === 'security' && renderSecurity()}
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
              <Button onClick={handleNext} disabled={!isStepValid()}>
                Next
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
