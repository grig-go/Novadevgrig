import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Button,
  Intent,
  Icon,
  Tag,
  NonIdealState,
  Callout,
  Divider,
  Collapse,
  Switch,
  Tooltip,
  NumericInput
} from '@blueprintjs/core';
import { JsonFieldMapping } from '../../../types/jsonMapping.types';
import { extractFields } from '../utils/fieldExtraction';

const styles = {
  mappingContainer: {
    display: 'flex',
    gap: 20,
    minHeight: 600,
    position: 'relative' as const
  },
  
  sourcePanel: {
    flex: '0 0 45%',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const
  },
  
  outputPanel: {
    flex: '0 0 45%',
    position: 'sticky' as const,
    top: 20,
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const
  },
  
  panelContent: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '10px'
  },
  
  floatingOutputPanel: {
    position: 'fixed' as const,
    right: 20,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '400px',
    maxHeight: '70vh',
    zIndex: 1000,
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
  },
  
  dropZone: {
    padding: 10,
    margin: '8px 4px',
    borderRadius: 4,
    minHeight: 60,
    transition: 'all 0.2s ease'
  },
  
  dropZoneActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    transform: 'scale(1.02)'
  },
  
  fieldItem: {
    padding: '6px 10px',
    margin: '4px 2px',
    borderRadius: 3,
    cursor: 'grab',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    transition: 'all 0.2s ease'
  },
  
  miniMap: {
    position: 'fixed' as const,
    bottom: 20,
    right: 20,
    width: 200,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 4,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }
};

interface FieldMappingCanvasProps {
  sourceSelection: any;
  outputTemplate: any;
  mappings: JsonFieldMapping[];
  transformations: any[];
  sampleData: Record<string, any>;
  onChange: (mappings: JsonFieldMapping[]) => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface SourceField {
  path: string;
  name: string;
  type: string;
  value?: any;
  isMetadata?: boolean;
  category?: string;
  sourceId: string;
  sourceName: string;
  hasWildcard?: boolean;
  arrayLength?: number;
}

// Extended mapping type that stores configuration in the object
interface MappingWithConfig extends JsonFieldMapping {
  arrayConfig?: string; // Store as JSON string to ensure complete isolation
}

export const FieldMappingCanvas: React.FC<FieldMappingCanvasProps> = ({
  sourceSelection,
  outputTemplate,
  mappings,
  transformations: _transformations,
  sampleData,
  onChange,
  onNext,
  onPrevious
}) => {
  const [draggedField, setDraggedField] = useState<any>(null);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(() => 
    new Set(sourceSelection.sources.map((s: any) => s.id))
  );
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'floating' | 'compact'>('side-by-side');
  const [showMiniMap, setShowMiniMap] = useState(false);
  // Use local state for expanded configs, keyed by mapping ID
  const [expandedConfigs, setExpandedConfigs] = useState<Set<string>>(new Set());
  const [debugMode, setDebugMode] = useState(false); // Enable debug mode
  const canvasRef = useRef<HTMLDivElement>(null);

  // Ensure all mappings have IDs - this is critical!
  const mappingsWithIds = React.useMemo(() => {
    return mappings.map((m, index) => {
      if (!m.id) {
        // Generate a unique ID based on target and index
        const newId = `mapping_${m.targetPath}_${index}_${Date.now()}`;
        if (debugMode) {
          console.log(`[ID FIX] Generated ID for mapping without ID: ${newId} for target: ${m.targetPath}`);
        }
        return { ...m, id: newId };
      }
      return m;
    });
  }, [mappings, debugMode]);

  // Debug logging
  useEffect(() => {
    if (debugMode) {
      console.log('=== FieldMappingCanvas State Debug ===');
      console.log('Mappings:', mappingsWithIds.map(m => ({
        id: m.id,
        targetPath: m.targetPath,
        sourcePath: m.sourcePath,
        arrayConfig: (m as any).arrayConfig ? JSON.parse((m as any).arrayConfig) : null
      })));
      console.log('Expanded Configs Set:', Array.from(expandedConfigs));
      console.log('=====================================');
    }
  }, [mappingsWithIds, expandedConfigs, debugMode]);

  // ============= SAFETY CHECKS =============
  if (!sourceSelection || !sourceSelection.sources || sourceSelection.sources.length === 0) {
    return (
      <div className="field-mapping-canvas" ref={canvasRef}>
        <NonIdealState
          icon="warning-sign"
          title="No Sources Selected"
          description="Please go back and select data sources first."
          action={
            <Button
              text="Go Back"
              icon="arrow-left"
              intent={Intent.PRIMARY}
              onClick={onPrevious}
            />
          }
        />
      </div>
    );
  }

  if (!outputTemplate || !outputTemplate.fields || outputTemplate.fields.length === 0) {
    return (
      <div className="field-mapping-canvas" ref={canvasRef}>
        <NonIdealState
          icon="build"
          title="No Output Fields Defined"
          description="Please go back and define your output structure first."
          action={
            <Button
              text="Go Back"
              icon="arrow-left"
              intent={Intent.PRIMARY}
              onClick={onPrevious}
            />
          }
        />
      </div>
    );
  }

  const getAllSourceFields = (): Record<string, SourceField[]> => {
    const fieldsBySource: Record<string, SourceField[]> = {};
    
    sourceSelection.sources.forEach((source: any) => {
      console.log('Source object:', source); // Add this debug line
      console.log('Has category?', source.category); // Add this debug line

      const fields: SourceField[] = [];
      const processedPaths = new Set<string>(); // Track unique paths per source
      
      // Add metadata fields for this source
      const metadataFields = [
        {
          path: '_source.id',
          name: 'Source ID',
          type: 'string',
          value: source.id,
          isMetadata: true,
          category: 'metadata',
          sourceId: source.id,
          sourceName: source.name
        },
        {
          path: '_source.name',
          name: 'Source Name',
          type: 'string',
          value: source.name,
          isMetadata: true,
          category: 'metadata',
          sourceId: source.id,
          sourceName: source.name
        },
        {
          path: '_source.timestamp',
          name: 'Timestamp',
          type: 'string',
          value: new Date().toISOString(),
          isMetadata: true,
          category: 'metadata',
          sourceId: source.id,
          sourceName: source.name
        },
        {
          path: '_source.category',
          name: 'Source Category',
          type: 'string',
          value: source.category,
          isMetadata: true,
          category: 'metadata',
          sourceId: source.id,
          sourceName: source.name
        }
      ];
      
      // Add metadata fields
      metadataFields.forEach(field => {
        if (!processedPaths.has(field.path)) {
          fields.push(field);
          processedPaths.add(field.path);
        }
      });
      
      // Extract data fields from sample data using the extractFields function
      if (sampleData[source.id]) {
        let dataToAnalyze = sampleData[source.id];
  
        // Navigate to the primary path if specified
        if (source.primaryPath) {
          const parts = source.primaryPath.split('.');
          for (const part of parts) {
            if (dataToAnalyze && typeof dataToAnalyze === 'object') {
              dataToAnalyze = dataToAnalyze[part];
            }
          }
        }
        
        // Use extractFields with wildcard only (no fixed indices for display)
        const extracted = extractFields(dataToAnalyze, '', {
          includeWildcards: true,
          includeFixedIndices: false, // Don't show [0], [1], etc
          maxArrayIndices: 0,
          includeValues: true,
          maxDepth: 10 // Increased to support deeply nested arrays
        });
        
        // Process extracted fields and consolidate to wildcard notation
        extracted.forEach(field => {
          // Skip container types and info messages
          if (field.type === 'info' || field.type === 'array' || field.type === 'object' || field.type === 'array-iterator') {
            return;
          }
          
          // Clean up the path if it starts with [*]. when primaryPath is an array
          let cleanPath = field.path;
          if (source.primaryPath && Array.isArray(dataToAnalyze)) {
            // If the primary path points to an array and the field starts with [*].
            // we should remove it since it's redundant
            if (cleanPath.startsWith('[*].')) {
              cleanPath = cleanPath.substring(4);
            }
          }
          
          // Track if this field has wildcards
          const hasWildcard = cleanPath.includes('[*]');
          
          // Calculate array length if this is an array field
          let arrayLength = undefined;
          if (hasWildcard) {
            // Try to get the array length from the data
            const pathParts = cleanPath.split('[*]')[0].split('.');
            let arrayData = dataToAnalyze;
            
            // If we're already at an array level due to primaryPath, adjust navigation
            if (Array.isArray(dataToAnalyze) && pathParts[0] && dataToAnalyze[0]) {
              arrayData = dataToAnalyze[0];
            }
            
            for (const part of pathParts) {
              if (part && arrayData && typeof arrayData === 'object') {
                arrayData = arrayData[part];
              }
            }
            
            if (Array.isArray(arrayData)) {
              arrayLength = arrayData.length;
            }
          }
          
          // Only add if we haven't seen this path for this source
          if (!processedPaths.has(cleanPath)) {
            const sourceField: SourceField = {
              path: cleanPath,
              name: field.name || cleanPath,
              type: field.type,
              value: field.value,
              category: 'data',
              isMetadata: false,
              sourceId: source.id,
              sourceName: source.name,
              hasWildcard: hasWildcard,
              arrayLength: arrayLength
            };
            
            fields.push(sourceField);
            processedPaths.add(cleanPath);
          }
        });
      }
      
      fieldsBySource[source.id] = fields;
    });
    
    return fieldsBySource;
  };

  const fieldsBySource = getAllSourceFields();

  console.log('FieldMappingCanvas Debug:');
  console.log('Source Selection:', sourceSelection);
  console.log('Fields by Source:', fieldsBySource);
  Object.keys(fieldsBySource).forEach(sourceId => {
    const metadataFields = fieldsBySource[sourceId].filter(f => f.isMetadata);
    console.log(`Source ${sourceId} metadata fields:`, metadataFields.map(f => f.path));
  });

  // ============= DRAG AND DROP HANDLERS =============
  const handleDragStart = (e: React.DragEvent, field: SourceField) => {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'copy';
      // Store the field data in dataTransfer
      e.dataTransfer.setData('application/json', JSON.stringify(field));
    }
    setDraggedField(field);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedField(null);
    setDragOverTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    setDragOverTarget(targetPath);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    setDragOverTarget(null);

    if (!draggedField) return;
    
    // Generate unique ID for this mapping - ensure it's always defined
    const mappingId = `mapping_${targetPath.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${Math.round(Math.random() * 10000)}`;
    
    if (debugMode) {
      console.log(`[DROP] Creating new mapping with ID: ${mappingId}`);
      console.log(`[DROP] Target: ${targetPath}, Source: ${draggedField.path}`);
    }
    
    // Check if this field has arrays (either [*] or [0] notation)
    let sourcePath = draggedField.path;
    let arrayConfig: any = null;
    
    // Check for any array notation: [*], [0], [1], etc.
    if (sourcePath.includes('[')) {
      // Extract array fields
      const arrayFields: string[] = [];
      
      // Match both [*] and [digit] patterns
      const wildcardMatches = sourcePath.match(/(\w+)\[\*\]/g) || [];
      const indexMatches = sourcePath.match(/(\w+)\[\d+\]/g) || [];
      const allMatches = [...wildcardMatches, ...indexMatches];
      
      // Get unique field names
      const fieldSet = new Set<string>();
      allMatches.forEach((match: string) => {
        const fieldName = match.replace(/\[\*\]|\[\d+\]/g, '');
        fieldSet.add(fieldName);
      });
      
      fieldSet.forEach(field => arrayFields.push(field));
      
      if (arrayFields.length > 0) {
        // Create initial configuration
        const indices: Record<string, number> = {};
        
        // Try to extract existing indices from the path
        arrayFields.forEach(field => {
          const regex = new RegExp(`${field}\\[(\\d+)\\]`);
          const match = sourcePath.match(regex);
          if (match) {
            indices[field] = parseInt(match[1]);
          } else {
            // Smart default for away team
            if (field === 'competitors' && targetPath.toLowerCase().includes('away')) {
              indices[field] = 1;
            } else {
              indices[field] = 0;
            }
          }
        });
        
        // Store configuration as JSON string for complete isolation
        arrayConfig = JSON.stringify({
          fields: arrayFields,
          indices: indices,
          expanded: false,
          templatePath: sourcePath.replace(/\[\d+\]/g, '[*]'), // Store template for rebuilding
          useWildcard: sourcePath.includes('[*]'), // Track if this should use wildcard
          mappingMode: sourcePath.includes('[*]') ? 'array' : 'index' // 'array' or 'index'
        });
        
        // Build initial path with indices
        sourcePath = draggedField.path;
        if (sourcePath.includes('[*]')) {
          // Replace wildcards with indices
          Object.entries(indices).forEach(([field, index]) => {
            sourcePath = sourcePath.replace(`${field}[*]`, `${field}[${index}]`);
          });
        }
        // If already has indices, use as-is
      }
    }
    
    // Create new mapping
    const newMapping: MappingWithConfig = {
      id: mappingId,
      sourceId: draggedField.sourceId,
      sourceName: draggedField.sourceName,
      sourcePath: sourcePath,
      targetPath: targetPath,
      arrayConfig: arrayConfig
    };
    
    const updatedMappings = mappingsWithIds.filter(m => 
      !(m.targetPath === targetPath && m.sourceId === draggedField.sourceId)
    );
    
    // Add the new mapping
    updatedMappings.push(newMapping);
    
    onChange(updatedMappings);
    setDraggedField(null);
  };
  
  const updateMappingPath = (mappingId: string, fieldName: string, newIndex: number) => {
    if (debugMode) {
      console.log(`[UPDATE INDEX] Mapping: ${mappingId}, Field: ${fieldName}, New Index: ${newIndex}`);
    }
    
    const updatedMappings = mappingsWithIds.map(m => {
      if (m.id === mappingId) {
        const mapping = m as MappingWithConfig;
        
        if (debugMode) {
          console.log(`[UPDATE INDEX] Found mapping:`, {
            id: mapping.id,
            targetPath: mapping.targetPath,
            currentPath: mapping.sourcePath
          });
        }
        
        // Parse the stored configuration
        if (mapping.arrayConfig) {
          const config = JSON.parse(mapping.arrayConfig);
          const oldIndex = config.indices[fieldName];
          config.indices[fieldName] = newIndex;
          
          // Get the template path or reconstruct it
          let templatePath = config.templatePath || mapping.sourcePath.replace(/\[\d+\]/g, '[*]');
          
          // Rebuild the path with new indices
          let newPath = templatePath;
          Object.entries(config.indices).forEach(([field, index]) => {
            newPath = newPath.replace(`${field}[*]`, `${field}[${index}]`);
          });
          
          if (debugMode) {
            console.log(`[UPDATE INDEX] Changed ${fieldName} from ${oldIndex} to ${newIndex}`);
            console.log(`[UPDATE INDEX] New path: ${newPath}`);
            console.log(`[UPDATE INDEX] All indices:`, config.indices);
          }
          
          return {
            ...mapping,
            sourcePath: newPath,
            arrayConfig: JSON.stringify(config)
          };
        }
      }
      return m;
    });
    
    onChange(updatedMappings);
  };
  
  const toggleMappingExpanded = (mappingId: string) => {
    if (debugMode) {
      console.log(`[TOGGLE] Before - Mapping ID: ${mappingId}, Currently expanded:`, expandedConfigs.has(mappingId));
    }
    
    setExpandedConfigs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mappingId)) {
        newSet.delete(mappingId);
      } else {
        newSet.add(mappingId);
      }
      
      if (debugMode) {
        console.log(`[TOGGLE] After - Mapping ID: ${mappingId}, Now expanded:`, newSet.has(mappingId));
        console.log('[TOGGLE] All expanded:', Array.from(newSet));
      }
      
      return newSet;
    });
  };

  const removeMapping = (mappingId: string) => {
    onChange(mappingsWithIds.filter(m => m.id !== mappingId));
    // Also remove from expanded configs
    setExpandedConfigs(prev => {
      const newSet = new Set(prev);
      newSet.delete(mappingId);
      return newSet;
    });
  };

  const toggleSourceExpanded = (sourceId: string) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(sourceId)) {
      newExpanded.delete(sourceId);
    } else {
      newExpanded.add(sourceId);
    }
    setExpandedSources(newExpanded);
  };

  // Get all mappings for a target field
  const getMappingsForTarget = (targetPath: string) => {
    return mappingsWithIds.filter(m => m.targetPath === targetPath);
  };

  // Array Index Configuration Component
  const ArrayIndexConfig: React.FC<{
    mapping: MappingWithConfig;
    config: any;
  }> = ({ mapping, config }) => {
    if (debugMode) {
      console.log(`[RENDER ArrayIndexConfig] Mapping ID: ${mapping.id}`);
      console.log(`[RENDER ArrayIndexConfig] Target: ${mapping.targetPath}`);
      console.log(`[RENDER ArrayIndexConfig] Config:`, config);
    }

    const [mappingMode, setMappingMode] = React.useState<'array' | 'index'>(
      config.mappingMode || 'index'
    );

    const getArrayLength = (fieldName: string): number => {
      try {
        const sourceData = sampleData[mapping.sourceId || ''];
        if (sourceData && sourceData[fieldName]) {
          return Array.isArray(sourceData[fieldName]) ? sourceData[fieldName].length : 10;
        }
      } catch (e) {}
      return 10;
    };

    const handleModeChange = (newMode: 'array' | 'index') => {
      setMappingMode(newMode);

      // Update the mapping to use wildcard or specific index
      const updatedMappings = mappingsWithIds.map(m => {
        if (m.id === mapping.id) {
          let newSourcePath = config.templatePath;

          if (newMode === 'array') {
            // Keep wildcards
            newSourcePath = config.templatePath;
          } else {
            // Replace wildcards with current indices
            config.fields.forEach((field: string) => {
              const index = config.indices[field] || 0;
              newSourcePath = newSourcePath.replace(
                new RegExp(`${field}\\[\\*\\]`, 'g'),
                `${field}[${index}]`
              );
            });
          }

          // Update arrayConfig
          const newConfig = {
            ...config,
            mappingMode: newMode,
            useWildcard: newMode === 'array'
          };

          return {
            ...m,
            sourcePath: newSourcePath,
            arrayConfig: JSON.stringify(newConfig)
          };
        }
        return m;
      });

      onChange(updatedMappings);
    };

    return (
      <div style={{
        marginTop: 4,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 3,
        border: '1px solid #d3d8de'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8
        }}>
          <strong style={{ fontSize: 11 }}>
            Array Configuration - {mapping.targetPath}
          </strong>
          <Button
            minimal
            small
            icon="cross"
            onClick={() => {
              if (debugMode) {
                console.log(`[CLOSE] Closing config for mapping: ${mapping.id}`);
              }
              toggleMappingExpanded(mapping.id);
            }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 11, fontWeight: 'bold' }}>
            Mapping Mode:
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              small
              intent={mappingMode === 'array' ? Intent.PRIMARY : Intent.NONE}
              onClick={() => handleModeChange('array')}
              icon="array"
            >
              Map Entire Array
            </Button>
            <Button
              small
              intent={mappingMode === 'index' ? Intent.PRIMARY : Intent.NONE}
              onClick={() => handleModeChange('index')}
              icon="numerical"
            >
              Map Specific Index
            </Button>
          </div>
          <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
            {mappingMode === 'array'
              ? 'All array items will be mapped using [*] notation'
              : 'Select specific array indices to map'
            }
          </div>
        </div>

        {mappingMode === 'index' && (
          <>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>
              Mapping ID: {mapping.id}
            </div>

            {config.fields.map((field: string) => (
              <div key={`${mapping.id}_${field}_input`} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6
              }}>
                <span style={{ fontSize: 11, minWidth: 100 }}>{field}</span>
                <NumericInput
                  value={config.indices[field] || 0}
                  min={0}
                  max={getArrayLength(field) - 1}
                  onValueChange={(value) => {
                    if (debugMode) {
                      console.log(`[INPUT CHANGE] Mapping: ${mapping.id}, Field: ${field}, Value: ${value}`);
                    }
                    updateMappingPath(mapping.id, field, value);
                  }}
                  style={{ width: 60 }}
                  small
                />
                <span style={{ fontSize: 10, color: '#8a8a8a' }}>
                  max: {getArrayLength(field) - 1}
                </span>
              </div>
            ))}
          </>
        )}

        <div style={{
          marginTop: 8,
          padding: 6,
          backgroundColor: mappingMode === 'array' ? '#e3f2fd' : '#e7f5e7',
          borderRadius: 3,
          fontSize: 11,
          fontFamily: 'monospace',
          wordBreak: 'break-all'
        }}>
          <strong>Path: </strong>{mapping.sourcePath}
        </div>
      </div>
    );
  };

  // Output Fields Panel Component
  const OutputFieldsPanel = ({ isFloating = false }) => (
    <Card style={isFloating ? styles.floatingOutputPanel : {}}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '10px',
        borderBottom: '1px solid #e1e8ed'
      }}>
        <h3 style={{ margin: 0 }}>Output Fields</h3>
        {isFloating && (
          <Button
            minimal
            icon="cross"
            onClick={() => setViewMode('side-by-side')}
          />
        )}
      </div>
      
      <div style={styles.panelContent}>
        {outputTemplate.fields.map((field: any, fieldIndex: number) => {
          const targetMappings = getMappingsForTarget(field.path);
          const hasMappings = targetMappings.length > 0;
          const isDragOver = dragOverTarget === field.path;
          
          return (
            <div
              key={`output_${field.path}_${fieldIndex}`}
              onDragOver={(e) => handleDragOver(e, field.path)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, field.path)}
              style={{
                ...styles.dropZone,
                backgroundColor: isDragOver 
                  ? '#e3f2fd' 
                  : hasMappings 
                    ? '#d4edda' 
                    : '#f8f9fa',
                border: `2px ${isDragOver 
                  ? 'solid #2196f3' 
                  : hasMappings 
                    ? 'solid #28a745' 
                    : 'dashed #dee2e6'}`,
                ...(isDragOver ? styles.dropZoneActive : {})
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: 8 
              }}>
                <div>
                  <strong>{field.name || field.path}</strong>
                  <Tag minimal style={{ marginLeft: 8 }}>{field.type}</Tag>
                  {field.required && (
                    <Tag minimal intent={Intent.DANGER} style={{ marginLeft: 4 }}>
                      Required
                    </Tag>
                  )}
                </div>
              </div>
              
              {targetMappings.length > 0 ? (
                <div style={{ fontSize: 12 }}>
                  {targetMappings.map((mapping: MappingWithConfig) => {
                    // Check if path contains array indices
                    const hasArrays = mapping.sourcePath && mapping.sourcePath.includes('[');
                    const isExpanded = expandedConfigs.has(mapping.id);
                    const config = mapping.arrayConfig ? JSON.parse(mapping.arrayConfig) : null;
                    
                    if (debugMode) {
                      console.log(`[RENDER Mapping] ID: ${mapping.id || 'NO_ID'}, Target: ${mapping.targetPath}, Expanded: ${isExpanded}`);
                    }
                    
                    return (
                      <div key={mapping.id} style={{ 
                        border: debugMode ? '1px dotted blue' : 'none',
                        position: 'relative'
                      }}>
                        {debugMode && mapping.id && (
                          <div style={{ 
                            position: 'absolute', 
                            top: -10, 
                            left: 0, 
                            fontSize: 9, 
                            background: 'yellow',
                            padding: '2px 4px',
                            zIndex: 10
                          }}>
                            ID: {mapping.id.substring(0, 8)}...
                          </div>
                        )}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8,
                          padding: '4px',
                          backgroundColor: 'rgba(255,255,255,0.8)',
                          borderRadius: 3,
                          marginBottom: 4,
                          marginTop: debugMode ? 10 : 0
                        }}>
                          <Icon icon="link" size={10} />
                          <span style={{ flex: 1, fontSize: 11 }}>
                            <strong>{mapping.sourceName}:</strong> {mapping.sourcePath}
                          </span>
                          {hasArrays && (
                            <Button
                              minimal
                              small
                              intent="primary"
                              icon={isExpanded ? "chevron-up" : "array"}
                              onClick={() => {
                                if (debugMode) {
                                  console.log(`[BUTTON CLICK] Mapping ID: ${mapping.id}`);
                                }
                                
                                // If no config exists yet, create it from the path
                                if (!mapping.arrayConfig) {
                                  const arrayFields: string[] = [];
                                  const indices: Record<string, number> = {};
                                  
                                  // Extract fields and indices from current path
                                  const matches = mapping.sourcePath.matchAll(/(\w+)\[(\d+)\]/g);
                                  for (const match of matches) {
                                    arrayFields.push(match[1]);
                                    indices[match[1]] = parseInt(match[2]);
                                  }
                                  
                                  // Create and save config
                                  const newConfig = {
                                    fields: arrayFields,
                                    indices: indices,
                                    templatePath: mapping.sourcePath.replace(/\[\d+\]/g, '[*]')
                                  };
                                  
                                  if (debugMode) {
                                    console.log('[CREATE CONFIG] Creating config for mapping:', mapping.id);
                                    console.log('[CREATE CONFIG] Config:', newConfig);
                                  }
                                  
                                  const updatedMappings = mappingsWithIds.map(m => 
                                    m.id === mapping.id 
                                      ? { ...m, arrayConfig: JSON.stringify(newConfig) }
                                      : m
                                  );
                                  onChange(updatedMappings);
                                }
                                // Toggle expanded state
                                toggleMappingExpanded(mapping.id);
                              }}
                            >
                              {mapping.sourcePath.match(/\[\d+\]/g)?.join('') || '[...]'}
                            </Button>
                          )}
                          <Button
                            minimal
                            small
                            icon="cross"
                            onClick={() => removeMapping(mapping.id)}
                          />
                        </div>
                        
                        {hasArrays && isExpanded && (
                          <ArrayIndexConfig
                            mapping={mapping}
                            config={config || {
                              fields: (() => {
                                const fields: string[] = [];
                                const indices: Record<string, number> = {};
                                const matches = mapping.sourcePath.matchAll(/(\w+)\[(\d+)\]/g);
                                for (const match of matches) {
                                  fields.push(match[1]);
                                  indices[match[1]] = parseInt(match[2]);
                                }
                                if (debugMode) {
                                  console.log('[FALLBACK CONFIG] Creating fallback config for:', mapping.id);
                                }
                                return { fields, indices, templatePath: mapping.sourcePath.replace(/\[\d+\]/g, '[*]') };
                              })()
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ 
                  fontSize: 11, 
                  color: '#8a8a8a',
                  textAlign: 'center',
                  padding: '10px'
                }}>
                  {isDragOver ? 'Drop here to map' : 'Drag a source field here'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
  
  const MiniMap = () => {
    const mappedCount = outputTemplate.fields.filter((f: any) => 
      mappingsWithIds.some((m: any) => m.targetPath === f.path)
    ).length;
    
    const requiredMapped = outputTemplate.fields.filter((f: any) => 
      f.required && mappingsWithIds.some((m: any) => m.targetPath === f.path)
    ).length;
    
    const totalRequired = outputTemplate.fields.filter((f: any) => f.required).length;
    
    return (
      <div style={styles.miniMap}>
        <h5 style={{ margin: '0 0 10px 0' }}>Mapping Progress</h5>
        <div style={{ marginBottom: 8 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            fontSize: 12,
            marginBottom: 4
          }}>
            <span>Overall</span>
            <span>{mappedCount}/{outputTemplate.fields.length}</span>
          </div>
          <div style={{
            height: 8,
            backgroundColor: '#e0e0e0',
            borderRadius: 4,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${(mappedCount / outputTemplate.fields.length) * 100}%`,
              backgroundColor: '#4caf50',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
        
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            fontSize: 12,
            marginBottom: 4
          }}>
            <span>Required</span>
            <span>{requiredMapped}/{totalRequired}</span>
          </div>
          <div style={{
            height: 8,
            backgroundColor: '#e0e0e0',
            borderRadius: 4,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${totalRequired > 0 ? (requiredMapped / totalRequired) * 100 : 0}%`,
              backgroundColor: requiredMapped === totalRequired ? '#4caf50' : '#ff9800',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      </div>
    );
  };

  // Helper function to render source fields
  const renderSourceField = (field: SourceField) => {
    const isMapped = mappingsWithIds.some(
      (m: any) => m.sourceId === field.sourceId && 
           m.sourcePath.replace(/\[\d+\]/g, '[*]') === field.path
    );
    
    const hasArrays = field.path.includes('[*]');
    
    return (
      <div
        key={`${field.sourceId}_${field.path}`}
        draggable
        onDragStart={(e) => handleDragStart(e, field)}        onDragEnd={handleDragEnd}
        style={{
          ...styles.fieldItem,
          backgroundColor: isMapped ? '#d4edda' : '#ffffff',
          border: '1px solid #d3d8de',
        }}
      >
        <Icon icon="drag-handle-vertical" size={10} />
        <span style={{ flex: 1 }}>{field.path}</span>
        {hasArrays && (
          <Tag minimal intent="primary">
            <Icon icon="array" size={8} />
          </Tag>
        )}
        <Tag minimal>{field.type}</Tag>
        {isMapped && <Icon icon="link" size={10} color="#28a745" />}
      </div>
    );
  };

  return (
    <div className="field-mapping-canvas" ref={canvasRef}>
      <Callout intent={Intent.PRIMARY} icon="info-sign" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            Drag fields from sources to output fields. Fields with [*] can be configured with specific indices.
            {debugMode && <strong style={{ color: 'red', marginLeft: 10 }}>DEBUG MODE ON - Check Console</strong>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              minimal
              intent={debugMode ? "danger" : "none"}
              icon="console"
              onClick={() => setDebugMode(!debugMode)}
            >
              Debug
            </Button>
            <Divider />
            <Tooltip content="Side-by-side view">
              <Button
                minimal
                icon="panel-stats"
                active={viewMode === 'side-by-side'}
                onClick={() => setViewMode('side-by-side')}
              />
            </Tooltip>
            <Tooltip content="Floating output panel">
              <Button
                minimal
                icon="application"
                active={viewMode === 'floating'}
                onClick={() => setViewMode('floating')}
              />
            </Tooltip>
            <Divider />
            <Switch
              checked={showMiniMap}
              onChange={(e) => setShowMiniMap((e.target as HTMLInputElement).checked)}
              label="Mini Map"
            />
          </div>
        </div>
      </Callout>

      <div className="mapping-container" style={styles.mappingContainer}>
        {/* Source Fields Panel */}
        <Card style={viewMode === 'floating' ? { flex: '1 1 100%' } : styles.sourcePanel}>
          <h3 style={{ padding: '10px', margin: 0, borderBottom: '1px solid #e1e8ed' }}>
            Source Fields
          </h3>
          <div style={styles.panelContent}>
            {sourceSelection.sources.map((source: any) => {
              const isExpanded = expandedSources.has(source.id);
              const sourceFields = fieldsBySource[source.id] || [];
              
              return (
                <div key={source.id} style={{ marginBottom: 15 }}>
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 10,
                      padding: '8px',
                      backgroundColor: '#f5f8fa',
                      cursor: 'pointer',
                      borderRadius: 4
                    }}
                    onClick={() => toggleSourceExpanded(source.id)}
                  >
                    <Icon icon={isExpanded ? 'chevron-down' : 'chevron-right'} />
                    <Icon icon={
                      source.type === 'api' ? 'cloud' :
                      source.type === 'database' ? 'database' :
                      source.type === 'file' ? 'document' : 'folder-close'
                    } />
                    <span style={{ flex: 1, fontWeight: 600 }}>{source.name}</span>
                    <Tag minimal>{sourceFields.length} fields</Tag>
                  </div>
                  
                  <Collapse isOpen={isExpanded}>
                    <div style={{ padding: '8px 8px 8px 32px' }}>
                      {/* Metadata Fields */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: '#8a8a8a', marginBottom: 4 }}>
                          METADATA
                        </div>
                        {sourceFields
                          .filter(f => f.isMetadata)
                          .map(field => renderSourceField(field))}
                      </div>
                      
                      {/* Data Fields */}
                      <div>
                        <div style={{ fontSize: 11, color: '#8a8a8a', marginBottom: 4 }}>
                          DATA FIELDS
                        </div>
                        {sourceFields
                          .filter(f => !f.isMetadata)
                          .map(field => renderSourceField(field))}
                      </div>
                    </div>
                  </Collapse>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Center Arrow */}
        {viewMode === 'side-by-side' && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Icon icon="arrow-right" size={20} />
          </div>
        )}

        {/* Output Fields Panel */}
        {viewMode === 'side-by-side' && (
          <div style={styles.outputPanel}>
            <OutputFieldsPanel />
          </div>
        )}
      </div>

      {/* Floating Output Panel */}
      {viewMode === 'floating' && <OutputFieldsPanel isFloating={true} />}

      {/* Mini Map */}
      {showMiniMap && <MiniMap />}

      {/* Navigation */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          text="Previous"
          icon="arrow-left"
          onClick={onPrevious}
        />
        <Button
          intent={Intent.PRIMARY}
          text="Next: Preview & Test"
          rightIcon="arrow-right"
          onClick={onNext}
          disabled={mappings.length === 0}
        />
      </div>
    </div>
  );
};

export default FieldMappingCanvas;