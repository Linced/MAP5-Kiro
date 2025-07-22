import React, { useState, useEffect } from 'react';
import LineChart from './LineChart';
import BarChart from './BarChart';
import PieChart from './PieChart';
import { apiService } from '../../services/api';

interface ChartBuilderProps {
  uploadId?: string;
  className?: string;
}

type ChartType = 'line' | 'bar' | 'pie';
type AggregationType = 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';

interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
}

const ChartBuilder: React.FC<ChartBuilderProps> = ({ uploadId, className = '' }) => {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [xColumn, setXColumn] = useState<string>('');
  const [yColumn, setYColumn] = useState<string>('');
  const [groupByColumn, setGroupByColumn] = useState<string>('');
  const [aggregation, setAggregation] = useState<AggregationType>('none');
  const [colorScheme, setColorScheme] = useState<string>('default');
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chartOptions, setChartOptions] = useState({
    title: '',
    xAxisLabel: '',
    yAxisLabel: '',
    showLegend: true,
    stacked: false,
    horizontal: false,
    height: 400
  });

  // Fetch column info when uploadId changes
  useEffect(() => {
    if (uploadId) {
      fetchColumnInfo();
    }
  }, [uploadId]);

  const fetchColumnInfo = async () => {
    if (!uploadId) return;
    
    try {
      const response = await apiService.getColumnInfo(uploadId);
      if (response.success) {
        setColumns(response.data.columns);
        
        // Set default columns if available
        if (response.data.columns.length > 0) {
          // Find a date column for X-axis if available, otherwise use first column
          const dateColumn = response.data.columns.find(col => col.type === 'date');
          const numberColumn = response.data.columns.find(col => col.type === 'number');
          
          setXColumn(dateColumn?.name || response.data.columns[0].name);
          setYColumn(numberColumn?.name || response.data.columns[0].name);
        }
      } else {
        setError('Failed to fetch column information');
      }
    } catch (err) {
      setError('An error occurred while fetching column information');
      console.error(err);
    }
  };

  const generateChart = async () => {
    if (!uploadId || !xColumn || !yColumn) {
      setError('Please select both X and Y columns');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const chartOptions = {
        uploadId,
        xColumn,
        yColumn,
        chartType,
        aggregation: aggregation === 'none' ? undefined : aggregation,
        groupBy: groupByColumn || undefined
      };

      // Validate chart options first
      const validationResponse = await apiService.validateChartOptions(chartOptions);
      
      if (!validationResponse.success || !validationResponse.data.isValid) {
        setError(validationResponse.data?.errors?.[0] || 'Invalid chart configuration');
        setIsLoading(false);
        return;
      }

      // Get optimized chart data
      const response = await apiService.getOptimizedChartData(chartOptions);
      
      if (response.success) {
        setChartData(response.data.chartData);
      } else {
        setError(response.error?.message || 'Failed to generate chart');
      }
    } catch (err) {
      setError('An error occurred while generating the chart');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderChart = () => {
    if (!chartData) return null;

    const commonProps = {
      data: chartData,
      options: {
        ...chartOptions,
        colorScheme
      },
      className: 'mt-4'
    };

    switch (chartType) {
      case 'line':
        return <LineChart {...commonProps} />;
      case 'bar':
        return <BarChart {...commonProps} />;
      case 'pie':
        return <PieChart {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Chart Builder</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
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
            onChange={(e) => setXColumn(e.target.value)}
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
            onChange={(e) => setYColumn(e.target.value)}
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
            onChange={(e) => setGroupByColumn(e.target.value)}
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
            onChange={(e) => setAggregation(e.target.value as AggregationType)}
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
            onChange={(e) => setColorScheme(e.target.value)}
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chart Title</label>
          <input
            type="text"
            value={chartOptions.title}
            onChange={(e) => setChartOptions({...chartOptions, title: e.target.value})}
            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter chart title"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">X-Axis Label</label>
          <input
            type="text"
            value={chartOptions.xAxisLabel}
            onChange={(e) => setChartOptions({...chartOptions, xAxisLabel: e.target.value})}
            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter X-axis label"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Y-Axis Label</label>
          <input
            type="text"
            value={chartOptions.yAxisLabel}
            onChange={(e) => setChartOptions({...chartOptions, yAxisLabel: e.target.value})}
            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter Y-axis label"
          />
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showLegend"
            checked={chartOptions.showLegend}
            onChange={(e) => setChartOptions({...chartOptions, showLegend: e.target.checked})}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="showLegend" className="ml-2 block text-sm text-gray-700">
            Show Legend
          </label>
        </div>
        
        {chartType === 'bar' && (
          <>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="stacked"
                checked={chartOptions.stacked}
                onChange={(e) => setChartOptions({...chartOptions, stacked: e.target.checked})}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="stacked" className="ml-2 block text-sm text-gray-700">
                Stacked
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="horizontal"
                checked={chartOptions.horizontal}
                onChange={(e) => setChartOptions({...chartOptions, horizontal: e.target.checked})}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="horizontal" className="ml-2 block text-sm text-gray-700">
                Horizontal
              </label>
            </div>
          </>
        )}
      </div>
      
      <div className="flex justify-center mt-4">
        <button
          onClick={generateChart}
          disabled={isLoading || !uploadId || !xColumn || !yColumn}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Generating...' : 'Generate Chart'}
        </button>
      </div>
      
      {isLoading && (
        <div className="flex justify-center mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}
      
      {renderChart()}
    </div>
  );
};

export default ChartBuilder;