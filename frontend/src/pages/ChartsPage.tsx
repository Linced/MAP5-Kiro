import React, { useState, useEffect } from 'react';
import { ChartBuilder } from '../components/charts';
import { apiService } from '../services/api';

interface Upload {
  id: string;
  filename: string;
  uploadedAt: string;
  rowCount: number;
}

const ChartsPage: React.FC = () => {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUploads();
      
      if (response.success) {
        setUploads(response.data || []);
        
        // Auto-select the first upload if available
        if (response.data && response.data.length > 0) {
          setSelectedUpload(response.data[0].id);
        }
      } else {
        setError(response.error?.message || 'Failed to load uploads');
      }
    } catch (err) {
      setError('An error occurred while loading uploads');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Charts & Visualization</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create interactive charts and visualizations from your trading data.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : uploads.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No data uploaded</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload some trading data to start creating charts.
            </p>
            <div className="mt-6">
              <a
                href="/upload"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Upload Data
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Upload selector */}
            <div className="mb-6">
              <label htmlFor="upload-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Data Source
              </label>
              <select
                id="upload-select"
                value={selectedUpload}
                onChange={(e) => setSelectedUpload(e.target.value)}
                className="block w-full max-w-md border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select an upload...</option>
                {uploads.map((upload) => (
                  <option key={upload.id} value={upload.id}>
                    {upload.filename} ({upload.rowCount} rows)
                  </option>
                ))}
              </select>
            </div>

            {/* Chart builder */}
            {selectedUpload && (
              <ChartBuilder 
                uploadId={selectedUpload}
                className="mb-8"
              />
            )}

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
                How to Create Charts
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li>Select a data source from the dropdown above</li>
                <li>Choose your chart type (Line, Bar, or Pie)</li>
                <li>Select the columns for X and Y axes</li>
                <li>Optionally group data or apply aggregations</li>
                <li>Customize colors, labels, and other options</li>
                <li>Click "Generate Chart" to create your visualization</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChartsPage;