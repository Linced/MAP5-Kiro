import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { 
  TableCellsIcon, 
  DocumentArrowDownIcon,
  FunnelIcon,
  EyeIcon,
  ChevronDownIcon,
  CalculatorIcon,
  ChartBarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface Upload {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  uploadedAt: string;
  status: string;
  recordCount: number;
  columns: string[];
}

interface TableData {
  headers: string[];
  rows: any[][];
  totalRows: number;
}

type DataViewType = 'raw' | 'aggregated' | 'calculated';

interface AggregationOption {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  columns: string[];
}

interface CalculatedMetric {
  id: string;
  name: string;
  description: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export const TableSummaryPage: React.FC = () => {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<Upload | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [rowLimit, setRowLimit] = useState(100);
  const [showFilters, setShowFilters] = useState(false);
  const [dataViewType, setDataViewType] = useState<DataViewType>('raw');
  const [selectedAggregation, setSelectedAggregation] = useState<string>('');
  const [calculatedMetrics, setCalculatedMetrics] = useState<CalculatedMetric[]>([]);

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    try {
      const response = await apiService.getUploads();
      if (response.success && response.data) {
        setUploads(response.data);
        if (response.data.length > 0) {
          setSelectedUpload(response.data[0]);
          setSelectedColumns(response.data[0].columns || []);
        }
      }
    } catch (error) {
      console.error('Failed to load uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async () => {
    if (!selectedUpload) return;
    
    setDataLoading(true);
    try {
      // Mock data for now since the API might not be fully implemented
      const mockData: TableData = {
        headers: selectedColumns,
        rows: generateMockRows(selectedColumns, Math.min(rowLimit, selectedUpload.recordCount)),
        totalRows: selectedUpload.recordCount
      };
      setTableData(mockData);
    } catch (error) {
      console.error('Failed to load table data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const generateMockRows = (columns: string[], count: number): any[][] => {
    const rows: any[][] = [];
    for (let i = 0; i < count; i++) {
      const row: any[] = [];
      columns.forEach(column => {
        switch (column.toLowerCase()) {
          case 'date':
            row.push(new Date(2025, 0, Math.floor(Math.random() * 30) + 1).toLocaleDateString());
            break;
          case 'symbol':
            const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META'];
            row.push(symbols[Math.floor(Math.random() * symbols.length)]);
            break;
          case 'action':
            row.push(Math.random() > 0.5 ? 'BUY' : 'SELL');
            break;
          case 'quantity':
          case 'shares':
            row.push(Math.floor(Math.random() * 1000) + 1);
            break;
          case 'price':
            row.push(`$${(Math.random() * 500 + 10).toFixed(2)}`);
            break;
          case 'total':
          case 'value':
            row.push(`$${(Math.random() * 50000 + 1000).toFixed(2)}`);
            break;
          case 'sector':
            const sectors = ['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer'];
            row.push(sectors[Math.floor(Math.random() * sectors.length)]);
            break;
          default:
            row.push(`Data ${i + 1}`);
        }
      });
      rows.push(row);
    }
    return rows;
  };

  useEffect(() => {
    if (selectedUpload && selectedColumns.length > 0) {
      loadTableData();
    }
  }, [selectedUpload, selectedColumns, rowLimit]);

  const handleUploadChange = (upload: Upload) => {
    setSelectedUpload(upload);
    setSelectedColumns(upload.columns || []);
    setTableData(null);
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column) 
        ? prev.filter(col => col !== column)
        : [...prev, column]
    );
  };

  const exportData = () => {
    if (!tableData) return;
    
    const csvContent = [
      selectedColumns.join(','),
      ...tableData.rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedUpload?.filename || 'data'}_summary.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <TableCellsIcon className="h-8 w-8 text-blue-600 mr-3" />
                Table Summary
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                View and analyze your uploaded data in table format
              </p>
            </div>
            {tableData && (
              <button
                onClick={exportData}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {uploads.length === 0 ? (
          <div className="text-center py-12">
            <TableCellsIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No data uploaded</h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload some trading data to view table summaries.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Upload Selection */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Data Source</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    onClick={() => handleUploadChange(upload)}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                      selectedUpload?.id === upload.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{upload.originalName}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {upload.recordCount.toLocaleString()} rows • {upload.columns?.length || 0} columns
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(upload.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedUpload?.id === upload.id && (
                        <div className="h-4 w-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="h-2 w-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedUpload && (
              <>
                {/* Filters and Controls */}
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Display Options</h3>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <FunnelIcon className="h-4 w-4 mr-2" />
                      Filters
                      <ChevronDownIcon className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {showFilters && (
                    <div className="border-t pt-4 space-y-4">
                      {/* Column Selection */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Select Columns to Display
                        </label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                          {selectedUpload.columns?.map((column) => (
                            <label key={column} className="inline-flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedColumns.includes(column)}
                                onChange={() => handleColumnToggle(column)}
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                              />
                              <span className="ml-2 text-sm text-gray-700">{column}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Row Limit */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Number of Rows to Display
                        </label>
                        <select
                          value={rowLimit}
                          onChange={(e) => setRowLimit(Number(e.target.value))}
                          className="mt-1 block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          <option value={50}>50 rows</option>
                          <option value={100}>100 rows</option>
                          <option value={250}>250 rows</option>
                          <option value={500}>500 rows</option>
                          <option value={1000}>1000 rows</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Data Table */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        {selectedUpload.originalName}
                      </h3>
                      <div className="text-sm text-gray-500">
                        Showing {tableData?.rows.length || 0} of {selectedUpload.recordCount.toLocaleString()} rows
                      </div>
                    </div>
                  </div>

                  {dataLoading ? (
                    <div className="p-8">
                      <LoadingSpinner />
                    </div>
                  ) : tableData && selectedColumns.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {selectedColumns.map((header) => (
                              <th
                                key={header}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tableData.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50">
                              {row.map((cell, cellIndex) => (
                                <td
                                  key={cellIndex}
                                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <EyeIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No columns selected</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Select at least one column to display the data.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};