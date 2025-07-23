import React, { useState } from 'react';
import LineChart from './LineChart';
import BarChart from './BarChart';
import PieChart from './PieChart';
import ChartControls from './ChartControls';
import ChartOptions from './ChartOptions';
import { useChartBuilder } from '../../hooks/useChartBuilder';

interface ChartBuilderProps {
  uploadId?: string;
  className?: string;
}

const ChartBuilder: React.FC<ChartBuilderProps> = ({ uploadId, className = '' }) => {
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>('line');
  const [xColumn, setXColumn] = useState<string>('');
  const [yColumn, setYColumn] = useState<string>('');
  const [groupByColumn, setGroupByColumn] = useState<string>('');
  const [aggregation, setAggregation] = useState<string>('none');
  const [colorScheme, setColorScheme] = useState<string>('default');
  const [chartOptions, setChartOptions] = useState({
    title: '',
    xAxisLabel: '',
    yAxisLabel: '',
    showLegend: true,
    stacked: false,
    horizontal: false,
    height: 400
  });

  const { columns, chartData, isLoading, error, generateChart, setError } = useChartBuilder(uploadId);

  const handleGenerateChart = () => {
    generateChart({
      xColumn,
      yColumn,
      chartType,
      aggregation,
      groupBy: groupByColumn
    });
  };

  const renderChart = () => {
    if (!chartData) return null;

    const commonProps = {
      data: chartData,
      options: { ...chartOptions, colorScheme },
      className: 'mt-4'
    };

    switch (chartType) {
      case 'line': return <LineChart {...commonProps} />;
      case 'bar': return <BarChart {...commonProps} />;
      case 'pie': return <PieChart {...commonProps} />;
      default: return null;
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
      
      <ChartControls
        chartType={chartType}
        xColumn={xColumn}
        yColumn={yColumn}
        groupByColumn={groupByColumn}
        aggregation={aggregation}
        colorScheme={colorScheme}
        columns={columns}
        onChartTypeChange={setChartType}
        onXColumnChange={setXColumn}
        onYColumnChange={setYColumn}
        onGroupByChange={setGroupByColumn}
        onAggregationChange={setAggregation}
        onColorSchemeChange={setColorScheme}
      />
      
      <ChartOptions
        chartType={chartType}
        options={chartOptions}
        onOptionsChange={setChartOptions}
      />
      
      <div className="flex justify-center mt-4">
        <button
          onClick={handleGenerateChart}
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