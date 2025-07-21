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
    // Use relative URLs in production to leverage Vercel's proxy, direct URLs in development
    // Force empty baseURL to use relative paths that will go through Vercel's rewrites
    this.baseURL = '';
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config: any) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
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
}

// Create and export a singleton instance
const realApiService = new ApiService();

// Export the real API service
export const apiService = realApiService;
export default realApiService;