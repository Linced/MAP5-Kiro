import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  ApiResponse,
  AuthResult,
  User,
  Upload,
  QueryOptions,
  Strategy,
  CreateStrategyRequest,
  UpdateStrategyRequest,
  StrategyBucket,
  CreateBucketRequest,
  UpdateBucketRequest,
  Tag,
  CreateTagRequest,
  UpdateTagRequest
} from '../types';
import { withRetry, API_RETRY_CONFIG, FILE_UPLOAD_RETRY_CONFIG } from '../utils/retry';
import { ErrorReporter, ErrorCodes } from '../utils/errors';
import { dataCache, uploadCache, calculationCache, chartCache, CacheService } from './cacheService';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Use environment variable for API URL with fallback
    const apiUrl = import.meta.env.VITE_API_URL;
    const isProduction = window.location.hostname !== 'localhost';
    
    if (isProduction) {
      // In production, use the environment variable or fallback to the render URL
      this.baseURL = apiUrl || 'https://map5-kiro-backend.onrender.com';
    } else {
      // In development, use localhost or the environment variable
      this.baseURL = apiUrl || 'http://localhost:3001';
    }
    
    console.log('🔧 API Service Constructor');
    console.log('Production mode:', isProduction);
    console.log('Using baseURL:', this.baseURL);
    console.log('Current location:', window.location.href);
    console.log('Environment VITE_API_URL:', import.meta.env.VITE_API_URL);
    
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('✅ Axios instance created with baseURL:', this.baseURL);

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config: any) => {
      const token = this.getToken();
      
      // Handle demo token specially
      if (token && token.startsWith('demo_')) {
        console.log('🔑 Using demo token, mocking authentication');
        config.headers.Authorization = `Bearer ${token}`;
        
        // For demo mode, we'll intercept certain API calls to provide mock data
        if (config.url.includes('/api/auth/profile')) {
          // We'll handle this in the response interceptor
        }
      } else if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Debug logging to see what URL is being used
      console.log('🚀 API Request Debug:', {
        baseURL: config.baseURL,
        url: config.url,
        fullURL: config.baseURL ? `${config.baseURL}${config.url}` : config.url,
        method: config.method,
        timestamp: new Date().toISOString()
      });
      
      // CRITICAL: Ensure we're using the correct URL
      if (config.baseURL && config.baseURL.includes('trade-insight-backend')) {
        console.error('❌ WRONG BACKEND URL DETECTED:', config.baseURL);
        console.error('❌ This should be map5-kiro-backend.onrender.com');
      }
      return config;
    });

    // Add response interceptor to handle auth errors and mock demo responses
    this.api.interceptors.response.use(
      (response: any) => {
        const token = this.getToken();
        
        // If using demo token, intercept certain responses to provide mock data
        if (token && token.startsWith('demo_')) {
          if (response.config.url.includes('/api/auth/profile')) {
            console.log('🔄 Intercepting profile request for demo user');
            return {
              ...response,
              data: {
                success: true,
                data: {
                  user: {
                    id: '999',
                    email: 'demo@tradeinsight.com',
                    emailVerified: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    role: 'user'
                  }
                }
              }
            };
          }
        }
        
        return response;
      },
      (error: any) => {
        const token = this.getToken();
        
        // If using demo token, intercept certain errors to provide mock responses
        if (token && token.startsWith('demo_')) {
          console.log('🔄 Intercepting error for demo user:', error.config?.url);
          
          if (error.config?.url.includes('/api/auth/profile')) {
            return Promise.resolve({
              data: {
                success: true,
                data: {
                  user: {
                    id: '999',
                    email: 'demo@tradeinsight.com',
                    emailVerified: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    role: 'user'
                  }
                }
              }
            });
          }
          
          // For other API calls in demo mode, return empty successful responses
          // to prevent errors from breaking the UI
          return Promise.resolve({
            data: {
              success: true,
              data: {}
            }
          });
        }
        
        // Normal error handling for non-demo users
        if (error.response?.status === 401) {
          this.removeToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Token management
  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  private removeToken(): void {
    localStorage.removeItem('auth_token');
  }

  // Helper method to handle API calls with retry and error reporting
  private async executeWithRetry<T>(
    operation: () => Promise<AxiosResponse<T>>,
    operationName: string,
    useFileUploadConfig = false
  ): Promise<T> {
    const config = useFileUploadConfig ? FILE_UPLOAD_RETRY_CONFIG : API_RETRY_CONFIG;

    try {
      const response = await withRetry(operation, config);
      return response.data;
    } catch (error: any) {
      // Report error for monitoring
      ErrorReporter.getInstance().report(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: operationName,
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status
        }
      );

      // Return consistent error format
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || ErrorCodes.NETWORK_ERROR,
          message: error.response?.data?.error?.message || `Failed to ${operationName}`,
          details: error.response?.data?.error?.details,
        },
      } as T;
    }
  }

  // Authentication methods
  async register(email: string, password: string): Promise<ApiResponse<AuthResult>> {
    const result = await this.executeWithRetry(
      () => this.api.post('/api/auth/register', { email, password }),
      'register user'
    );

    if (result.success) {
      this.setToken(result.data.token);
    }

    return result;
  }

  async login(email: string, password: string): Promise<ApiResponse<AuthResult>> {
    // Special handling for demo account
    if (email === 'demo@tradeinsight.com' && password === 'demo123456') {
      console.log('Demo account login detected, using special handling');
      
      try {
        // First try normal login
        const result = await this.executeWithRetry(
          () => this.api.post('/api/auth/login', { email, password }),
          'login user'
        );

        if (result.success) {
          this.setToken(result.data.token);
          return result;
        }
        
        // If login failed due to email verification or invalid credentials for demo, create a demo token
        if (result.error?.code === 'EMAIL_NOT_VERIFIED' || result.error?.code === 'INVALID_CREDENTIALS') {
          console.log('Demo account issue detected, creating demo token');
          
          // Create a demo token that will work for frontend-only features
          const demoToken = 'demo_' + btoa(Date.now().toString());
          this.setToken(demoToken);
          
          // Return success with demo user
          return {
            success: true,
            data: {
              token: demoToken,
              user: {
                id: '999',
                email: 'demo@tradeinsight.com',
                emailVerified: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            }
          };
        }
        
        return result;
      } catch (error) {
        console.error('Demo login error:', error);
        
        // Fallback to demo token on any error
        const demoToken = 'demo_' + btoa(Date.now().toString());
        this.setToken(demoToken);
        
        return {
          success: true,
          data: {
            token: demoToken,
            user: {
              id: '999',
              email: 'demo@tradeinsight.com',
              emailVerified: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        };
      }
    }
    
    // Normal login flow for non-demo accounts
    const result = await this.executeWithRetry(
      () => this.api.post('/api/auth/login', { email, password }),
      'login user'
    );

    if (result.success) {
      this.setToken(result.data.token);
    }

    return result;
  }

  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ message: string }>> = await this.api.post('/api/auth/verify-email', {
        token,
      });

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Network error occurred',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const response: AxiosResponse<ApiResponse<User>> = await this.api.get('/api/auth/profile');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Network error occurred',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  logout(): void {
    this.removeToken();
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Development-only method to verify email without token
  async devVerifyEmail(email: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ message: string }>> = await this.api.post('/api/auth/dev-verify', {
        email,
      });

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Network error occurred',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  // File upload methods
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<Upload>> {
    const formData = new FormData();
    formData.append('file', file);

    return await this.executeWithRetry(
      () => this.api.post('/api/upload/csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      }),
      'upload file',
      true // Use file upload retry config
    );
  }

  async getUploads(): Promise<ApiResponse<Upload[]>> {
    const cacheKey = 'uploads';

    // Try to get from cache first
    const cachedData = uploadCache.get<ApiResponse<Upload[]>>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const response: AxiosResponse<ApiResponse<{ uploads: Upload[] }>> = await this.api.get('/api/data/uploads');
      const result = {
        success: true,
        data: response.data.success ? response.data.data.uploads : []
      };

      // Cache the successful result
      uploadCache.set(cacheKey, result);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to fetch uploads',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async deleteUpload(uploadId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ message: string }>> = await this.api.delete(`/api/uploads/${uploadId}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to delete upload',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  // Data retrieval methods
  async getData(uploadId: string, options: QueryOptions): Promise<ApiResponse<{ rows: any[]; pagination: any }>> {
    // Create cache key from parameters
    const cacheKey = CacheService.createKey('data', { uploadId, ...options });

    // Try to get from cache first
    const cachedData = dataCache.get<ApiResponse<{ rows: any[]; pagination: any }>>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const params = new URLSearchParams({
        page: options.page.toString(),
        limit: options.limit.toString(),
      });

      if (options.sortBy) {
        params.append('sortBy', options.sortBy);
        params.append('sortOrder', options.sortOrder || 'asc');
      }

      if (options.filters && options.filters.length > 0) {
        params.append('filters', JSON.stringify(options.filters));
      }

      const response: AxiosResponse<ApiResponse<{ rows: any[]; pagination: any }>> =
        await this.api.get(`/api/data/upload/${uploadId}?${params.toString()}`);

      // Cache successful result
      if (response.data.success) {
        dataCache.set(cacheKey, response.data);
      }

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to fetch data',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async getColumnInfo(uploadId: string): Promise<ApiResponse<{ columns: any[] }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ columns: any[] }>> = await this.api.get(`/api/data/columns?uploadId=${uploadId}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to fetch column info',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  // Chart methods
  async getChartData(options: {
    uploadId?: string;
    xColumn: string;
    yColumn: string;
    chartType: 'line' | 'bar';
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    groupBy?: string;
  }): Promise<ApiResponse<{ chartData: any; options: any }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ chartData: any; options: any }>> =
        await this.api.post('/api/charts/data', options);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to fetch chart data',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async getOptimizedChartData(options: {
    uploadId?: string;
    xColumn: string;
    yColumn: string;
    chartType: 'line' | 'bar';
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    groupBy?: string;
  }): Promise<ApiResponse<{ chartData: any; optimized: boolean; options: any }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ chartData: any; optimized: boolean; options: any }>> =
        await this.api.post('/api/charts/optimized', options);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to fetch optimized chart data',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async validateChartOptions(options: {
    uploadId?: string;
    xColumn: string;
    yColumn: string;
    chartType: 'line' | 'bar';
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    groupBy?: string;
  }): Promise<ApiResponse<{ isValid: boolean; errors: string[] }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ isValid: boolean; errors: string[] }>> =
        await this.api.post('/api/charts/validate', options);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to validate chart options',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  // Strategy management methods
  async getStrategies(options?: {
    page?: number;
    limit?: number;
    name?: string;
    isActive?: boolean;
    bucketId?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<Strategy[]>> {
    try {
      const params = new URLSearchParams();

      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.name) params.append('name', options.name);
      if (options?.isActive !== undefined) params.append('isActive', options.isActive.toString());
      if (options?.bucketId) params.append('bucketId', options.bucketId.toString());
      if (options?.sortBy) params.append('sortBy', options.sortBy);
      if (options?.sortOrder) params.append('sortOrder', options.sortOrder);

      const response: AxiosResponse<ApiResponse<Strategy[]>> =
        await this.api.get(`/api/strategies?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to fetch strategies',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async getStrategy(id: number): Promise<ApiResponse<Strategy>> {
    try {
      const response: AxiosResponse<ApiResponse<Strategy>> = await this.api.get(`/api/strategies/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to fetch strategy',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async createStrategy(strategy: CreateStrategyRequest): Promise<ApiResponse<Strategy>> {
    try {
      const response: AxiosResponse<ApiResponse<Strategy>> = await this.api.post('/api/strategies', strategy);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to create strategy',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async updateStrategy(id: number, updates: UpdateStrategyRequest): Promise<ApiResponse<Strategy>> {
    try {
      const response: AxiosResponse<ApiResponse<Strategy>> = await this.api.put(`/api/strategies/${id}`, updates);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to update strategy',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async deleteStrategy(id: number): Promise<ApiResponse<{ message: string }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ message: string }>> = await this.api.delete(`/api/strategies/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to delete strategy',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async assignStrategyToBucket(strategyId: number, bucketId: number | null): Promise<ApiResponse<{ message: string }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ message: string }>> =
        await this.api.put(`/api/strategies/${strategyId}/bucket`, { bucketId });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to assign strategy to bucket',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async updateStrategyTags(strategyId: number, tagIds: number[]): Promise<ApiResponse<{ message: string }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ message: string }>> =
        await this.api.put(`/api/strategies/${strategyId}/tags`, { tagIds });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to update strategy tags',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  // Bucket management methods
  async getBuckets(): Promise<ApiResponse<StrategyBucket[]>> {
    try {
      const response: AxiosResponse<ApiResponse<StrategyBucket[]>> = await this.api.get('/api/buckets');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to fetch buckets',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async createBucket(bucket: CreateBucketRequest): Promise<ApiResponse<StrategyBucket>> {
    try {
      const response: AxiosResponse<ApiResponse<StrategyBucket>> = await this.api.post('/api/buckets', bucket);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to create bucket',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async updateBucket(id: number, updates: UpdateBucketRequest): Promise<ApiResponse<StrategyBucket>> {
    try {
      const response: AxiosResponse<ApiResponse<StrategyBucket>> = await this.api.put(`/api/buckets/${id}`, updates);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to update bucket',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async deleteBucket(id: number): Promise<ApiResponse<{ message: string }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ message: string }>> = await this.api.delete(`/api/buckets/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to delete bucket',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async getBucketStrategies(bucketId: number): Promise<ApiResponse<Strategy[]>> {
    try {
      const response: AxiosResponse<ApiResponse<Strategy[]>> = await this.api.get(`/api/buckets/${bucketId}/strategies`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to fetch bucket strategies',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  // Tag management methods
  async getTags(): Promise<ApiResponse<Tag[]>> {
    try {
      const response: AxiosResponse<ApiResponse<Tag[]>> = await this.api.get('/api/tags');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to fetch tags',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async createTag(tag: CreateTagRequest): Promise<ApiResponse<Tag>> {
    try {
      const response: AxiosResponse<ApiResponse<Tag>> = await this.api.post('/api/tags', tag);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to create tag',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async updateTag(id: number, updates: UpdateTagRequest): Promise<ApiResponse<Tag>> {
    try {
      const response: AxiosResponse<ApiResponse<Tag>> = await this.api.put(`/api/tags/${id}`, updates);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to update tag',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async deleteTag(id: number): Promise<ApiResponse<{ message: string }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ message: string }>> = await this.api.delete(`/api/tags/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to delete tag',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async getTagStrategies(tagId: number): Promise<ApiResponse<Strategy[]>> {
    try {
      const response: AxiosResponse<ApiResponse<Strategy[]>> = await this.api.get(`/api/tags/${tagId}/strategies`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to fetch tag strategies',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  // Formula validation methods
  async validateFormula(options: {
    uploadId: string;
    formula: string;
    columns: string[];
  }): Promise<ApiResponse<{ isValid: boolean; error?: string }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ isValid: boolean; error?: string }>> = 
        await this.api.post('/api/calculations/validate', options);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to validate formula',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async executeFormula(options: {
    uploadId: string;
    formula: string;
    columns: string[];
    limit?: number;
  }): Promise<ApiResponse<{ results: number[]; preview: any[] }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ results: number[]; preview: any[] }>> = 
        await this.api.post('/api/calculations/execute', options);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to execute formula',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async saveCalculatedColumn(options: {
    uploadId: string;
    columnName: string;
    formula: string;
    description?: string;
  }): Promise<ApiResponse<{ message: string; columnId: number }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ message: string; columnId: number }>> = 
        await this.api.post('/api/calculations/columns', options);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Failed to save calculated column',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }
}

// Create and export a singleton instance
const realApiService = new ApiService();

// Export the real API service
export const apiService = realApiService;
export default realApiService;