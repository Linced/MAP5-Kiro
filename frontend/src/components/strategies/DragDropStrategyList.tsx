import React, { useState, useCallback } from 'react';
import { Strategy, StrategyBucket } from '../../types';
import apiService from '../../services/api';

interface DragDropStrategyListProps {
  strategies: Strategy[];
  buckets: StrategyBucket[];
  onStrategyUpdate: (strategy: Strategy) => void;
  onEditStrategy: (strategy: Strategy) => void;
}

const DragDropStrategyList: React.FC<DragDropStrategyListProps> = ({
  strategies,
  buckets,
  onStrategyUpdate,
  onEditStrategy
}) => {
  const [draggedStrategy, setDraggedStrategy] = useState<Strategy | null>(null);
  const [dragOverBucket, setDragOverBucket] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group strategies by bucket
  const groupedStrategies = React.useMemo(() => {
    const groups: { [key: string]: Strategy[] } = {
      unbucketed: strategies.filter(s => !s.bucketId)
    };

    buckets.forEach(bucket => {
      groups[bucket.id] = strategies.filter(s => s.bucketId === bucket.id);
    });

    return groups;
  }, [strategies, buckets]);

  const handleDragStart = useCallback((e: React.DragEvent, strategy: Strategy) => {
    setDraggedStrategy(strategy);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', strategy.id.toString());
    
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedStrategy(null);
    setDragOverBucket(null);
    
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, bucketId: number | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverBucket(bucketId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverBucket(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetBucketId: number | null) => {
    e.preventDefault();
    setDragOverBucket(null);

    if (!draggedStrategy) return;

    // Don't do anything if dropping in the same bucket
    if (draggedStrategy.bucketId === targetBucketId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.assignStrategyToBucket(draggedStrategy.id, targetBucketId);
      
      if (response.success) {
        // Update the strategy with new bucket assignment
        const updatedStrategy = {
          ...draggedStrategy,
          bucketId: targetBucketId
        };
        onStrategyUpdate(updatedStrategy);
      } else {
        setError(response.error.message);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to move strategy');
    } finally {
      setLoading(false);
      setDraggedStrategy(null);
    }
  }, [draggedStrategy, onStrategyUpdate]);

  const StrategyCard: React.FC<{ strategy: Strategy }> = ({ strategy }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, strategy)}
      onDragEnd={handleDragEnd}
      className={`bg-white border rounded-lg p-4 cursor-move hover:shadow-md transition-shadow ${
        draggedStrategy?.id === strategy.id ? 'opacity-50' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900 truncate">{strategy.name}</h4>
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
          <button
            onClick={() => onEditStrategy(strategy)}
            className="p-1 text-gray-400 hover:text-blue-500"
            title="Edit strategy"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

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

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
        <div>
          <span>Entry Rules: </span>
          <span className="font-medium">{strategy.entryRules.length}</span>
        </div>
        <div>
          <span>Exit Rules: </span>
          <span className="font-medium">{strategy.exitRules.length}</span>
        </div>
      </div>

      {/* Drag handle indicator */}
      <div className="flex justify-center mt-3 opacity-30">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 10h2v2H8v-2zm6 0h2v2h-2v-2zM8 14h2v2H8v-2zm6 0h2v2h-2v-2z"/>
        </svg>
      </div>
    </div>
  );

  const BucketColumn: React.FC<{ 
    bucketId: number | null; 
    bucketName: string; 
    bucketColor: string; 
    strategies: Strategy[] 
  }> = ({ bucketId, bucketName, bucketColor, strategies }) => (
    <div className="flex-1 min-w-80">
      <div
        className={`border-2 border-dashed rounded-lg p-4 min-h-96 ${
          dragOverBucket === bucketId
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50'
        }`}
        onDragOver={(e) => handleDragOver(e, bucketId)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, bucketId)}
      >
        {/* Bucket Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: bucketColor }}
          />
          <h3 className="text-lg font-semibold text-gray-900">{bucketName}</h3>
          <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-full">
            {strategies.length}
          </span>
        </div>

        {/* Drop Zone Message */}
        {draggedStrategy && dragOverBucket === bucketId && (
          <div className="text-center py-8 text-blue-600">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <p className="text-sm font-medium">
              Drop "{draggedStrategy.name}" here
            </p>
          </div>
        )}

        {/* Strategies */}
        <div className="space-y-3">
          {strategies.map(strategy => (
            <StrategyCard key={strategy.id} strategy={strategy} />
          ))}
        </div>

        {/* Empty State */}
        {strategies.length === 0 && !draggedStrategy && (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-sm">No strategies in this bucket</p>
            <p className="text-xs mt-1">Drag strategies here to organize them</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Strategy Organization</h2>
          <p className="text-gray-600 mt-1">
            Drag and drop strategies between buckets to organize them
          </p>
        </div>
        
        {loading && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">Moving strategy...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900">How to use:</h4>
            <ul className="text-sm text-blue-800 mt-1 space-y-1">
              <li>• Click and drag strategy cards to move them between buckets</li>
              <li>• Drop strategies in the "Unbucketed" column to remove bucket assignment</li>
              <li>• Use the edit button on each card to modify strategy details</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Drag and Drop Columns */}
      <div className="flex space-x-6 overflow-x-auto pb-4">
        {/* Unbucketed Strategies Column */}
        <BucketColumn
          bucketId={null}
          bucketName="Unbucketed Strategies"
          bucketColor="#6B7280"
          strategies={groupedStrategies.unbucketed || []}
        />

        {/* Bucket Columns */}
        {buckets.map(bucket => (
          <BucketColumn
            key={bucket.id}
            bucketId={bucket.id}
            bucketName={bucket.name}
            bucketColor={bucket.color || '#6B7280'}
            strategies={groupedStrategies[bucket.id] || []}
          />
        ))}
      </div>

      {/* Empty State */}
      {strategies.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Strategies Yet</h3>
          <p className="text-gray-600">Create some strategies to organize them with drag and drop.</p>
        </div>
      )}
    </div>
  );
};

export default DragDropStrategyList;