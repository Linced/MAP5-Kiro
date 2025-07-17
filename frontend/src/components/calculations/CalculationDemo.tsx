import React, { useState } from 'react';
import { CalculationPage } from './CalculationPage';
import { useCalculations } from '../../hooks';

// Demo component to show how the calculation interface works
export const CalculationDemo: React.FC = () => {
  // Mock data for demonstration
  const mockColumns = ['Open', 'High', 'Low', 'Close', 'Volume', 'Date'];
  const mockSampleData = [
    { Open: 100, High: 105, Low: 98, Close: 103, Volume: 1000, Date: '2024-01-01' },
    { Open: 103, High: 108, Low: 101, Close: 106, Volume: 1200, Date: '2024-01-02' },
    { Open: 106, High: 110, Low: 104, Close: 108, Volume: 900, Date: '2024-01-03' },
    { Open: 108, High: 112, Low: 106, Close: 109, Volume: 1100, Date: '2024-01-04' },
    { Open: 109, High: 115, Low: 107, Close: 113, Volume: 1300, Date: '2024-01-05' }
  ];

  // For demo purposes, we'll use local state instead of the API hook
  const [calculatedColumns, setCalculatedColumns] = useState([
    {
      id: 1,
      columnName: 'Mid Price',
      formula: '([High] + [Low]) / 2',
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      columnName: 'Price Range',
      formula: '[High] - [Low]',
      createdAt: new Date().toISOString()
    }
  ]);

  const handleSaveColumn = async (columnName: string, formula: string) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newColumn = {
      id: Date.now(),
      columnName,
      formula,
      createdAt: new Date().toISOString()
    };
    
    setCalculatedColumns(prev => [...prev, newColumn]);
  };

  const handleUpdateColumn = async (columnId: number, columnName: string, formula: string) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setCalculatedColumns(prev => 
      prev.map(col => 
        col.id === columnId 
          ? { ...col, columnName, formula }
          : col
      )
    );
  };

  const handleDeleteColumn = async (columnId: number) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setCalculatedColumns(prev => prev.filter(col => col.id !== columnId));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Calculation Interface Demo</h1>
              <p className="text-sm text-gray-600 mt-1">
                Interactive demo of the calculation components with sample trading data
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Sample Data: {mockSampleData.length} rows
            </div>
          </div>
        </div>
      </div>

      <CalculationPage
        availableColumns={mockColumns}
        sampleData={mockSampleData}
        calculatedColumns={calculatedColumns}
        onSaveColumn={handleSaveColumn}
        onDeleteColumn={handleDeleteColumn}
        onUpdateColumn={handleUpdateColumn}
      />
    </div>
  );
};