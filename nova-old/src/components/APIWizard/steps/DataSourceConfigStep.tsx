import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  FormGroup,
  InputGroup,
  HTMLSelect,
  Callout,
  Intent,
  Icon,
  Tag,
  Tabs,
  Tab,
  Divider
} from '@blueprintjs/core';
import { useFetchProxy } from '../../../hooks/useFetchProxy';
import { APIEndpointConfig } from '../../../types/schema.types';

interface DataSourceConfigStepProps {
  dataSources: any[];
  onUpdate: (index: number, updates: any) => void;
  config?: APIEndpointConfig;
  onUpdateConfig?: (updates: Partial<APIEndpointConfig>) => void;
}

const DataSourceConfigStep: React.FC<DataSourceConfigStepProps> = ({
  dataSources,
  onUpdate,
  config,
  onUpdateConfig
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [testResults, setTestResults] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});

  // Initialize testParams from config if available
  const [testParams, setTestParams] = useState<Record<number, Record<string, string>>>(() => {
    const initial: Record<number, Record<string, string>> = {};
    if (config?.testParameters) {
      dataSources.forEach((ds, idx) => {
        if (ds.id && config.testParameters![ds.id]) {
          initial[idx] = config.testParameters![ds.id];
        }
      });
    }
    return initial;
  });

  const { fetchViaProxy } = useFetchProxy();

  // Track if this is the initial mount to avoid unnecessary updates
  const isInitialMount = useRef(true);
  const prevTestParams = useRef(testParams);

  // Persist test parameters to config whenever they change
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevTestParams.current = testParams;
      return;
    }

    // Only update if testParams actually changed
    if (JSON.stringify(prevTestParams.current) !== JSON.stringify(testParams)) {
      prevTestParams.current = testParams;

      if (onUpdateConfig && Object.keys(testParams).length > 0) {
        // Convert index-based testParams to ID-based for storage in config
        const testParametersByID: Record<string, Record<string, string>> = {};
        dataSources.forEach((ds, idx) => {
          if (ds.id && testParams[idx]) {
            testParametersByID[ds.id] = testParams[idx];
          }
        });

        // Only update if we have some ID-based parameters
        if (Object.keys(testParametersByID).length > 0) {
          onUpdateConfig({ testParameters: testParametersByID });
        }
      }
    }
  }, [testParams, dataSources]); // Remove onUpdateConfig from dependencies

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

  const testAPIConnection = async (index: number) => {
    const source = dataSources[index];
    console.log('testAPIConnection called for source:', source);

    if (!source.api_config?.url) {
      console.error('No URL configured');
      return;
    }

    // Check for required parameters
    const paramMappings = source.api_config.parameter_mappings || [];
    const requiredMappings = paramMappings.filter((m: any) => m.required);
    const currentTestParams = testParams[index] || {};

    console.log('Parameter mappings:', paramMappings);
    console.log('Required mappings:', requiredMappings);
    console.log('Current test params:', currentTestParams);

    // Validate required parameters
    for (const mapping of requiredMappings) {
      if (!currentTestParams[mapping.queryParam]) {
        console.error(`Required parameter '${mapping.queryParam}' is missing`);
        setTestResults(prev => ({
          ...prev,
          [index]: {
            success: false,
            error: `⚠️ Required test parameter '${mapping.queryParam}' is missing. Please provide a value in the "Test Parameters" section above.`
          }
        }));
        return;
      }
    }

    console.log('All required parameters provided, proceeding with test...');
    setLoading(prev => ({ ...prev, [index]: true }));

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

      const result = await fetchViaProxy(testUrl, {
        method: source.api_config.method || 'GET',
        headers
      });

      if (!result) {
        throw new Error('No response received from proxy');
      }

      if (result.status >= 400) {
        throw new Error(`HTTP error ${result.status}`);
      }

      if (!result.data) {
        throw new Error('Response has no data');
      }

      console.log('Raw response data:', result.data);
      console.log('Response type:', Array.isArray(result.data) ? 'array' : typeof result.data);

      // Extract fields from the response
      let extractedFields: string[] = [];
      let dataToAnalyze = result.data;

      // If there's a data_path, navigate to it
      if (source.api_config.data_path) {
        console.log('Navigating to data_path:', source.api_config.data_path);
        const pathParts = source.api_config.data_path.split('.');
        let current = result.data;

        for (const part of pathParts) {
          if (current && typeof current === 'object') {
            current = current[part];
          }
        }

        if (current) {
          dataToAnalyze = current;
          console.log('Data after path navigation:', dataToAnalyze);
        } else {
          console.warn('Data path navigation resulted in null/undefined');
        }
      }

      console.log('Data to analyze:', dataToAnalyze);
      console.log('Data to analyze type:', Array.isArray(dataToAnalyze) ? 'array' : typeof dataToAnalyze);

      extractedFields = extractJsonFields(dataToAnalyze);
      console.log('Extracted fields:', extractedFields);

      setTestResults(prev => ({
        ...prev,
        [index]: {
          success: true,
          status: result.status,
          data: result.data,
          fields: extractedFields,
          testedUrl: testUrl
        }
      }));

      // IMPORTANT: Store fields at both the root level AND in api_config
      onUpdate(index, {
        fields: extractedFields,  // Store at root level for other steps
        sample_data: Array.isArray(dataToAnalyze) ? dataToAnalyze.slice(0, 5) : [dataToAnalyze],
        api_config: {
          ...source.api_config,
          extracted_fields: extractedFields,  // Also store in api_config for reference
          sample_response: result.data
        }
      });

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
      setLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  const testRSSFeed = async (index: number) => {
    const source = dataSources[index];
    if (!source.rss_config?.url) return;

    setLoading(prev => ({ ...prev, [index]: true }));
    
    try {
      const result = await fetchViaProxy(source.rss_config.url, {
        method: 'GET'
      });

      if (result.status >= 400) {
        throw new Error(`HTTP error ${result.status}`);
      }

      // Parse RSS and extract fields
      // This is simplified - you'd use an actual RSS parser
      let extractedFields: string[] = ['title', 'description', 'link', 'pubDate', 'guid', 'author', 'category'];
      
      setTestResults(prev => ({
        ...prev,
        [index]: {
          success: true,
          status: result.status,
          data: result.data,
          fields: extractedFields
        }
      }));

      // Store fields at root level for other steps
      onUpdate(index, {
        fields: extractedFields,
        rss_config: {
          ...source.rss_config,
          extracted_fields: extractedFields,
          sample_response: result.data
        }
      });

    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [index]: {
          success: false,
          error: error instanceof Error ? error.message : 'Connection failed'
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  const renderAPIConfig = (source: any, index: number) => {
    // Initialize api_config if it doesn't exist
    if (!source.api_config) {
      source.api_config = { method: 'GET', auth_type: 'none' };
    }
    
    return (
      <>
        <FormGroup label="API URL" labelInfo="(required)">
          <InputGroup
            value={source.api_config?.url || ''}
            onChange={(e) => onUpdate(index, {
              api_config: { ...source.api_config, url: e.target.value }
            })}
            placeholder="https://api.example.com/v1/data"
            intent={!source.api_config?.url ? Intent.DANGER : Intent.NONE}
          />
        </FormGroup>

        <FormGroup label="HTTP Method">
          <HTMLSelect
            value={source.api_config?.method || 'GET'}
            onChange={(e) => onUpdate(index, {
              api_config: { ...source.api_config, method: e.target.value }
            })}
            fill
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </HTMLSelect>
        </FormGroup>

        <FormGroup label="Data Path (optional)" helperText="JSON path to the array of items (e.g., 'data.items' or 'results')">
          <InputGroup
            value={source.api_config?.data_path || ''}
            onChange={(e) => onUpdate(index, {
              api_config: { ...source.api_config, data_path: e.target.value }
            })}
            placeholder="data.items"
          />
        </FormGroup>

        <FormGroup label="Authentication Type">
          <HTMLSelect
            value={source.api_config?.auth_type || 'none'}
            onChange={(e) => onUpdate(index, {
              api_config: { ...source.api_config, auth_type: e.target.value }
            })}
            fill
          >
            <option value="none">No Authentication</option>
            <option value="basic">Basic Auth</option>
            <option value="bearer">Bearer Token</option>
            <option value="api_key_header">API Key (Header)</option>
            <option value="api_key_query">API Key (Query)</option>
          </HTMLSelect>
        </FormGroup>

        {source.api_config?.auth_type === 'bearer' && (
          <FormGroup label="Bearer Token">
            <InputGroup
              value={source.api_config?.bearer_token || ''}
              onChange={(e) => onUpdate(index, {
                api_config: { ...source.api_config, bearer_token: e.target.value }
              })}
              placeholder="Your bearer token"
              type="password"
            />
          </FormGroup>
        )}

        {source.api_config?.auth_type === 'api_key_header' && (
          <>
            <FormGroup label="API Key Header Name">
              <InputGroup
                value={source.api_config?.api_key_header || 'X-API-Key'}
                onChange={(e) => onUpdate(index, {
                  api_config: { ...source.api_config, api_key_header: e.target.value }
                })}
                placeholder="X-API-Key"
              />
            </FormGroup>
            <FormGroup label="API Key Value">
              <InputGroup
                value={source.api_config?.api_key_value || ''}
                onChange={(e) => onUpdate(index, {
                  api_config: { ...source.api_config, api_key_value: e.target.value }
                })}
                placeholder="Your API key"
                type="password"
              />
            </FormGroup>
          </>
        )}

        <Divider style={{ margin: '20px 0' }} />

        {/* Parameter Mapping Section */}
        <FormGroup
          label="Dynamic URL Parameters"
          helperText="Map query parameters from your endpoint URL to placeholders in this data source URL. Use {placeholderName} in your URL above."
        >
          <Callout intent={Intent.PRIMARY} icon="info-sign" style={{ marginBottom: '10px' }}>
            <strong>Example:</strong> If your URL is <code>http://api.com/races/{'{raceId}'}</code>,
            add a mapping where the placeholder is "raceId" and the query param is "id".
            Then calling <code>/api/your-endpoint?id=ND_393</code> will fetch from <code>http://api.com/races/ND_393</code>
          </Callout>

          {source.api_config?.parameter_mappings?.map((mapping: any, mappingIndex: number) => (
            <Card key={mappingIndex} style={{ marginBottom: '10px', padding: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '10px', alignItems: 'start' }}>
                <FormGroup label="Query Parameter" style={{ marginBottom: 0 }}>
                  <InputGroup
                    value={mapping.queryParam || ''}
                    onChange={(e) => {
                      const newMappings = [...(source.api_config.parameter_mappings || [])];
                      newMappings[mappingIndex] = { ...mapping, queryParam: e.target.value };
                      onUpdate(index, {
                        api_config: { ...source.api_config, parameter_mappings: newMappings }
                      });
                    }}
                    placeholder="id"
                    small
                  />
                </FormGroup>
                <FormGroup label="URL Placeholder" style={{ marginBottom: 0 }}>
                  <InputGroup
                    value={mapping.urlPlaceholder || ''}
                    onChange={(e) => {
                      const newMappings = [...(source.api_config.parameter_mappings || [])];
                      newMappings[mappingIndex] = { ...mapping, urlPlaceholder: e.target.value };
                      onUpdate(index, {
                        api_config: { ...source.api_config, parameter_mappings: newMappings }
                      });
                    }}
                    placeholder="raceId"
                    small
                  />
                </FormGroup>
                <FormGroup label="Required?" style={{ marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    checked={mapping.required || false}
                    onChange={(e) => {
                      const newMappings = [...(source.api_config.parameter_mappings || [])];
                      newMappings[mappingIndex] = { ...mapping, required: e.target.checked };
                      onUpdate(index, {
                        api_config: { ...source.api_config, parameter_mappings: newMappings }
                      });
                    }}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </FormGroup>
                <Button
                  icon="trash"
                  intent={Intent.DANGER}
                  minimal
                  small
                  onClick={() => {
                    const newMappings = source.api_config.parameter_mappings.filter((_: any, i: number) => i !== mappingIndex);
                    onUpdate(index, {
                      api_config: { ...source.api_config, parameter_mappings: newMappings }
                    });
                  }}
                  style={{ marginTop: '20px' }}
                />
              </div>
            </Card>
          ))}

          <Button
            icon="add"
            text="Add Parameter Mapping"
            minimal
            onClick={() => {
              const newMapping = { queryParam: '', urlPlaceholder: '', required: false };
              const currentMappings = source.api_config?.parameter_mappings || [];
              onUpdate(index, {
                api_config: {
                  ...source.api_config,
                  parameter_mappings: [...currentMappings, newMapping]
                }
              });
            }}
          />
        </FormGroup>

        <Divider style={{ margin: '20px 0' }} />

        {/* Test Parameters Section */}
        {source.api_config?.parameter_mappings && source.api_config.parameter_mappings.length > 0 && (
          <FormGroup
            label="Test Parameters"
            helperText="Provide values for parameters to test the connection"
          >
            <Callout intent={Intent.WARNING} icon="warning-sign" style={{ marginBottom: '10px' }}>
              This data source uses dynamic parameters. Provide test values below to discover fields.
            </Callout>
            {source.api_config.parameter_mappings.map((mapping: any, mappingIdx: number) => (
              <FormGroup
                key={mappingIdx}
                label={`${mapping.queryParam}${mapping.required ? ' (required)' : ''}`}
                labelInfo={mapping.required ? '(required)' : '(optional)'}
                style={{ marginBottom: '10px' }}
              >
                <InputGroup
                  value={testParams[index]?.[mapping.queryParam] || ''}
                  onChange={(e) => {
                    setTestParams(prev => ({
                      ...prev,
                      [index]: {
                        ...prev[index],
                        [mapping.queryParam]: e.target.value
                      }
                    }));
                  }}
                  placeholder={`e.g., value for {${mapping.urlPlaceholder}}`}
                  intent={mapping.required && !testParams[index]?.[mapping.queryParam] ? Intent.DANGER : Intent.NONE}
                />
              </FormGroup>
            ))}
          </FormGroup>
        )}

        <Button
          intent={Intent.PRIMARY}
          icon="play"
          text="Test Connection"
          loading={loading[index]}
          onClick={() => testAPIConnection(index)}
        />

        {testResults[index] && (
          <Callout
            style={{ marginTop: '10px' }}
            icon={testResults[index].success ? 'tick' : 'error'}
            intent={testResults[index].success ? Intent.SUCCESS : Intent.DANGER}
          >
            {testResults[index].success ? (
              <div>
                <strong>Connection successful!</strong>
                <p>Status: {testResults[index].status}</p>
                {testResults[index].testedUrl && (
                  <p style={{ fontSize: '11px', color: '#5c7080', marginTop: '4px' }}>
                    Tested URL: <code>{testResults[index].testedUrl}</code>
                  </p>
                )}
                {testResults[index].fields && testResults[index].fields.length > 0 ? (
                  <div>
                    <p>Found {testResults[index].fields.length} fields:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                      {testResults[index].fields.slice(0, 10).map((field: string) => (
                        <Tag key={field} minimal>{field}</Tag>
                      ))}
                      {testResults[index].fields.length > 10 && (
                        <Tag minimal>+{testResults[index].fields.length - 10} more</Tag>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#d9822b', marginTop: '8px' }}>
                      ⚠️ No fields could be extracted from the response.
                    </p>
                    <p style={{ fontSize: '12px', marginTop: '8px' }}>
                      Check the browser console for the raw response data. You may need to set a "Data Path" if the data is nested.
                    </p>
                    {testResults[index].data && (
                      <details style={{ marginTop: '8px' }}>
                        <summary style={{ cursor: 'pointer', fontSize: '12px' }}>
                          View raw response (click to expand)
                        </summary>
                        <pre style={{
                          fontSize: '10px',
                          backgroundColor: '#f5f5f5',
                          padding: '8px',
                          borderRadius: '3px',
                          maxHeight: '200px',
                          overflow: 'auto',
                          marginTop: '4px'
                        }}>
                          {JSON.stringify(testResults[index].data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <strong>Connection failed</strong>
                <p>{testResults[index].error}</p>
              </div>
            )}
          </Callout>
        )}
      </>
    );
  };

  const renderRSSConfig = (source: any, index: number) => {
    if (!source.rss_config) {
      source.rss_config = {};
    }

    return (
      <>
        <FormGroup label="RSS Feed URL" labelInfo="(required)">
          <InputGroup
            value={source.rss_config?.url || ''}
            onChange={(e) => onUpdate(index, {
              rss_config: { ...source.rss_config, url: e.target.value }
            })}
            placeholder="https://example.com/feed.xml"
            intent={!source.rss_config?.url ? Intent.DANGER : Intent.NONE}
          />
        </FormGroup>

        <FormGroup label="Update Frequency">
          <HTMLSelect
            value={source.rss_config?.update_frequency || '15min'}
            onChange={(e) => onUpdate(index, {
              rss_config: { ...source.rss_config, update_frequency: e.target.value }
            })}
            fill
          >
            <option value="5min">Every 5 minutes</option>
            <option value="15min">Every 15 minutes</option>
            <option value="30min">Every 30 minutes</option>
            <option value="1hour">Every hour</option>
            <option value="6hours">Every 6 hours</option>
            <option value="daily">Daily</option>
          </HTMLSelect>
        </FormGroup>

        <Button
          intent={Intent.PRIMARY}
          icon="play"
          text="Test RSS Feed"
          loading={loading[index]}
          onClick={() => testRSSFeed(index)}
        />

        {testResults[index] && (
          <Callout
            style={{ marginTop: '10px' }}
            icon={testResults[index].success ? 'tick' : 'error'}
            intent={testResults[index].success ? Intent.SUCCESS : Intent.DANGER}
          >
            {testResults[index].success ? (
              <div>
                <strong>RSS feed validated!</strong>
                <p>Successfully connected to RSS feed</p>
                {testResults[index].fields && (
                  <div>
                    <p>Available RSS fields:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                      {testResults[index].fields.map((field: string) => (
                        <Tag key={field} minimal intent={Intent.SUCCESS}>{field}</Tag>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <strong>Failed to load RSS feed</strong>
                <p>{testResults[index].error}</p>
              </div>
            )}
          </Callout>
        )}
      </>
    );
  };

  const renderDatabaseConfig = (source: any, index: number) => (
    <>
      <FormGroup label="Database Type">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {['mysql', 'postgresql', 'mssql'].map(dbType => (
            <Card
              key={dbType}
              interactive
              onClick={() => onUpdate(index, {
                database_config: { ...source.database_config, dbType }
              })}
              style={{
                padding: '15px',
                textAlign: 'center',
                border: source.database_config?.dbType === dbType ? '2px solid #137cbd' : '1px solid #d3d8de'
              }}
            >
              <Icon icon="database" size={24} />
              <div style={{ marginTop: '8px', fontSize: '14px' }}>
                {dbType.toUpperCase()}
              </div>
            </Card>
          ))}
        </div>
      </FormGroup>

      {source.database_config?.dbType && (
        <Callout icon="info-sign" intent={Intent.PRIMARY}>
          Database connections and queries will be configured in a later step
          after saving this data source.
        </Callout>
      )}
    </>
  );

  const renderFileConfig = (source: any, index: number) => (
    <>
      <FormGroup label="File Source">
        <HTMLSelect
          value={source.file_config?.source || 'url'}
          onChange={(e) => onUpdate(index, {
            file_config: { ...source.file_config, source: e.target.value }
          })}
          fill
        >
          <option value="url">URL</option>
          <option value="upload">Upload</option>
          <option value="path">Server Path</option>
        </HTMLSelect>
      </FormGroup>

      {source.file_config?.source === 'url' && (
        <FormGroup label="File URL" labelInfo="(required)">
          <InputGroup
            value={source.file_config?.url || ''}
            onChange={(e) => onUpdate(index, {
              file_config: { ...source.file_config, url: e.target.value }
            })}
            placeholder="https://example.com/data.csv"
            intent={!source.file_config?.url ? Intent.DANGER : Intent.NONE}
          />
        </FormGroup>
      )}

      <FormGroup label="File Format">
        <HTMLSelect
          value={source.file_config?.format || 'csv'}
          onChange={(e) => onUpdate(index, {
            file_config: { ...source.file_config, format: e.target.value }
          })}
          fill
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="xml">XML</option>
          <option value="excel">Excel (XLSX)</option>
        </HTMLSelect>
      </FormGroup>
    </>
  );

  const renderConfigByType = (source: any, index: number) => {
    switch (source.type) {
      case 'api':
        return renderAPIConfig(source, index);
      case 'rss':
        return renderRSSConfig(source, index);
      case 'database':
        return renderDatabaseConfig(source, index);
      case 'file':
        return renderFileConfig(source, index);
      default:
        return null;
    }
  };

  if (dataSources.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Icon icon="inbox" size={40} color="#5c7080" />
        <h3>No data sources to configure</h3>
        <p>Go back to add data sources</p>
      </div>
    );
  }

  return (
    <div className="datasource-config-step">
      <Tabs
        id="datasource-tabs"
        selectedTabId={`source-${activeTab}`}
        onChange={(newTab) => setActiveTab(parseInt(newTab.toString().split('-')[1]))}
      >
        {dataSources.map((source, index) => (
          <Tab
            key={index}
            id={`source-${index}`}
            title={
              <span>
                {source.name || `Source ${index + 1}`}
                {source.fields && source.fields.length > 0 && (
                  <Tag minimal intent={Intent.SUCCESS} style={{ marginLeft: '8px' }}>
                    {source.fields.length} fields
                  </Tag>
                )}
              </span>
            }
          />
        ))}
      </Tabs>

      <div style={{ marginTop: '20px' }}>
        {dataSources[activeTab] && (
          <Card>
            <h4>{dataSources[activeTab].name || 'Unnamed Source'}</h4>
            <Tag intent={Intent.PRIMARY}>{dataSources[activeTab].type?.toUpperCase()}</Tag>
            
            <Divider style={{ margin: '20px 0' }} />
            
            {renderConfigByType(dataSources[activeTab], activeTab)}
          </Card>
        )}
      </div>
    </div>
  );
};

export default DataSourceConfigStep;