import React, { useState, useEffect } from 'react';
import {
  Card,
  HTMLSelect,
  Tag,
  Button,
  NumericInput
} from '@blueprintjs/core';

interface FieldMappingInterfaceProps {
  schema: any;
  dataSources: any[];
  mappings: any[];
  onUpdate: (mappings: any[]) => void;
  sampleData?: Record<string, any>;
}

// Helper to analyze a path and find array levels
function analyzePathForArrays(path: string, sampleData: any): Array<{
  level: number;
  fieldName: string;
  arrayLength: number;
  fullPath: string;
}> {
  if (!sampleData || !path) return [];
  
  const arrays: Array<{ level: number; fieldName: string; arrayLength: number; fullPath: string }> = [];
  const parts = path.split('.');
  let current = sampleData;
  let currentPath = '';
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    currentPath = currentPath ? `${currentPath}.${part}` : part;
    
    if (!current) break;
    
    current = current[part];
    
    if (Array.isArray(current)) {
      arrays.push({
        level: i,
        fieldName: part,
        arrayLength: current.length,
        fullPath: currentPath
      });
      
      // Continue with first item to check for nested arrays
      if (current.length > 0) {
        current = current[0];
      } else {
        break;
      }
    }
  }
  
  return arrays;
}

// Helper to build indexed path from base path and index selections
function buildIndexedPath(basePath: string, indexSelections: Record<string, number>): string {
  const parts = basePath.split('.');
  const indexedParts: string[] = [];
  let currentPath = '';
  
  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}.${part}` : part;
    
    if (indexSelections[currentPath] !== undefined) {
      // This is an array field with a selected index
      indexedParts.push(`${part}[${indexSelections[currentPath]}]`);
    } else {
      indexedParts.push(part);
    }
  }
  
  return indexedParts.join('.');
}

// Component for configuring indices for a single array field
const ArrayIndexSelector: React.FC<{
  fieldName: string;
  arrayLength: number;
  currentIndex: number;
  onChange: (index: number) => void;
  level: number;
}> = ({ fieldName, arrayLength, currentIndex, onChange, level }) => {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 10,
      marginLeft: level * 20,
      marginBottom: 8
    }}>
      <span style={{ minWidth: 150 }}>
        <strong>{fieldName}</strong>
        <Tag minimal style={{ marginLeft: 8 }}>{arrayLength} items</Tag>
      </span>
      
      <NumericInput
        value={currentIndex}
        min={0}
        max={arrayLength - 1}
        onValueChange={(value) => onChange(value)}
        placeholder="Index"
        style={{ width: 80 }}
      />
      
      <span style={{ fontSize: 12, color: '#5c7080' }}>
        (0 to {arrayLength - 1})
      </span>
    </div>
  );
};

export const FieldMappingInterface: React.FC<FieldMappingInterfaceProps> = ({
  schema,
  dataSources,
  mappings,
  onUpdate,
  sampleData
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [localMappings, setLocalMappings] = useState<any[]>(mappings);
  const [arrayConfigs, setArrayConfigs] = useState<Record<string, Record<string, number>>>({});
  const [expandedArrayConfig, setExpandedArrayConfig] = useState<Set<string>>(new Set());

  // Sync local mappings with props
  useEffect(() => {
    setLocalMappings(mappings);
    
    // Initialize array configs from existing mappings
    const configs: Record<string, Record<string, number>> = {};
    mappings.forEach(mapping => {
      if (mapping.index_selections) {
        configs[mapping.target_field] = mapping.index_selections;
      }
    });
    setArrayConfigs(configs);
  }, [mappings]);

  const toggleNode = (path: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  const updateMapping = (targetPath: string, sourceId: string, sourceField: string) => {
    const existingIndex = localMappings.findIndex(m => m.target_field === targetPath);
    
    // Check if this field has arrays
    const arrayInfo = analyzePathForArrays(sourceField, sampleData?.[sourceId]);
    
    // Initialize index selections for arrays (default to 0)
    const indexSelections: Record<string, number> = {};
    arrayInfo.forEach(arr => {
      indexSelections[arr.fullPath] = 0;
    });
    
    const newMapping: any = {
      target_field: targetPath,
      source_id: sourceId,
      source_field: sourceField, // Store the base path without indices
      has_arrays: arrayInfo.length > 0,
      array_info: arrayInfo,
      index_selections: indexSelections
    };
    
    // Build the indexed source path
    if (arrayInfo.length > 0) {
      newMapping.source_path = buildIndexedPath(sourceField, indexSelections);
    }

    let newMappings;
    if (existingIndex >= 0) {
      if (!sourceId || !sourceField) {
        // Remove mapping
        newMappings = localMappings.filter((_, i) => i !== existingIndex);
        // Also remove array config
        const newConfigs = { ...arrayConfigs };
        delete newConfigs[targetPath];
        setArrayConfigs(newConfigs);
      } else {
        // Update mapping
        newMappings = [...localMappings];
        newMappings[existingIndex] = { ...localMappings[existingIndex], ...newMapping };
        // Update array config
        if (newMapping.has_arrays) {
          setArrayConfigs({ ...arrayConfigs, [targetPath]: indexSelections });
        }
      }
    } else if (sourceId && sourceField) {
      // Add new mapping
      newMappings = [...localMappings, newMapping];
      if (newMapping.has_arrays) {
        setArrayConfigs({ ...arrayConfigs, [targetPath]: indexSelections });
      }
    } else {
      return;
    }

    setLocalMappings(newMappings);
    onUpdate(newMappings);
  };

  const updateArrayIndex = (targetPath: string, arrayPath: string, index: number) => {
    const mapping = localMappings.find(m => m.target_field === targetPath);
    if (!mapping) return;
    
    // Update index selection
    const newIndexSelections = {
      ...mapping.index_selections,
      [arrayPath]: index
    };
    
    // Rebuild the indexed path
    const newSourcePath = buildIndexedPath(mapping.source_field, newIndexSelections);
    
    // Update the mapping
    const updatedMapping = {
      ...mapping,
      index_selections: newIndexSelections,
      source_path: newSourcePath
    };
    
    const newMappings = localMappings.map(m => 
      m.target_field === targetPath ? updatedMapping : m
    );
    
    setLocalMappings(newMappings);
    onUpdate(newMappings);
    
    // Update local state
    setArrayConfigs({
      ...arrayConfigs,
      [targetPath]: newIndexSelections
    });
  };

  const getSourceFields = (sourceId: string): string[] => {
    const source = dataSources.find(ds => ds.id === sourceId);
    if (!source) return [];
    
    // Extract fields from sample data, but WITHOUT indices
    if (sampleData?.[sourceId]) {
      const extractFields = (obj: any, prefix = ''): string[] => {
        const fields: string[] = [];
        
        for (const [key, value] of Object.entries(obj)) {
          const fieldPath = prefix ? `${prefix}.${key}` : key;
          
          if (value === null || value === undefined) {
            fields.push(fieldPath);
          } else if (Array.isArray(value)) {
            // Just add the array field name, NOT with indices
            fields.push(fieldPath);
            
            // Also extract fields from first item if it exists
            if (value.length > 0 && typeof value[0] === 'object') {
              // Note: we continue WITHOUT adding [0], just the path
              fields.push(...extractFields(value[0], fieldPath));
            }
          } else if (typeof value === 'object') {
            fields.push(fieldPath);
            fields.push(...extractFields(value, fieldPath));
          } else {
            fields.push(fieldPath);
          }
        }
        
        return fields;
      };
      
      return extractFields(sampleData[sourceId]);
    }
    
    return source.fields || [];
  };

  const renderSchemaNode = (node: any, path: string = '', depth: number = 0) => {
    const fullPath = path ? `${path}.${node.key}` : node.key;
    const mapping = localMappings.find(m => m.target_field === fullPath);
    const isExpanded = expandedNodes.has(fullPath);
    const hasChildren = node.children && node.children.length > 0;
    const showArrayConfig = expandedArrayConfig.has(fullPath);

    return (
      <div key={fullPath} style={{ marginLeft: depth * 20 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px',
          backgroundColor: mapping ? '#e7f5e7' : '#f8f9fa',
          border: mapping ? '1px solid #0f9960' : '1px solid #d3d8de',
          borderRadius: 4,
          marginBottom: 4
        }}>
          {hasChildren && (
            <Button
              minimal
              small
              icon={isExpanded ? "chevron-down" : "chevron-right"}
              onClick={() => toggleNode(fullPath)}
              style={{ marginRight: 8 }}
            />
          )}
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>{node.key}</strong>
            <Tag minimal>{node.type}</Tag>
            {node.required && <Tag minimal intent="danger">required</Tag>}
            
            {/* Show if this mapping involves arrays */}
            {mapping?.has_arrays && (
              <Tag 
                minimal 
                intent="primary" 
                icon="array"
                interactive
                onClick={() => {
                  const newExpanded = new Set(expandedArrayConfig);
                  if (newExpanded.has(fullPath)) {
                    newExpanded.delete(fullPath);
                  } else {
                    newExpanded.add(fullPath);
                  }
                  setExpandedArrayConfig(newExpanded);
                }}
                style={{ cursor: 'pointer' }}
              >
                {mapping.source_path ? 
                  mapping.source_path.match(/\[\d+\]/g)?.join('') || '[arrays]' : 
                  '[configure]'}
              </Tag>
            )}
          </div>

          {node.type !== 'object' && node.type !== 'array' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <HTMLSelect
                value={mapping?.source_id || ''}
                onChange={(e) => {
                  const sourceId = e.target.value;
                  if (sourceId) {
                    const fields = getSourceFields(sourceId);
                    if (fields.length > 0) {
                      updateMapping(fullPath, sourceId, fields[0]);
                    }
                  } else {
                    updateMapping(fullPath, '', '');
                  }
                }}
                style={{ minWidth: 150 }}
              >
                <option value="">Select source...</option>
                {dataSources.map(ds => (
                  <option key={ds.id} value={ds.id}>{ds.name}</option>
                ))}
              </HTMLSelect>

              {mapping?.source_id && (
                <HTMLSelect
                  value={mapping.source_field || ''}
                  onChange={(e) => updateMapping(fullPath, mapping.source_id, e.target.value)}
                  style={{ minWidth: 250 }}
                >
                  <option value="">Select field...</option>
                  {getSourceFields(mapping.source_id).map(field => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </HTMLSelect>
              )}

              {mapping && (
                <Button
                  minimal
                  small
                  icon="cross"
                  intent="danger"
                  onClick={() => updateMapping(fullPath, '', '')}
                />
              )}
            </div>
          )}
        </div>

        {/* Array Index Configuration */}
        {mapping?.has_arrays && showArrayConfig && (
          <div style={{
            marginLeft: 20,
            marginTop: 8,
            marginBottom: 8,
            padding: 12,
            backgroundColor: '#f5f8fa',
            borderRadius: 4,
            border: '1px solid #d3d8de'
          }}>
            <div style={{ marginBottom: 12 }}>
              <strong>Configure Array Indices</strong>
              <div style={{ fontSize: 12, color: '#5c7080', marginTop: 4 }}>
                Specify which item to select from each array level
              </div>
            </div>
            
            {mapping.array_info.map((arr: any, idx: number) => (
              <ArrayIndexSelector
                key={arr.fullPath}
                fieldName={arr.fieldName}
                arrayLength={arr.arrayLength}
                currentIndex={mapping.index_selections[arr.fullPath] || 0}
                onChange={(index) => updateArrayIndex(fullPath, arr.fullPath, index)}
                level={idx}
              />
            ))}
            
            <div style={{ 
              marginTop: 12, 
              padding: 8, 
              backgroundColor: '#e1f5e1',
              borderRadius: 4,
              fontSize: 12,
              fontFamily: 'monospace'
            }}>
              <strong>Result path:</strong> {mapping.source_path}
            </div>
          </div>
        )}

        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child: any) => renderSchemaNode(child, fullPath, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card style={{ padding: 15, maxHeight: 600, overflowY: 'auto' }}>
      <h3 style={{ marginBottom: 10 }}>Field Mappings</h3>
      
      {renderSchemaNode(schema)}
      
      <div style={{ marginTop: 20, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
        <strong>Mapped Fields:</strong> {localMappings.length}
        {localMappings.filter(m => m.has_arrays).length > 0 && (
          <Tag minimal intent="primary" style={{ marginLeft: 8 }}>
            {localMappings.filter(m => m.has_arrays).length} with array indices
          </Tag>
        )}
        {localMappings.length === 0 && (
          <p style={{ margin: '10px 0 0', color: '#666' }}>
            Select data sources and fields above to create mappings.
          </p>
        )}
      </div>
    </Card>
  );
};