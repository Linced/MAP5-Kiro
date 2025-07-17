import React, { useState, useEffect } from 'react';
import { Upload } from '../../types';
import { apiService } from '../../services/api';
import DataTable from './DataTable';

const DataPage: React.FC = () => {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUploads = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiService.getUploads();
        
        if (response.success) {
          setUploads(response.data);
          // Auto-select the most recent upload if available
          if (response.data.length > 0) {
            setSelectedUpload(response.data[0].id);
          }
        } else {
          setError(response.error.message);
        }
      } catch (err) {
        setError('Failed to fetch uploads');
      } finally {
        setLoading(false);
      }
    };

    fetchUploads();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading uploads...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading uploads</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No data uploaded</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by uploading a CSV file with your trading data.
        </p>
        <div className="mt-6">
          <a
            href="/upload"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Upload CSV File
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Data View</h1>
        <p className="mt-1 text-sm text-gray-600">
          View and analyze your uploaded trading data
        </p>
      </div>

      {/* Upload Selector */}
      {uploads.length > 1 && (
        <div className="bg-white shadow rounded-lg p-4">
          <label htmlFor="upload-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Dataset
          </label>
          <select
            id="upload-select"
            value={selectedUpload || ''}
            onChange={(e) => setSelectedUpload(e.target.value)}
            className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            {uploads.map((upload) => (
              <option key={upload.id} value={upload.id}>
                {upload.filename} ({upload.rowCount.toLocaleString()} rows) - {new Date(upload.uploadedAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Data Table */}
      {selectedUpload && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <DataTable uploadId={selectedUpload} />
        </div>
      )}
    </div>
  );
};

export default DataPage;