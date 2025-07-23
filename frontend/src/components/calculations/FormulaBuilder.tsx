import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

interface FormulaBuilderProps {
  uploadId?: string;
  columns: string[];
  onFormulaChange: (formula: string) => void;
  onValidationChange: (isValid: boolean, error?: string) => void;
  initialFormula?: string;
  className?: string;
}

export const FormulaBuilder: React.FC<FormulaBuilderProps> = ({
  uploadId,
  columns,
  onFormulaChange,
  onValidationChange,
  initialFormula = '',
  className = ''
}) => {
  const [formula, setFormula] = useState(initialFormula);
  const [error, setError] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Common functions and operators
  const commonFunctions = [
    'SUM', 'AVG', 'MIN', 'MAX', 'COUNT',
    'ABS', 'ROUND', 'FLOOR', 'CEIL',
    'IF', 'AND', 'OR', 'NOT'
  ];

  const operators = ['+', '-', '*', '/', '(', ')', '>', '<', '>=', '<=', '==', '!='];

  // Basic formula validation
  const validateFormula = async (formulaText: string): Promise<{ isValid: boolean; error?: string }> => {
    if (!formulaText.trim()) {
      return { isValid: false, error: 'Formula cannot be empty' };
    }

    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of formulaText) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) {
        return { isValid: false, error: 'Unmatched closing parenthesis' };
      }
    }
    if (parenCount > 0) {
      return { isValid: false, error: 'Unmatched opening parenthesis' };
    }

    // Check for valid column references
    const columnRefs = formulaText.match(/\[([^\]]+)\]/g);
    if (columnRefs) {
      for (const ref of columnRefs) {
        const columnName = ref.slice(1, -1);
        if (!columns.includes(columnName)) {
          return { isValid: false, error: `Unknown column: ${columnName}` };
        }
      }
    }

    // If we have an uploadId, validate with the backend
    if (uploadId) {
      try {
        setIsValidating(true);
        const response = await apiService.validateFormula({
          uploadId,
          formula: formulaText,
          columns
        });
        
        if (response.success) {
          return { isValid: response.data.isValid, error: response.data.error };
        } else {
          return { isValid: false, error: response.error?.message || 'Validation failed' };
        }
      } catch (err) {
        console.error('Formula validation error:', err);
        return { isValid: false, error: 'Failed to validate formula' };
      } finally {
        setIsValidating(false);
      }
    }

    // Basic client-side validation
    const validPattern = /^[\[\]\w\s+\-*/().><=!]+$/;
    if (!validPattern.test(formulaText)) {
      return { isValid: false, error: 'Invalid characters in formula' };
    }

    return { isValid: true };
  };

  useEffect(() => {
    const validation = validateFormula(formula);
    setError(validation.error || '');
    onValidationChange(validation.isValid, validation.error);
    onFormulaChange(formula);
  }, [formula, columns, onFormulaChange, onValidationChange]);

  const insertColumn = (columnName: string) => {
    const textarea = document.getElementById('formula-input') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newFormula = formula.substring(0, start) + `[${columnName}]` + formula.substring(end);
      setFormula(newFormula);
      
      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + columnName.length + 2, start + columnName.length + 2);
      }, 0);
    }
  };

  const insertOperator = (operator: string) => {
    const textarea = document.getElementById('formula-input') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newFormula = formula.substring(0, start) + ` ${operator} ` + formula.substring(end);
      setFormula(newFormula);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + operator.length + 2, start + operator.length + 2);
      }, 0);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="formula-input" className="block text-sm font-medium text-gray-700 mb-2">
          Formula
        </label>
        <textarea
          id="formula-input"
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md font-mono text-sm ${
            error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
          } focus:outline-none focus:ring-1 ${
            error ? 'focus:ring-red-500' : 'focus:ring-blue-500'
          }`}
          rows={3}
          placeholder="Enter formula using column names in brackets, e.g., [Close] - [Open]"
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Column References */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Available Columns</h4>
          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
            <div className="flex flex-wrap gap-1">
              {columns.map((column) => (
                <button
                  key={column}
                  onClick={() => insertColumn(column)}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                >
                  {column}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Operators */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Operators</h4>
          <div className="grid grid-cols-4 gap-1">
            {['+', '-', '*', '/', '(', ')'].map((op) => (
              <button
                key={op}
                onClick={() => insertOperator(op)}
                className="px-2 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
              >
                {op}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        <p><strong>Tips:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Use column names in square brackets: [Column Name]</li>
          <li>Supported operators: +, -, *, /, ( )</li>
          <li>Example: ([High] + [Low]) / 2</li>
        </ul>
      </div>
    </div>
  );
};