import React, { Suspense, lazy } from 'react';
import { LoadingSpinner } from '../common/LoadingSpinner';

// Lazy load the heavy calculation components
const CalculationPage = lazy(() => import('./CalculationPage').then(module => ({ default: module.CalculationPage })));

interface CalculatedColumn {
  id: number;
  columnName: string;
  formula: string;
  createdAt: string;
}

interface LazyCalculationPageProps {
  availableColumns: string[];
  sampleData: Record<string, any>[];
  calculatedColumns: CalculatedColumn[];
  onSaveColumn: (columnName: string, formula: string) => Promise<void>;
  onDeleteColumn: (columnId: number) => Promise<void>;
  onUpdateColumn: (columnId: number, columnName: string, formula: string) => Promise<void>;
}

export const LazyCalculationPage: React.FC<LazyCalculationPageProps> = (props) => {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading calculation tools..." />}>
      <CalculationPage {...props} />
    </Suspense>
  );
};

export default LazyCalculationPage;