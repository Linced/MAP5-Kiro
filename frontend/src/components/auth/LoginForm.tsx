import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'demo@tradeinsight.com',
      password: 'demo123456'
    }
  });

  const onSubmit = async (data: LoginFormData, event?: React.BaseSyntheticEvent) => {
    // Prevent default form submission
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('Form submitted with data:', data);
    setIsSubmitting(true);
    setServerError(null);
    setDebugInfo(null);

    try {
      console.log('Calling login function...');
      const response = await login(data.email, data.password);
      console.log('Login response:', response);
      
      if (response.success) {
        console.log('Login successful, navigating...');
        navigate(from, { replace: true });
      } else {
        console.log('Login failed:', response.error);
        setServerError(response.error.message);
        setDebugInfo(`Error details: ${JSON.stringify(response.error)}`);
      }
    } catch (error) {
      console.log('Login error caught:', error);
      setServerError('An unexpected error occurred. Please try again.');
      setDebugInfo(`Caught error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    } finally {
      console.log('Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              create a new account
            </Link>
          </p>
          
          {/* Demo Credentials */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-center">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Demo Account</h3>
              <div className="text-xs text-blue-700 space-y-1">
                <div><strong>Email:</strong> demo@tradeinsight.com</div>
                <div><strong>Password:</strong> demo123456</div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Use these credentials to explore the application
              </p>
            </div>
          </div>
        </div>
        
        <form 
          className="mt-8 space-y-6" 
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(onSubmit)(e);
          }}
        >
          {serverError && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{serverError}</div>
              {debugInfo && (
                <div className="mt-2 text-xs text-red-600 font-mono">
                  {debugInfo}
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                {...register('email')}
                id="email"
                type="email"
                autoComplete="email"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                {...register('password')}
                id="password"
                type="password"
                autoComplete="current-password"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit(onSubmit)();
              }}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};