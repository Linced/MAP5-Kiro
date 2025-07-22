import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ChartConfiguration } from 'chart.js';
import { formatNumber, formatPercentage } from '../../utils/formatters';

interface PieChartProps {
  data: {
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor?: string[];
      borderColor?: string[];
      borderWidth?: number;
      hoverOffset?: number;
    }[];
  };
  options?: {
    title?: string;
    showLegend?: boolean;
    showPercentage?: boolean;
    donut?: boolean;
    height?: number;
    colorScheme?: 'default' | 'blue' | 'green' | 'red' | 'rainbow';
  };
  className?: string;
}

const PieChart: React.FC<PieChartProps> = ({ 
  data, 
  options = {}, 
  className = '' 
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const getColorScheme = (scheme: string = 'default', count: number): string[] => {
    const schemes: Record<string, string[]> = {
      default: ['#4F46E5', '#818CF8', '#A5B4FC', '#C7D2FE', '#DDD6FE', '#E0E7FF', '#EEF2FF'],
      blue: ['#1E40AF', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'],
      green: ['#065F46', '#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'],
      red: ['#991B1B', '#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2'],
      rainbow: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1']
    };

    const selectedScheme = schemes[scheme] || schemes.default;
    
    // If we need more colors than in the scheme, generate additional colors
    if (count <= selectedScheme.length) {
      return selectedScheme.slice(0, count);
    } else {
      const repeatedScheme = [];
      for (let i = 0; i < count; i++) {
        repeatedScheme.push(selectedScheme[i % selectedScheme.length]);
      }
      return repeatedScheme;
    }
  };

  useEffect(() => {
    if (chartRef.current) {
      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      
      if (ctx) {
        // Apply color scheme if not specified in data
        const labelCount = data.labels.length;
        const colorScheme = getColorScheme(options.colorScheme, labelCount);
        
        const enhancedData = {
          ...data,
          datasets: data.datasets.map(dataset => ({
            ...dataset,
            backgroundColor: dataset.backgroundColor || colorScheme,
            borderColor: dataset.borderColor || '#ffffff',
            borderWidth: dataset.borderWidth || 1,
            hoverOffset: dataset.hoverOffset || 10
          }))
        };

        const chartConfig: ChartConfiguration = {
          type: options.donut ? 'doughnut' : 'pie',
          data: enhancedData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: !!options.title,
                text: options.title || '',
                font: {
                  size: 16,
                  weight: 'bold'
                }
              },
              legend: {
                display: options.showLegend !== false,
                position: 'top',
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.raw as number;
                    const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    
                    if (options.showPercentage) {
                      return `${label}: ${formatNumber(value)} (${percentage}%)`;
                    } else {
                      return `${label}: ${formatNumber(value)}`;
                    }
                  }
                }
              }
            }
          }
        };

        chartInstance.current = new Chart(ctx, chartConfig);
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, options]);

  return (
    <div className={`w-full ${className}`} style={{ height: options.height || 400 }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default PieChart;