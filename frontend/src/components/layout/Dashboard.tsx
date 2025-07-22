import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api';
import { LineChart, BarChart, PieChart } from '../charts';

import {
  ChartBarIcon,
  DocumentArrowUpIcon,
  CogIcon,
  FolderIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalTrades: number;
  totalProfit: number;
  winRate: number;
  totalStrategies: number;
  recentUploads: number;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalTrades: 0,
    totalProfit: 0,
    winRate: 0,
    totalStrategies: 0,
    recentUploads: 0
  });
  const [uploads, setUploads] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any>(null);
  const [pieChartData, setPieChartData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load uploads
      const uploadsResponse = await apiService.getUploads();
      if (uploadsResponse.success) {
        setUploads(uploadsResponse.data || []);
        
        // If we have uploads, try to load chart data for the first one
        if (uploadsResponse.data && uploadsResponse.data.length > 0) {
          const firstUpload = uploadsResponse.data[0];
          loadChartData(firstUpload.id);
        }
      }

      // Load strategies
      const strategiesResponse = await apiService.getStrategies({ limit: 5 });
      if (strategiesResponse.success) {
        setStrategies(strategiesResponse.data || []);
      }

      // Calculate stats (mock data for now)
      setStats({
        totalTrades: 1247,
        totalProfit: 15420.50,
        winRate: 68.5,
        totalStrategies: strategiesResponse.success ? strategiesResponse.data?.length || 0 : 0,
        recentUploads: uploadsResponse.success ? uploadsResponse.data?.length || 0 : 0
      });
      
      // Create sample pie chart data for strategy distribution
      setPieChartData({
        labels: ['Breakout', 'Trend Following', 'Mean Reversion', 'Scalping', 'Swing'],
        datasets: [
          {
            data: [30, 25, 20, 15, 10],
            backgroundColor: [
              '#4F46E5', // Indigo
              '#10B981', // Green
              '#F59E0B', // Amber
              '#EF4444', // Red
              '#8B5CF6'  // Purple
            ]
          }
        ]
      });
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadChartData = async (uploadId: string) => {
    try {
      // Try to get some sample chart data for the dashboard
      const chartResponse = await apiService.getChartData({
        uploadId,
        xColumn: 'date', // Assuming there's a date column
        yColumn: 'profit', // Assuming there's a profit column
        chartType: 'line'
      });
      
      if (chartResponse.success) {
        setChartData(chartResponse.data.chartData);
      } else {
        // If we couldn't get real data, create some sample data
        setChartData({
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [
            {
              label: 'Trading Performance',
              data: [12, 19, 3, 5, 2, 3],
              borderColor: '#4F46E5',
              backgroundColor: 'rgba(79, 70, 229, 0.1)',
              tension: 0.4
            }
          ]
        });
      }
    } catch (error) {
      console.error('Failed to load chart data:', error);
      // Create sample data on error
      setChartData({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Trading Performance',
            data: [12, 19, 3, 5, 2, 3],
            borderColor: '#4F46E5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            tension: 0.4
          }
        ]
      });
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Welcome back! Here's what's happening with your trading data.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Trades</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">{stats.totalTrades.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total P&L</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      ${stats.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ArrowTrendingUpIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Win Rate</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">{stats.winRate}%</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FolderIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Strategies</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">{stats.totalStrategies}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
          {/* Performance Chart */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Performance Overview</h3>
                <Link
                  to="/charts"
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900/70"
                >
                  <ChartBarIcon className="h-4 w-4 mr-1" />
                  View All
                </Link>
              </div>
              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ) : chartData ? (
                <LineChart 
                  data={chartData} 
                  options={{
                    title: 'Trading Performance',
                    xAxisLabel: 'Date',
                    yAxisLabel: 'Profit/Loss',
                    height: 300
                  }}
                />
              ) : (
                <div className="text-center py-6">
                  <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No chart data available</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload trading data to see performance charts.</p>
                </div>
              )}
            </div>
          </div>

          {/* Strategy Distribution */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Strategy Distribution</h3>
                <Link
                  to="/strategies"
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-900/70"
                >
                  <FolderIcon className="h-4 w-4 mr-1" />
                  Manage
                </Link>
              </div>
              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ) : pieChartData ? (
                <PieChart 
                  data={pieChartData} 
                  options={{
                    donut: true,
                    showPercentage: true,
                    height: 300
                  }}
                />
              ) : (
                <div className="text-center py-6">
                  <FolderIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No strategies yet</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create strategies to see distribution.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent uploads */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Recent Uploads</h3>
                <Link
                  to="/upload"
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900/70"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Upload
                </Link>
              </div>
              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
              ) : uploads.length > 0 ? (
                <div className="space-y-3">
                  {uploads.slice(0, 5).map((upload, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <div className="flex items-center">
                        <DocumentArrowUpIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{upload.filename || `Upload ${index + 1}`}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{upload.uploadDate || 'Recently uploaded'}</p>
                        </div>
                      </div>
                      <Link
                        to={`/data?upload=${upload.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No uploads yet</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by uploading your trading data.</p>
                  <div className="mt-6">
                    <Link
                      to="/upload"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Upload Data
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Strategies */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Trading Strategies</h3>
                <Link
                  to="/strategies"
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-900/70"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Create
                </Link>
              </div>
              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
              ) : strategies.length > 0 ? (
                <div className="space-y-3">
                  {strategies.slice(0, 5).map((strategy, index) => (
                    <div key={strategy.id || index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <div className="flex items-center">
                        <FolderIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{strategy.name || `Strategy ${index + 1}`}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {strategy.isActive ? 'Active' : 'Inactive'} • {strategy.description || 'No description'}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${strategy.isActive ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>
                        {strategy.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FolderIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No strategies yet</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create your first trading strategy to get started.</p>
                  <div className="mt-6">
                    <Link
                      to="/strategies"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create Strategy
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Link
                  to="/upload"
                  className="relative group bg-white dark:bg-gray-700 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-400 hover:shadow-md transition-all"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 ring-4 ring-white dark:ring-gray-700">
                      <DocumentArrowUpIcon className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Upload Data</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Import your trading data from CSV files
                    </p>
                  </div>
                </Link>

                <Link
                  to="/data"
                  className="relative group bg-white dark:bg-gray-700 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-green-500 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-400 hover:shadow-md transition-all"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300 ring-4 ring-white dark:ring-gray-700">
                      <ChartBarIcon className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Analyze Data</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Explore and visualize your trading performance
                    </p>
                  </div>
                </Link>

                <Link
                  to="/strategies"
                  className="relative group bg-white dark:bg-gray-700 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-purple-500 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-400 hover:shadow-md transition-all"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-purple-50 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 ring-4 ring-white dark:ring-gray-700">
                      <FolderIcon className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Manage Strategies</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Create and organize your trading strategies
                    </p>
                  </div>
                </Link>

                <Link
                  to="/settings"
                  className="relative group bg-white dark:bg-gray-700 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gray-500 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-400 hover:shadow-md transition-all"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-gray-50 dark:bg-gray-600 text-gray-700 dark:text-gray-300 ring-4 ring-white dark:ring-gray-700">
                      <CogIcon className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Settings</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Configure your account and preferences
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};