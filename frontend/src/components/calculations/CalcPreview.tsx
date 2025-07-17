import React, { useState, useEffect } from 'react';

interface CalcPreviewProps {
  formula: string;
  sampleData: Record<string, any>[];
  isValidFormula: boolean;
}

export const CalcPreview: React.FC<CalcPreviewProps> = ({
  formula,
  sampleData,
  isValidFormula
}) => {
  const [previewResults, setPreviewResults] = useState<(number | string)[]>([]);
  const [error, setError] = useState<string>('');

  // Simple formula evaluation function
  const evaluateFormula = (formulaText: string, rowData: Record<string, any>): number | string => {
    try {
      // Replace column references with actual values
      let processedFormula = formulaText;
      const columnRefs = formulaText.match(/\[([^\]]+)\]/g);
      
      if (columnRefs) {
        for (const ref of columnRefs) {
          const columnName = ref.slice(1, -1);
          const value = rowData[columnName];
          
          if (value === undefined || value === null) {
            return 'N/A';
          }
          
          // Convert to number if possible
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            return 'Invalid';
          }
          
          processedFormula = processedFormula.replace(ref, numValue.toString());
        }
      }

      // Basic safety check - only allow numbers, operators, and parentheses
      if (!/^[\d+\-*/.() ]+$/.test(processedFormula)) {
        return 'Invalid';
      }

      // Evaluate the expression safely
      // Note: In a production app, you'd want to use a proper expression parser
      // This is a simplified version for the MVP
      const result = Function(`"use strict"; return (${processedFormula})`)();
      
      if (typeof result !== 'number' || !isFinite(result)) {
        return 'Error';
      }
      
      return Math.round(result * 100) / 100; // Round to 2 decimal places
    } catch (err) {
      return 'Error';
    }
  };

  useEffect(() => {
    if (!isValidFormula || !formula.trim() || sampleData.length === 0) {
      setPreviewResults([]);
      setError('');
      return;
    }

    try {
      const results = sampleData.slice(0, 10).map(row => evaluateFormula(formula, row));
      setPreviewResults(results);
      setError('');
    } catch (err) {
      setError('Error calculating preview');
      setPreviewResults([]);
    }
  }, [formula, sampleData, isValidFormula]);

  if (!isValidFormula) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
        <p className="text-sm text-gray-500">Enter a valid formula to see preview</p>
      </div>
    );
  }

  if (sampleData.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
        <p className="text-sm text-gray-500">No data available for preview</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        Preview (First {Math.min(10, sampleData.length)} rows)
      </h4>
      
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-xs font-medium text-gray-600 border-b pb-1">
            <div>Row</div>
            <div>Result</div>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {previewResults.map((result, index) => (
              <div key={index} className="grid grid-cols-2 gap-4 text-sm py-1">
                <div className="text-gray-600">Row {index + 1}</div>
                <div className={`font-mono ${
                  typeof result === 'number' ? 'text-green-700' : 'text-red-600'
                }`}>
                  {result}
                </div>
              </div>
            ))}
          </div>
          
          {previewResults.length === 0 && (
            <p className="text-sm text-gray-500">No results to display</p>
          )}
        </div>
      )}
    </div>
  );
};