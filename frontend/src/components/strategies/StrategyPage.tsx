import React, { useState, useEffect } from 'react';
import { Strategy, StrategyBucket } from '../../types';
import StrategyForm from './StrategyForm';
import StrategyList from './StrategyList';
import BucketManager from './BucketManager';
import TagManager from './TagManager';
import StrategyAnalytics from './StrategyAnalytics';
import apiService from '../../services/api';
import { useErrorHandling, usePerformanceMonitoring } from '../../hooks/useErrorHandling';
import { useError } from '../../contexts/ErrorContext';
import { StrategyFallback } from '../common/FallbackComponents';
import { ErrorNotification } from '../common/ErrorNotification';

type ActiveTab = 'list' | 'analytics' | 'buckets' | 'tags' | 'organize';

const StrategyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [buckets, setBuckets] = useState<StrategyBucket[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasComponentError, setHasComponentError] = useState(false);

  // Error handling hooks
  const { handleAsyncOperation, trackUserAction, createUserMessage } = useErrorHandling('StrategyPage');
  const { measureOperation } = usePerformanceMonitoring('StrategyPage');
  const { showError, reportError } = useError();

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    const result = await handleAsyncOperation(
      async () => {
        setLoading(true);
        setError(null);
        setHasComponentError(false);

        return await measureOperation(async () => {
          const [strategiesResponse, bucketsResponse] = await Promise.all([
            apiService.getStrategies(),
            apiService.getBuckets()
          ]);
          
          if (strategiesResponse.success) {
            setStrategies(strategiesResponse.data);
            trackUserAction('strategies_loaded', { count: strategiesResponse.data.length });
          } else {
            throw new Error(strategiesResponse.error.message);
          }

          if (bucketsResponse.success) {
            setBuckets(bucketsResponse.data);
            trackUserAction('buckets_loaded', { count: bucketsResponse.data.length });
          } else {
            // Buckets are optional, just log the error
            reportError(new Error(bucketsResponse.error.message), { 
              operation: 'load_buckets',
              severity: 'low' 
            });
          }

          return { strategies: strategiesResponse.data, buckets: bucketsResponse.data };
        }, 'load_strategy_data');
      },
      'load strategy data',
      (error) => {
        setError(error);
        setHasComponentError(true);
        showError(error, {
          showRetry: true,
          onRetry: () => {
            setRefreshTrigger(prev => prev + 1);
          }
        });
      }
    );

    setLoading(false);

    if (!result) {
      setHasComponentError(true);
    }
  };

  const handleCreateStrategy = () => {
    setEditingStrategy(null);
    setShowForm(true);
  };

  const handleEditStrategy = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setShowForm(true);
  };

  const handleSaveStrategy = () => {
    setShowForm(false);
    setEditingStrategy(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingStrategy(null);
  };

  const handleDataChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleStrategyUpdate = (updatedStrategy: Strategy) => {
    setStrategies(prev => prev.map(s => 
      s.id === updatedStrategy.id ? updatedStrategy : s
    ));
  };

  const tabs = [
    { id: 'list' as ActiveTab, label: 'Strategies', icon: '📋' },
    { id: 'organize' as ActiveTab, label: 'Organize', icon: '🔄' },
    { id: 'analytics' as ActiveTab, label: 'Analytics', icon: '📊' },
    { id: 'buckets' as ActiveTab, label: 'Buckets', icon: '🗂️' },
    { id: 'tags' as ActiveTab, label: 'Tags', icon: '🏷️' }
  ];

  // Show fallback component if there's a critical error
  if (hasComponentError && error) {
    return (
      <StrategyFallback 
        onRetry={() => {
          setHasComponentError(false);
          setError(null);
          setRefreshTrigger(prev => prev + 1);
        }}
      />
    );
  }

  if (showForm) {
    return (
      <div className="container mx-auto px-4 py-6">
        <StrategyForm
          strategy={editingStrategy}
          onSave={handleSaveStrategy}
          onCancel={handleCancelForm}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Strategy Management</h1>
        <p className="text-gray-600">Manage your trading strategies, organize them into buckets, and track performance.</p>
      </div>

      {error && (
        <ErrorNotification
          error={error}
          onDismiss={() => setError(null)}
          showRetry={true}
          onRetry={() => {
            setError(null);
            setRefreshTrigger(prev => prev + 1);
          }}
          position="top"
        />
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'list' && (
          <StrategyList
            onEditStrategy={handleEditStrategy}
            onCreateStrategy={handleCreateStrategy}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'organize' && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Drag & Drop Organization</h3>
              <p className="text-gray-600">Drag and drop functionality for organizing strategies between buckets.</p>
              <p className="text-sm text-gray-500 mt-2">This feature allows you to visually organize your strategies by dragging them between different buckets.</p>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <StrategyAnalytics
            strategies={strategies}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'buckets' && (
          <BucketManager
            onBucketChange={handleDataChange}
          />
        )}

        {activeTab === 'tags' && (
          <TagManager
            onTagChange={handleDataChange}
          />
        )}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyPage;