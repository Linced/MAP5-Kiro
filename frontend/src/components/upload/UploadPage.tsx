import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { UploadHistory } from './UploadHistory';
import { Upload } from '../../types';

export const UploadPage: React.FC = () => {
  const [refreshHistory, setRefreshHistory] = useState(0);

  const handleUploadSuccess = (upload: Upload) => {
    // Trigger history refresh when upload succeeds
    setRefreshHistory(prev => prev + 1);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  const handleHistoryRefresh = () => {
    // This can be used to trigger other updates if needed
    console.log('Upload history refreshed');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload Data</h1>
          <p className="mt-2 text-gray-600">
            Upload your CSV files to analyze your trading data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Upload New File
            </h2>
            <FileUpload
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </div>

          {/* History Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <UploadHistory
              key={refreshHistory} // Force re-render when upload succeeds
              onRefresh={handleHistoryRefresh}
            />
          </div>
        </div>
      </div>
    </div>
  );
};