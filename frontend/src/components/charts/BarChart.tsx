import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ChartConfiguration } from 'chart.js';
import { formatNumber } from '../../utils/formatters';

interface BarChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
    }[];
  };
  options?: {
    title?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    stacked?: boolean;
    horizontal?: boolean;
    showLegend?: boolean;
    height?: number;
    colorScheme?: 'default' | 'blue' | 'green' | 'red' | 'rainbow';
  };
  className?: string;
}

const BarChart: React.FC<BarChartProps> = ({ 
  data, 
  options = {}, 
  className = '' 
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const getColorScheme = (scheme: string = 'default', count: number = 1): string[] => {
    const schemes: Record<string, string[]> = {
      default: ['#4F46E5', '#818CF8', '#A5B4FC', '#C7D2FE', '#DDD6FE'],
      blue: ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'],
      green: ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
      red: ['#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FECACA'],
      rainbow: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']
    };

    const selectedScheme = schemes[scheme] || schemes.default;
    
    // If we need more colors than in the scheme, repeat them
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
        const datasetCount = data.datasets.length;
        const colorScheme = getColorScheme(options.colorScheme, datasetCount);
        
        const enhancedData = {
          ...data,
          datasets: data.datasets.map((dataset, index) => ({
            ...dataset,
            backgroundColor: dataset.backgroundColor || colorScheme[index % colorScheme.length],
            borderColor: dataset.borderColor || colorScheme[index % colorScheme.length],
            borderWidth: dataset.borderWidth || 1
          }))
        };

        const chartConfig: ChartConfiguration = {
          type: options.horizontal ? 'bar' : 'bar',
          data: enhancedData,
          options: {
            indexAxis: options.horizontal ? 'y' : 'x',
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
                    let label = context.dataset.label || '';
                    if (label) {
                      label += ': ';
                    }
                    if (context.parsed.y !== null) {
                      label += formatNumber(context.parsed.y);
                    }
                    return label;
                  }
                }
              }
            },
            scales: {
              x: {
                stacked: !!options.stacked,
                title: {
                  display: !!options.xAxisLabel,
                  text: options.xAxisLabel || '',
                }
              },
              y: {
                stacked: !!options.stacked,
                title: {
                  display: !!options.yAxisLabel,
                  text: options.yAxisLabel || '',
                },
                ticks: {
                  callback: function(value) {
                    return formatNumber(value as number);
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

export default BarChart;