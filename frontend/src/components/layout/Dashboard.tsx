import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';

import { 
  ChartBarIcon, 
  DocumentArrowUpIcon, 
  CogIcon, 
  HomeIcon,
  FolderIcon,
  TagIcon,
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
  const { user, logout } = useAuth();
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load uploads
      const uploadsResponse = await apiService.getUploads();
      if (uploadsResponse.success) {
        setUploads(uploadsResponse.data || []);
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
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, current: true },
    { name: 'Upload Data', href: '/upload', icon: DocumentArrowUpIcon, current: false },
    { name: 'Data Analysis', href: '/data', icon: ChartBarIcon, current: false },
    { name: 'Strategies', href: '/strategies', icon: FolderIcon, current: false },
    { name: 'Tags', href: '/tags', icon: TagIcon, current: false },
    { name: 'Settings', href: '/settings', icon: CogIcon, current: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r border-gray-200">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">TradeInsight</h1>
              </div>
            </div>
          </div>
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      item.current
                        ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                  >
                    <Icon
                      className={`${
                        item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                      } mr-3 flex-shrink-0 h-5 w-5`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 truncate">{user?.email}</p>
                <button
                  onClick={handleLogout}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header for mobile */}
        <div className="md:hidden bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900">TradeInsight</h1>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {/* Page header */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Welcome back! Here's what's happening with your trading data.
                </p>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ChartBarIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Trades</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.totalTrades.toLocaleString()}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total P&L</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            ${stats.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ArrowTrendingUpIcon className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Win Rate</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.winRate}%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <FolderIcon className="h-6 w-6 text-purple-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Strategies</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.totalStrategies}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main content grid */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Recent uploads */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Uploads</h3>
                      <Link
                        to="/upload"
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Upload
                      </Link>
                    </div>
                    {loading ? (
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    ) : uploads.length > 0 ? (
                      <div className="space-y-3">
                        {uploads.slice(0, 5).map((upload, index) => (
                          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-center">
                              <DocumentArrowUpIcon className="h-5 w-5 text-gray-400 mr-3" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{upload.filename || `Upload ${index + 1}`}</p>
                                <p className="text-xs text-gray-500">{upload.uploadDate || 'Recently uploaded'}</p>
                              </div>
                            </div>
                            <Link
                              to={`/data?upload=${upload.id}`}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No uploads yet</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by uploading your trading data.</p>
                        <div className="mt-6">
                          <Link
                            to="/upload"
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
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
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Trading Strategies</h3>
                      <Link
                        to="/strategies"
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Create
                      </Link>
                    </div>
                    {loading ? (
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    ) : strategies.length > 0 ? (
                      <div className="space-y-3">
                        {strategies.slice(0, 5).map((strategy, index) => (
                          <div key={strategy.id || index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-center">
                              <FolderIcon className="h-5 w-5 text-gray-400 mr-3" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{strategy.name || `Strategy ${index + 1}`}</p>
                                <p className="text-xs text-gray-500">
                                  {strategy.isActive ? 'Active' : 'Inactive'} • {strategy.description || 'No description'}
                                </p>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              strategy.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {strategy.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No strategies yet</h3>
                        <p className="mt-1 text-sm text-gray-500">Create your first trading strategy to get started.</p>
                        <div className="mt-6">
                          <Link
                            to="/strategies"
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
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
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <Link
                        to="/upload"
                        className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                      >
                        <div>
                          <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                            <DocumentArrowUpIcon className="h-6 w-6" />
                          </span>
                        </div>
                        <div className="mt-4">
                          <h3 className="text-lg font-medium text-gray-900">Upload Data</h3>
                          <p className="mt-2 text-sm text-gray-500">
                            Import your trading data from CSV files
                          </p>
                        </div>
                      </Link>

                      <Link
                        to="/data"
                        className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-green-500 rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all"
                      >
                        <div>
                          <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                            <ChartBarIcon className="h-6 w-6" />
                          </span>
                        </div>
                        <div className="mt-4">
                          <h3 className="text-lg font-medium text-gray-900">Analyze Data</h3>
                          <p className="mt-2 text-sm text-gray-500">
                            Explore and visualize your trading performance
                          </p>
                        </div>
                      </Link>

                      <Link
                        to="/strategies"
                        className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-purple-500 rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all"
                      >
                        <div>
                          <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                            <FolderIcon className="h-6 w-6" />
                          </span>
                        </div>
                        <div className="mt-4">
                          <h3 className="text-lg font-medium text-gray-900">Manage Strategies</h3>
                          <p className="mt-2 text-sm text-gray-500">
                            Create and organize your trading strategies
                          </p>
                        </div>
                      </Link>

                      <Link
                        to="/settings"
                        className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gray-500 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
                      >
                        <div>
                          <span className="rounded-lg inline-flex p-3 bg-gray-50 text-gray-700 ring-4 ring-white">
                            <CogIcon className="h-6 w-6" />
                          </span>
                        </div>
                        <div className="mt-4">
                          <h3 className="text-lg font-medium text-gray-900">Settings</h3>
                          <p className="mt-2 text-sm text-gray-500">
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
        </main>
      </div>
    </div>
  );
};