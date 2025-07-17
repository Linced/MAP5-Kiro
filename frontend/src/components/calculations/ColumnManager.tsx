import React, { useState, useEffect } from 'react';

interface CalculatedColumn {
  id: number;
  columnName: string;
  formula: string;
  createdAt: string;
}

interface ColumnManagerProps {
  calculatedColumns: CalculatedColumn[];
  onDeleteColumn: (columnId: number) => void;
  onEditColumn: (column: CalculatedColumn) => void;
}

export const ColumnManager: React.FC<ColumnManagerProps> = ({
  calculatedColumns,
  onDeleteColumn,
  onEditColumn
}) => {
  const [expandedColumn, setExpandedColumn] = useState<number | null>(null);

  const toggleExpanded = (columnId: number) => {
    setExpandedColumn(expandedColumn === columnId ? null : columnId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (calculatedColumns.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-6 text-center">
        <div className="text-gray-400 mb-2">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-700 mb-1">No calculated columns</h3>
        <p className="text-sm text-gray-500">Create your first calculated column using the formula builder above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium text-gray-900">Calculated Columns ({calculatedColumns.length})</h3>
      
      <div className="space-y-2">
        {calculatedColumns.map((column) => (
          <div
            key={column.id}
            className="border border-gray-200 rounded-md bg-white"
          >
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h4 className="text-sm font-medium text-gray-900">{column.columnName}</h4>
                  <span className="text-xs text-gray-500">
                    Created {formatDate(column.createdAt)}
                  </span>
                </div>
                
                {expandedColumn === column.id && (
                  <div className="mt-2 space-y-2">
                    <div>
                      <span className="text-xs font-medium text-gray-600">Formula:</span>
                      <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono text-gray-800">
                        {column.formula}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleExpanded(column.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title={expandedColumn === column.id ? "Collapse" : "Expand"}
                >
                  <svg 
                    className={`h-4 w-4 transform transition-transform ${
                      expandedColumn === column.id ? 'rotate-180' : ''
                    }`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <button
                  onClick={() => onEditColumn(column)}
                  className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                  title="Edit column"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete the column "${column.columnName}"?`)) {
                      onDeleteColumn(column.id);
                    }
                  }}
                  className="p-1 text-red-400 hover:text-red-600 transition-colors"
                  title="Delete column"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};