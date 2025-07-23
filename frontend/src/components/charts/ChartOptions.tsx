import React from 'react';

interface ChartOptionsProps {
  chartType: 'line' | 'bar' | 'pie';
  options: {
    title: string;
    xAxisLabel: string;
    yAxisLabel: string;
    showLegend: boolean;
    stacked: boolean;
    horizontal: boolean;
  };
  onOptionsChange: (options: any) => void;
}

const ChartOptions: React.FC<ChartOptionsProps> = ({
  chartType,
  options,
  onOptionsChange
}) => {
  const updateOption = (key: string, value: any) => {
    onOptionsChange({ ...options, [key]: value });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chart Title</label>
          <input
            type="text"
            value={options.title}
            onChange={(e) => updateOption('title', e.target.value)}
            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter chart title"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">X-Axis Label</label>
          <input
            type="text"
            value={options.xAxisLabel}
            onChange={(e) => updateOption('xAxisLabel', e.target.value)}
            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter X-axis label"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Y-Axis Label</label>
          <input
            type="text"
            value={options.yAxisLabel}
            onChange={(e) => updateOption('yAxisLabel', e.target.value)}
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
            checked={options.showLegend}
            onChange={(e) => updateOption('showLegend', e.target.checked)}
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
                checked={options.stacked}
                onChange={(e) => updateOption('stacked', e.target.checked)}
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
                checked={options.horizontal}
                onChange={(e) => updateOption('horizontal', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="horizontal" className="ml-2 block text-sm text-gray-700">
                Horizontal
              </label>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ChartOptions;