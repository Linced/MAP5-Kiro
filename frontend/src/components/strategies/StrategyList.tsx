import React, { useState, useEffect } from 'react';
import { Strategy, StrategyBucket, Tag } from '../../types';
import apiService from '../../services/api';

interface StrategyListProps {
  onEditStrategy: (strategy: Strategy) => void;
  onCreateStrategy: () => void;
  refreshTrigger?: number;
}

const StrategyList: React.FC<StrategyListProps> = ({ 
  onEditStrategy, 
  onCreateStrategy, 
  refreshTrigger 
}) => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [buckets, setBuckets] = useState<StrategyBucket[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<number | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'updatedAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  useEffect(() => {
    loadStrategies();
  }, [searchTerm, selectedBucket, selectedTag, showActiveOnly, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      const [bucketsResponse, tagsResponse] = await Promise.all([
        apiService.getBuckets(),
        apiService.getTags()
      ]);

      if (bucketsResponse.success) {
        setBuckets(bucketsResponse.data);
      }
      if (tagsResponse.success) {
        setTags(tagsResponse.data);
      }

      await loadStrategies();
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    }
  };

  const loadStrategies = async () => {
    try {
      setLoading(true);
      const response = await apiService.getStrategies({
        name: searchTerm || undefined,
        bucketId: selectedBucket || undefined,
        isActive: showActiveOnly ? true : undefined,
        sortBy,
        sortOrder
      });

      if (response.success) {
        let filteredStrategies = response.data;
        
        // Filter by tag if selected (client-side filtering since API doesn't support tag filtering directly)
        if (selectedTag) {
          filteredStrategies = filteredStrategies.filter(strategy => 
            strategy.tags?.some(tag => tag.id === selectedTag)
          );
        }
        
        setStrategies(filteredStrategies);
      } else {
        setError(response.error.message);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load strategies');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStrategy = async (strategy: Strategy) => {
    if (!confirm(`Are you sure you want to delete "${strategy.name}"?`)) {
      return;
    }

    try {
      const response = await apiService.deleteStrategy(strategy.id);
      if (response.success) {
        setStrategies(prev => prev.filter(s => s.id !== strategy.id));
      } else {
        setError(response.error.message);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to delete strategy');
    }
  };

  const toggleStrategyStatus = async (strategy: Strategy) => {
    try {
      const response = await apiService.updateStrategy(strategy.id, {
        id: strategy.id,
        isActive: !strategy.isActive
      });
      
      if (response.success) {
        setStrategies(prev => prev.map(s => 
          s.id === strategy.id ? { ...s, isActive: !s.isActive } : s
        ));
      } else {
        setError(response.error.message);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update strategy status');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedBucket(null);
    setSelectedTag(null);
    setShowActiveOnly(false);
  };

  const getBucketName = (bucketId?: number) => {
    if (!bucketId) return 'No Bucket';
    const bucket = buckets.find(b => b.id === bucketId);
    return bucket?.name || 'Unknown Bucket';
  };

  const getBucketColor = (bucketId?: number) => {
    if (!bucketId) return '#6B7280';
    const bucket = buckets.find(b => b.id === bucketId);
    return bucket?.color || '#6B7280';
  };

  if (loading && strategies.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Trading Strategies</h2>
        <button
          onClick={onCreateStrategy}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Create Strategy
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search strategies..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bucket
            </label>
            <select
              value={selectedBucket || ''}
              onChange={(e) => setSelectedBucket(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Buckets</option>
              <option value="0">No Bucket</option>
              {buckets.map(bucket => (
                <option key={bucket.id} value={bucket.id}>
                  {bucket.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tag
            </label>
            <select
              value={selectedTag || ''}
              onChange={(e) => setSelectedTag(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Tags</option>
              {tags.map(tag => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as 'name' | 'createdAt' | 'updatedAt');
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="updatedAt-desc">Recently Updated</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Active strategies only</span>
            </label>
          </div>

          <button
            onClick={clearFilters}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Strategy Cards */}
      {strategies.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">
            {searchTerm || selectedBucket || selectedTag || showActiveOnly
              ? 'No strategies match your filters'
              : 'No strategies created yet'
            }
          </div>
          {!searchTerm && !selectedBucket && !selectedTag && !showActiveOnly && (
            <button
              onClick={onCreateStrategy}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Create Your First Strategy
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map(strategy => (
            <div
              key={strategy.id}
              className="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow"
            >
              {/* Strategy Header */}
              <div className="p-4 border-b">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {strategy.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        strategy.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {strategy.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Bucket */}
                <div className="flex items-center mb-2">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: getBucketColor(strategy.bucketId) }}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {getBucketName(strategy.bucketId)}
                  </span>
                </div>

                {/* Description */}
                {strategy.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {strategy.description}
                  </p>
                )}

                {/* Tags */}
                {strategy.tags && strategy.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {strategy.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag.id}
                        className="px-2 py-1 text-xs rounded-full border"
                        style={{
                          backgroundColor: tag.color ? `${tag.color}20` : '#F3F4F6',
                          borderColor: tag.color || '#D1D5DB',
                          color: tag.color || '#6B7280'
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                    {strategy.tags.length > 3 && (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                        +{strategy.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Strategy Details */}
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Entry Rules:</span>
                    <span className="ml-1 font-medium">{strategy.entryRules.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Exit Rules:</span>
                    <span className="ml-1 font-medium">{strategy.exitRules.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Stop Loss:</span>
                    <span className="ml-1 font-medium">
                      {strategy.riskManagement.stopLossPercentage 
                        ? `${strategy.riskManagement.stopLossPercentage}%`
                        : 'Not set'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Take Profit:</span>
                    <span className="ml-1 font-medium">
                      {strategy.riskManagement.takeProfitPercentage 
                        ? `${strategy.riskManagement.takeProfitPercentage}%`
                        : 'Not set'
                      }
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mt-3">
                  Created: {new Date(strategy.createdAt).toLocaleDateString()}
                  {strategy.updatedAt !== strategy.createdAt && (
                    <span className="ml-2">
                      Updated: {new Date(strategy.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 bg-gray-50 rounded-b-lg flex justify-between items-center">
                <button
                  onClick={() => toggleStrategyStatus(strategy)}
                  className={`text-sm px-3 py-1 rounded ${
                    strategy.isActive
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                >
                  {strategy.isActive ? 'Deactivate' : 'Activate'}
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={() => onEditStrategy(strategy)}
                    className="text-sm px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteStrategy(strategy)}
                    className="text-sm px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading overlay for refresh */}
      {loading && strategies.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading strategies...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyList;