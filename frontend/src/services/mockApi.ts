// Mock API service to bypass backend issues
import { ApiResponse, AuthResult, User, Upload, Strategy } from '../types';

class MockApiService {
  private token: string | null = null;

  // Mock login - always succeeds with demo credentials
  async login(email: string, password: string): Promise<ApiResponse<AuthResult>> {
    console.log('🎭 Mock login called with:', email, password);
    
    if (email === 'demo@tradeinsight.com' && password === 'demo123456') {
      this.token = 'mock-token-' + Date.now();
      localStorage.setItem('auth_token', this.token);
      
      return {
        success: true,
        data: {
          token: this.token,
          user: {
            id: 'mock-user-1',
            email: 'demo@tradeinsight.com',
            name: 'Demo User',
            emailVerified: true
          }
        }
      };
    }
    
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    };
  }

  // Mock current user
  async getCurrentUser(): Promise<ApiResponse<User>> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authentication token'
        }
      };
    }

    return {
      success: true,
      data: {
        id: 'mock-user-1',
        email: 'demo@tradeinsight.com',
        name: 'Demo User',
        emailVerified: true
      }
    };
  }

  // Mock uploads
  async getUploads(): Promise<ApiResponse<Upload[]>> {
    return {
      success: true,
      data: [
        {
          id: 'upload-1',
          filename: 'sample_trades.csv',
          originalName: 'sample_trades.csv',
          size: 15420,
          uploadedAt: '2025-07-18T10:30:00Z',
          status: 'processed',
          recordCount: 150,
          columns: ['Date', 'Symbol', 'Action', 'Quantity', 'Price', 'Total']
        },
        {
          id: 'upload-2',
          filename: 'portfolio_data.xlsx',
          originalName: 'portfolio_data.xlsx',
          size: 28900,
          uploadedAt: '2025-07-17T14:15:00Z',
          status: 'processed',
          recordCount: 89,
          columns: ['Date', 'Symbol', 'Shares', 'Price', 'Value', 'Sector']
        }
      ]
    };
  }

  // Mock strategies
  async getStrategies(options?: any): Promise<ApiResponse<Strategy[]>> {
    return {
      success: true,
      data: [
        {
          id: 1,
          name: 'Growth Stock Analysis',
          description: 'Focus on high-growth technology stocks',
          createdAt: '2025-07-15T09:00:00Z',
          updatedAt: '2025-07-18T11:30:00Z',
          isActive: true,
          userId: 'mock-user-1',
          tags: [],
          buckets: [],
          entryRules: [],
          exitRules: [],
          riskManagement: {
            stopLoss: 5,
            takeProfit: 10,
            maxDrawdown: 15,
            positionSize: 1000
          }
        },
        {
          id: 2,
          name: 'Value Investing',
          description: 'Undervalued stocks with strong fundamentals',
          createdAt: '2025-07-10T16:20:00Z',
          updatedAt: '2025-07-17T08:45:00Z',
          isActive: true,
          userId: 'mock-user-1',
          tags: [],
          buckets: [],
          entryRules: [],
          exitRules: [],
          riskManagement: {
            stopLoss: 3,
            takeProfit: 8,
            maxDrawdown: 10,
            positionSize: 2000
          }
        }
      ]
    };
  }

  // Other required methods
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    this.token = null;
  }

  // Stub methods for other API calls - accepting parameters to match component usage
  async register(email: string, password: string): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async verifyEmail(token: string): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async devVerifyEmail(email: string): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async deleteUpload(uploadId: string): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async getData(uploadId: string, options: any): Promise<any> {
    console.log('🎭 Mock getData called with:', uploadId, options);
    
    // Find the upload to get column information
    const uploadsResponse = await this.getUploads();
    if (!uploadsResponse.success) {
      return { success: false, error: { message: 'Upload not found' } };
    }
    
    const upload = uploadsResponse.data.find(u => u.id === uploadId);
    if (!upload) {
      return { success: false, error: { message: 'Upload not found' } };
    }
    
    const columns = upload.columns || upload.columnNames || [];
    const totalRows = upload.recordCount || upload.rowCount || 0;
    
    // Generate mock data based on columns
    const generateMockRow = (index: number) => {
      const row: any = {};
      columns.forEach(column => {
        switch (column.toLowerCase()) {
          case 'date':
            const date = new Date(2025, 0, (index % 30) + 1);
            row[column] = date.toISOString().split('T')[0];
            break;
          case 'symbol':
            const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX', 'CRM', 'ORCL'];
            row[column] = symbols[index % symbols.length];
            break;
          case 'action':
            row[column] = index % 2 === 0 ? 'BUY' : 'SELL';
            break;
          case 'quantity':
          case 'shares':
            row[column] = Math.floor(Math.random() * 1000) + 1;
            break;
          case 'price':
            row[column] = parseFloat((Math.random() * 500 + 10).toFixed(2));
            break;
          case 'total':
          case 'value':
            row[column] = parseFloat((Math.random() * 50000 + 1000).toFixed(2));
            break;
          case 'sector':
            const sectors = ['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial'];
            row[column] = sectors[index % sectors.length];
            break;
          default:
            row[column] = `${column}_${index + 1}`;
        }
      });
      return row;
    };
    
    // Handle pagination
    const page = options?.page || 1;
    const limit = options?.limit || 100;
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalRows);
    
    // Generate rows for the requested page
    const rows = [];
    for (let i = startIndex; i < endIndex; i++) {
      rows.push(generateMockRow(i));
    }
    
    // Handle sorting if specified
    if (options?.sortBy && rows.length > 0) {
      const sortField = options.sortBy;
      const sortOrder = options.sortOrder || 'asc';
      
      rows.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        // Handle different data types
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return {
      success: true,
      data: {
        rows: rows,
        pagination: {
          page: page,
          limit: limit,
          totalCount: totalRows,
          totalPages: Math.ceil(totalRows / limit)
        },
        columns: columns
      }
    };
  }
  async getColumnInfo(uploadId: string): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async getChartData(options: any): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async getOptimizedChartData(options: any): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async validateChartOptions(options: any): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async getStrategy(strategyId: number): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async createStrategy(data: any): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async updateStrategy(strategyId: number, data: any): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async deleteStrategy(strategyId: number): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async assignStrategyToBucket(strategyId: number, bucketId: number): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async updateStrategyTags(strategyId: number, tagIds: number[]): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async getBuckets(): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async createBucket(data: any): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async updateBucket(bucketId: number, data: any): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async deleteBucket(bucketId: number): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async getBucketStrategies(bucketId: number): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async getTags(): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async createTag(data: any): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async updateTag(tagId: number, data: any): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async deleteTag(tagId: number): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
  async getTagStrategies(tagId: number): Promise<any> { return { success: false, error: { message: 'Not implemented in mock' } }; }
}

export const mockApiService = new MockApiService();