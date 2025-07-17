import React, { useState, useEffect } from 'react';
import { FormulaBuilder } from './FormulaBuilder';
import { CalcPreview } from './CalcPreview';
import { ColumnManager } from './ColumnManager';

interface CalculatedColumn {
  id: number;
  columnName: string;
  formula: string;
  createdAt: string;
}

interface CalculationPageProps {
  availableColumns: string[];
  sampleData: Record<string, any>[];
  calculatedColumns: CalculatedColumn[];
  onSaveColumn: (columnName: string, formula: string) => Promise<void>;
  onDeleteColumn: (columnId: number) => Promise<void>;
  onUpdateColumn: (columnId: number, columnName: string, formula: string) => Promise<void>;
}

export const CalculationPage: React.FC<CalculationPageProps> = ({
  availableColumns,
  sampleData,
  calculatedColumns,
  onSaveColumn,
  onDeleteColumn,
  onUpdateColumn
}) => {
  const [formula, setFormula] = useState('');
  const [columnName, setColumnName] = useState('');
  const [isValidFormula, setIsValidFormula] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingColumn, setEditingColumn] = useState<CalculatedColumn | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFormulaChange = (newFormula: string) => {
    setFormula(newFormula);
  };

  const handleValidationChange = (isValid: boolean, error?: string) => {
    setIsValidFormula(isValid);
    setValidationError(error || '');
  };

  const handleSave = async () => {
    if (!columnName.trim()) {
      alert('Please enter a column name');
      return;
    }

    if (!isValidFormula) {
      alert('Please fix the formula errors before saving');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && editingColumn) {
        await onUpdateColumn(editingColumn.id, columnName.trim(), formula);
      } else {
        await onSaveColumn(columnName.trim(), formula);
      }
      
      // Reset form
      setFormula('');
      setColumnName('');
      setIsEditing(false);
      setEditingColumn(null);
    } catch (error) {
      console.error('Error saving column:', error);
      alert('Failed to save column. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditColumn = (column: CalculatedColumn) => {
    setColumnName(column.columnName);
    setFormula(column.formula);
    setIsEditing(true);
    setEditingColumn(column);
    
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setFormula('');
    setColumnName('');
    setIsEditing(false);
    setEditingColumn(null);
  };

  const handleDeleteColumn = async (columnId: number) => {
    try {
      await onDeleteColumn(columnId);
    } catch (error) {
      console.error('Error deleting column:', error);
      alert('Failed to delete column. Please try again.');
    }
  };

  if (availableColumns.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Data Available</h2>
          <p className="text-gray-500 mb-4">
            You need to upload data before you can create calculated columns.
          </p>
          <button
            onClick={() => window.location.href = '/upload'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Upload Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Calculated Columns</h1>
        <p className="text-gray-600">
          Create new columns by writing formulas that reference your existing data columns.
        </p>
      </div>

      {/* Formula Builder Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Calculated Column' : 'Create New Calculated Column'}
          </h2>
          {isEditing && (
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="column-name" className="block text-sm font-medium text-gray-700 mb-2">
              Column Name
            </label>
            <input
              id="column-name"
              type="text"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter a name for your calculated column"
            />
          </div>

          <FormulaBuilder
            columns={availableColumns}
            onFormulaChange={handleFormulaChange}
            onValidationChange={handleValidationChange}
            initialFormula={formula}
          />

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={!isValidFormula || !columnName.trim() || isSaving}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                isValidFormula && columnName.trim() && !isSaving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? 'Saving...' : (isEditing ? 'Update Column' : 'Save Column')}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <CalcPreview
        formula={formula}
        sampleData={sampleData}
        isValidFormula={isValidFormula}
      />

      {/* Column Manager Section */}
      <ColumnManager
        calculatedColumns={calculatedColumns}
        onDeleteColumn={handleDeleteColumn}
        onEditColumn={handleEditColumn}
      />
    </div>
  );
};