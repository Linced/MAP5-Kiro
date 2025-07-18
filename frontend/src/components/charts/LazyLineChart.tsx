import React, { Suspense, lazy } from 'react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ChartData } from '../../types';

// Lazy load the Chart.js component
const LineChart = lazy(() => import('./LineChart'));

interface LazyLineChartProps {
  data: ChartData;
  title?: string;
  height?: number;
  showLegend?: boolean;
  enableZoom?: boolean;
}

export const LazyLineChart: React.FC<LazyLineChartProps> = (props) => {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading chart..." />}>
      <LineChart {...props} />
    </Suspense>
  );
};

export default LazyLineChart;