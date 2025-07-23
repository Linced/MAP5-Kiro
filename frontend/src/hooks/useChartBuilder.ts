import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
}

export const useChartBuilder = (uploadId?: string) => {
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      } else {
        setError('Failed to fetch column information');
      }
    } catch (err) {
      setError('An error occurred while fetching column information');
      console.error(err);
    }
  };

  const generateChart = async (options: {
    xColumn: string;
    yColumn: string;
    chartType: 'line' | 'bar' | 'pie';
    aggregation?: string;
    groupBy?: string;
  }) => {
    if (!uploadId || !options.xColumn || !options.yColumn) {
      setError('Please select both X and Y columns');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const chartOptions = {
        uploadId,
        ...options,
        aggregation: options.aggregation === 'none' ? undefined : options.aggregation
      };

      // Validate chart options first
      const validationResponse = await apiService.validateChartOptions(chartOptions);
      
      if (!validationResponse.success || !validationResponse.data.isValid) {
        setError(validationResponse.data?.errors?.[0] || 'Invalid chart configuration');
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

  return {
    columns,
    chartData,
    isLoading,
    error,
    generateChart,
    setError
  };
};