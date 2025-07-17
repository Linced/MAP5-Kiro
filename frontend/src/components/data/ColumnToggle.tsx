import React, { useState } from 'react';
import { Table } from '@tanstack/react-table';

interface ColumnToggleProps {
  table: Table<any>;
  columns: string[];
}

const ColumnToggle: React.FC<ColumnToggleProps> = ({ table, columns }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleToggleAll = () => {
    const allVisible = table.getIsAllColumnsVisible();
    table.toggleAllColumnsVisible(!allVisible);
  };

  const visibleCount = table.getVisibleLeafColumns().length;
  const totalCount = columns.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleDropdown}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
        Columns ({visibleCount}/{totalCount})
        <svg className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 z-20 mt-2 w-64 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="py-1 max-h-64 overflow-y-auto">
              {/* Toggle All */}
              <div className="px-4 py-2 border-b border-gray-200">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={table.getIsAllColumnsVisible()}
                    onChange={handleToggleAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    Toggle All
                  </span>
                </label>
              </div>

              {/* Individual Columns */}
              {table.getAllLeafColumns().map(column => {
                const columnName = column.id;
                return (
                  <div key={column.id} className="px-4 py-2 hover:bg-gray-50">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 truncate">
                        {columnName}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
              {visibleCount} of {totalCount} columns visible
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ColumnToggle;