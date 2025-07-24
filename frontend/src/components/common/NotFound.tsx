import React from 'react';
import { Link } from 'react-router-dom';
import { 
  HomeIcon, 
  ChartBarIcon, 
  DocumentArrowUpIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface NotFoundProps {
  message?: string;
  showNavigation?: boolean;
}

export const NotFound: React.FC<NotFoundProps> = ({
  message = "Page not found",
  showNavigation = true
}) => {
  const quickLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, description: 'Go to your main dashboard' },
    { name: 'Upload Data', href: '/upload', icon: DocumentArrowUpIcon, description: 'Upload trading data' },
    { name: 'Data Analysis', href: '/data', icon: ChartBarIcon, description: 'Analyze your data' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            404 - {message}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
      </div>

      {showNavigation && (
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 text-center">
              Quick Navigation
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="relative group bg-white dark:bg-gray-700 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-400 hover:shadow-md transition-all"
                  >
                    <div>
                      <span className="rounded-lg inline-flex p-3 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 ring-4 ring-white dark:ring-gray-700">
                        <Icon className="h-6 w-6" />
                      </span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {link.name}
                      </h3>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {link.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
            
            <div className="mt-8 text-center">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <HomeIcon className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};