import React, { useState } from 'react';
import {
  FormGroup,
  InputGroup,
  HTMLSelect,
  Switch,
  Card,
  Callout,
  Intent,
  TextArea,
  Button,
  Tag
} from '@blueprintjs/core';

interface CustomAggregateOptionsProps {
  aggregateType?: string;
  options?: Record<string, any>;
  onChange: (options: Record<string, any>) => void;
}

const CustomAggregateOptions: React.FC<CustomAggregateOptionsProps> = ({
  aggregateType,
  options = {},
  onChange
}) => {
  const [currentType, setCurrentType] = useState(aggregateType || 'election-chart');

  const handleTypeChange = (type: string) => {
    setCurrentType(type);
    onChange({ ...options, aggregateType: type });
  };

  const handleOptionChange = (key: string, value: any) => {
    onChange({ ...options, [key]: value, aggregateType: currentType });
  };

  const renderTypeSpecificOptions = () => {
    switch (currentType) {
      case 'election-chart':
        return (
          <div className="election-chart-options">
            <Callout intent={Intent.PRIMARY} icon="info-sign" style={{ marginBottom: 15 }}>
              <strong>Election Chart Transformation</strong>
              <p style={{ margin: '5px 0 0 0' }}>
                Converts election data with candidates and results into parallel arrays for charts.
              </p>
            </Callout>

            <FormGroup
              label="Candidates Path"
              helperText="Path to the candidates array (e.g., 'candidates')"
            >
              <InputGroup
                value={options.candidatesPath || 'candidates'}
                onChange={(e) => handleOptionChange('candidatesPath', e.target.value)}
                placeholder="candidates"
              />
            </FormGroup>

            <FormGroup
              label="Results Path"
              helperText="Path to the results array (e.g., 'results.candidateResults')"
            >
              <InputGroup
                value={options.resultsPath || 'results.candidateResults'}
                onChange={(e) => handleOptionChange('resultsPath', e.target.value)}
                placeholder="results.candidateResults"
              />
            </FormGroup>

            <FormGroup
              label="Label Field"
              helperText="Field from candidate to use as label (e.g., 'lastName')"
            >
              <InputGroup
                value={options.labelField || 'lastName'}
                onChange={(e) => handleOptionChange('labelField', e.target.value)}
                placeholder="lastName"
              />
            </FormGroup>

            <FormGroup
              label="Value Field"
              helperText="Field from results to use as value (e.g., 'pctVotes')"
            >
              <InputGroup
                value={options.valueField || 'pctVotes'}
                onChange={(e) => handleOptionChange('valueField', e.target.value)}
                placeholder="pctVotes"
              />
            </FormGroup>

            <FormGroup label="Sort By">
              <HTMLSelect
                value={options.sortBy || 'percentage'}
                onChange={(e) => handleOptionChange('sortBy', e.target.value)}
                fill
              >
                <option value="percentage">Percentage</option>
                <option value="votes">Votes</option>
                <option value="none">No Sorting</option>
              </HTMLSelect>
            </FormGroup>

            <FormGroup label="Sort Order">
              <HTMLSelect
                value={options.sortOrder || 'desc'}
                onChange={(e) => handleOptionChange('sortOrder', e.target.value)}
                fill
              >
                <option value="desc">Descending (High to Low)</option>
                <option value="asc">Ascending (Low to High)</option>
              </HTMLSelect>
            </FormGroup>

            <div style={{ marginTop: 15 }}>
              <Switch
                label="Round percentages to whole numbers"
                checked={options.roundPercentages || false}
                onChange={(e) => handleOptionChange('roundPercentages', e.currentTarget.checked)}
              />
              <Switch
                label="Include votes array"
                checked={options.includeVotes || false}
                onChange={(e) => handleOptionChange('includeVotes', e.currentTarget.checked)}
              />
              <Switch
                label="Include winner flags"
                checked={options.includeWinner || false}
                onChange={(e) => handleOptionChange('includeWinner', e.currentTarget.checked)}
              />
              <Switch
                label="Include raw data"
                checked={options.includeRawData || false}
                onChange={(e) => handleOptionChange('includeRawData', e.currentTarget.checked)}
              />
            </div>

            <Card style={{ marginTop: 20, backgroundColor: '#f5f8fa' }}>
              <h5>Expected Output Format:</h5>
              <pre style={{ margin: 0, fontSize: 12 }}>
{`{
  "label": ["Mamdani", "Cuomo", "Sliwa", "Adams"],
  "percentage": ${options.roundPercentages ? '[51, 42, 7, 0]' : '[50.698, 41.839, 7.151, 0.312]'}${options.includeVotes ? ',\n  "votes": [1036051, 855000, 146137, 6382]' : ''}${options.includeWinner ? ',\n  "isWinner": [true, false, false, false]' : ''}
}`}
              </pre>
            </Card>
          </div>
        );

      case 'custom-script':
        return (
          <div className="custom-script-options">
            <Callout intent={Intent.WARNING} icon="code" style={{ marginBottom: 15 }}>
              <strong>Custom JavaScript</strong>
              <p style={{ margin: '5px 0 0 0' }}>
                Write custom transformation logic. Use with caution - this executes arbitrary JavaScript.
              </p>
            </Callout>

            <FormGroup
              label="Transformation Script"
              helperText="Return the transformed data. Available variables: data, options"
            >
              <TextArea
                value={options.script || ''}
                onChange={(e) => handleOptionChange('script', e.target.value)}
                placeholder={`// Example:\nreturn {\n  label: data.candidates.map(c => c.lastName),\n  percentage: data.results.candidateResults.map(r => Math.round(r.pctVotes))\n};`}
                rows={15}
                fill
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </FormGroup>

            <Callout intent={Intent.PRIMARY} style={{ marginTop: 10 }}>
              <strong>Available Variables:</strong>
              <ul style={{ margin: '5px 0 0 0', paddingLeft: 20 }}>
                <li><code>data</code> - The input data to transform</li>
                <li><code>options</code> - Configuration options</li>
              </ul>
            </Callout>
          </div>
        );

      default:
        return (
          <Callout intent={Intent.WARNING}>
            Unknown aggregate type. Please select a valid option.
          </Callout>
        );
    }
  };

  return (
    <div className="custom-aggregate-options">
      <FormGroup label="Aggregate Type">
        <HTMLSelect
          value={currentType}
          onChange={(e) => handleTypeChange(e.target.value)}
          fill
        >
          <option value="election-chart">Election Chart Data</option>
          <option value="custom-script">Custom JavaScript</option>
        </HTMLSelect>
      </FormGroup>

      {renderTypeSpecificOptions()}

      {currentType === 'election-chart' && (
        <Callout intent={Intent.SUCCESS} icon="lightbulb" style={{ marginTop: 20 }}>
          <strong>Example Use Case:</strong>
          <p style={{ margin: '5px 0 0 0' }}>
            Perfect for converting complex election data (with separate candidates and results arrays)
            into simple parallel arrays that charting libraries can easily consume.
          </p>
        </Callout>
      )}
    </div>
  );
};

export default CustomAggregateOptions;
