import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  ChartBarIcon, 
  DocumentArrowUpIcon, 
  CogIcon, 
  HomeIcon,
  FolderIcon,
  TagIcon,
  TableCellsIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Upload Data', href: '/upload', icon: DocumentArrowUpIcon },
    { name: 'Table Summary', href: '/table-summary', icon: TableCellsIcon },
    { name: 'Data Analysis', href: '/data', icon: ChartBarIcon },
    { name: 'Strategies', href: '/strategies', icon: FolderIcon },
    { name: 'Tags', href: '/tags', icon: TagIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 bg-white dark:bg-gray-800 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">TradeInsight</h1>
              </div>
              <div className="ml-auto">
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? (
                    <SunIcon className="h-5 w-5" />
                  ) : (
                    <MoonIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/50 border-r-2 border-blue-500 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                  >
                    <Icon
                      className={`${
                        isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                      } mr-3 flex-shrink-0 h-5 w-5`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            {/* Settings link above user info */}
            <div className="px-2 pb-2">
              <Link
                to="/settings"
                className={`${
                  location.pathname === '/settings'
                    ? 'bg-blue-50 dark:bg-blue-900/50 border-r-2 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
              >
                <CogIcon className={`${
                  location.pathname === '/settings' ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                } mr-3 flex-shrink-0 h-5 w-5`} />
                Settings
              </Link>
            </div>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{user?.email}</p>
                <button
                  onClick={handleLogout}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
        <div className="md:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">TradeInsight</h1>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? (
                    <SunIcon className="h-5 w-5" />
                  ) : (
                    <MoonIcon className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
};