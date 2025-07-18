import React, { useState, useEffect } from 'react';
import { Strategy, StrategyBucket, Tag } from '../../types/index';
import apiService from '../../services/api';

interface StrategyAnalyticsProps {
  strategies: Strategy[];
  refreshTrigger?: number;
}

const StrategyAnalytics: React.FC<StrategyAnalyticsProps> = ({ strategies, refreshTrigger }) => {
  const [buckets, setBuckets] = useState<StrategyBucket[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBucketsAndTags();
  }, [refreshTrigger]);

  const loadBucketsAndTags = async () => {
    try {
      setLoading(true);
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
    } catch (error) {
      console.error('Error loading buckets and tags:', error);
    } finally {
      setLoading(false);
    }
  };

  // Basic metrics
  const totalStrategies = strategies.length;
  const activeStrategies = strategies.filter(s => s.isActive).length;
  const inactiveStrategies = totalStrategies - activeStrategies;

  // Bucket distribution
  const bucketDistribution = buckets.map(bucket => ({
    ...bucket,
    count: strategies.filter(s => s.bucketId === bucket.id).length
  }));
  const unbucketedStrategies = strategies.filter(s => !s.bucketId).length;

  // Tag usage
  const tagUsage = tags.map(tag => ({
    ...tag,
    count: strategies.filter(s => s.tags?.some(t => t.id === tag.id)).length
  })).sort((a, b) => b.count - a.count);

  // Risk management analysis
  const strategiesWithStopLoss = strategies.filter(s => 
    s.riskManagement.stopLossPercentage && s.riskManagement.stopLossPercentage > 0
  ).length;
  const strategiesWithTakeProfit = strategies.filter(s => 
    s.riskManagement.takeProfitPercentage && s.riskManagement.takeProfitPercentage > 0
  ).length;

  // Entry/Exit rules analysis
  const avgEntryRules = strategies.length > 0 
    ? (strategies.reduce((sum, s) => sum + s.entryRules.length, 0) / strategies.length).toFixed(1)
    : '0';
  const avgExitRules = strategies.length > 0 
    ? (strategies.reduce((sum, s) => sum + s.exitRules.length, 0) / strategies.length).toFixed(1)
    : '0';

  // Recent activity
  const recentStrategies = strategies
    .filter(s => {
      const createdDate = new Date(s.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdDate > weekAgo;
    }).length;

  const recentUpdates = strategies
    .filter(s => {
      const updatedDate = new Date(s.updatedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return updatedDate > weekAgo && s.updatedAt !== s.createdAt;
    }).length;

  if (loading && strategies.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-6">Strategy Analytics Overview</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{totalStrategies}</div>
            <div className="text-sm text-gray-600">Total Strategies</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{activeStrategies}</div>
            <div className="text-sm text-gray-600">Active Strategies</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-600">{inactiveStrategies}</div>
            <div className="text-sm text-gray-600">Inactive Strategies</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{buckets.length}</div>
            <div className="text-sm text-gray-600">Strategy Buckets</div>
          </div>
        </div>
      </div>

      {/* Risk Management Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Risk Management</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{strategiesWithStopLoss}</div>
            <div className="text-sm text-gray-600">With Stop Loss</div>
            <div className="text-xs text-gray-500">
              {totalStrategies > 0 ? Math.round((strategiesWithStopLoss / totalStrategies) * 100) : 0}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{strategiesWithTakeProfit}</div>
            <div className="text-sm text-gray-600">With Take Profit</div>
            <div className="text-xs text-gray-500">
              {totalStrategies > 0 ? Math.round((strategiesWithTakeProfit / totalStrategies) * 100) : 0}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{avgEntryRules}</div>
            <div className="text-sm text-gray-600">Avg Entry Rules</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{avgExitRules}</div>
            <div className="text-sm text-gray-600">Avg Exit Rules</div>
          </div>
        </div>
      </div>

      {/* Bucket Distribution */}
      {buckets.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Bucket Distribution</h3>
          
          <div className="space-y-3">
            {bucketDistribution.map(bucket => (
              <div key={bucket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: bucket.color || '#6B7280' }}
                  />
                  <span className="font-medium">{bucket.name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">{bucket.count} strategies</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        backgroundColor: bucket.color || '#6B7280',
                        width: totalStrategies > 0 ? `${(bucket.count / totalStrategies) * 100}%` : '0%'
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-10 text-right">
                    {totalStrategies > 0 ? Math.round((bucket.count / totalStrategies) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
            
            {unbucketedStrategies > 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full bg-gray-400" />
                  <span className="font-medium">No Bucket</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">{unbucketedStrategies} strategies</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-400 h-2 rounded-full"
                      style={{
                        width: totalStrategies > 0 ? `${(unbucketedStrategies / totalStrategies) * 100}%` : '0%'
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-10 text-right">
                    {totalStrategies > 0 ? Math.round((unbucketedStrategies / totalStrategies) * 100) : 0}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tag Usage */}
      {tags.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Popular Tags</h3>
          
          <div className="flex flex-wrap gap-3">
            {tagUsage.slice(0, 10).map(tag => (
              <div
                key={tag.id}
                className="flex items-center space-x-2 px-3 py-2 rounded-full border"
                style={{
                  backgroundColor: tag.color ? `${tag.color}20` : '#F3F4F6',
                  borderColor: tag.color || '#D1D5DB'
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{ color: tag.color || '#6B7280' }}
                >
                  {tag.name}
                </span>
                <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-600">
                  {tag.count}
                </span>
              </div>
            ))}
          </div>
          
          {tagUsage.length > 10 && (
            <p className="text-sm text-gray-500 mt-3">
              Showing top 10 of {tagUsage.length} tags
            </p>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Recent Activity (Last 7 Days)</h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{recentStrategies}</div>
            <div className="text-sm text-gray-600">New Strategies</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{recentUpdates}</div>
            <div className="text-sm text-gray-600">Strategy Updates</div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {totalStrategies === 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <div className="text-gray-500 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Strategies Yet</h3>
            <p className="text-gray-600">Create your first trading strategy to see analytics here.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyAnalytics;