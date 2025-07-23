import React from 'react';

interface ChartControlsProps {
  chartType: 'line' | 'bar' | 'pie';
  xColumn: string;
  yColumn: string;
  groupByColumn: string;
  aggregation: string;
  colorScheme: string;
  columns: Array<{ name: string; type: string }>;
  onChartTypeChange: (type: 'line' | 'bar' | 'pie') => void;
  onXColumnChange: (column: string) => void;
  onYColumnChange: (column: string) => void;
  onGroupByChange: (column: string) => void;
  onAggregationChange: (agg: string) => void;
  onColorSchemeChange: (scheme: string) => void;
}

const ChartControls: React.FC<ChartControlsProps> = ({
  chartType,
  xColumn,
  yColumn,
  groupByColumn,
  aggregation,
  colorScheme,
  columns,
  onChartTypeChange,
  onXColumnChange,
  onYColumnChange,
  onGroupByChange,
  onAggregationChange,
  onColorSchemeChange
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
        <select
          value={chartType}
          onChange={(e) => onChartTypeChange(e.target.value as 'line' | 'bar' | 'pie')}
          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="line">Line Chart</option>
          <option value="bar">Bar Chart</option>
          <option value="pie">Pie Chart</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">X-Axis Column</label>
        <select
          value={xColumn}
          onChange={(e) => onXColumnChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Select Column</option>
          {columns.map(col => (
            <option key={col.name} value={col.name}>{col.name}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Y-Axis Column</label>
        <select
          value={yColumn}
          onChange={(e) => onYColumnChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Select Column</option>
          {columns.filter(col => col.type === 'number').map(col => (
            <option key={col.name} value={col.name}>{col.name}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Group By (Optional)</label>
        <select
          value={groupByColumn}
          onChange={(e) => onGroupByChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">None</option>
          {columns.filter(col => col.type === 'string' || col.type === 'boolean').map(col => (
            <option key={col.name} value={col.name}>{col.name}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Aggregation</label>
        <select
          value={aggregation}
          onChange={(e) => onAggregationChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="none">None</option>
          <option value="sum">Sum</option>
          <option value="avg">Average</option>
          <option value="count">Count</option>
          <option value="min">Minimum</option>
          <option value="max">Maximum</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Color Scheme</label>
        <select
          value={colorScheme}
          onChange={(e) => onColorSchemeChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="default">Default</option>
          <option value="blue">Blue</option>
          <option value="green">Green</option>
          <option value="red">Red</option>
          <option value="rainbow">Rainbow</option>
        </select>
      </div>
    </div>
  );
};

export default ChartControls;