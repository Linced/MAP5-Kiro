import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, AuthResult, User, Upload, QueryOptions } from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
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

  // Authentication methods
  async register(email: string, password: string): Promise<ApiResponse<AuthResult>> {
    try {
      const response: AxiosResponse<ApiResponse<AuthResult>> = await this.api.post('/api/auth/register', {
        email,
        password,
      });
      
      if (response.data.success) {
        this.setToken(response.data.data.token);
      }
      
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

  async login(email: string, password: string): Promise<ApiResponse<AuthResult>> {
    try {
      const response: AxiosResponse<ApiResponse<AuthResult>> = await this.api.post('/api/auth/login', {
        email,
        password,
      });
      
      if (response.data.success) {
        this.setToken(response.data.data.token);
      }
      
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
      const response: AxiosResponse<ApiResponse<User>> = await this.api.get('/api/auth/me');
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

  // File upload methods
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<Upload>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response: AxiosResponse<ApiResponse<Upload>> = await this.api.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || 'Upload failed',
          details: error.response?.data?.error?.details,
        },
      };
    }
  }

  async getUploads(): Promise<ApiResponse<Upload[]>> {
    try {
      const response: AxiosResponse<ApiResponse<{ uploads: Upload[] }>> = await this.api.get('/api/data/uploads');
      return {
        success: true,
        data: response.data.success ? response.data.data.uploads : []
      };
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
}

// Create and export a singleton instance
export const apiService = new ApiService();
export default apiService;