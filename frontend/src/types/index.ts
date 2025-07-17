// TypeScript type definitions
export interface User {
  id: number;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
}

export interface Upload {
  id: string;
  userId: number;
  filename: string;
  rowCount: number;
  columnNames: string[];
  uploadedAt: Date;
}

export interface DataRow {
  id: number;
  userId: number;
  uploadId: string;
  rowIndex: number;
  data: Record<string, any>;
}

export interface CalculatedColumn {
  id: number;
  userId: number;
  uploadId: string;
  columnName: string;
  formula: string;
  createdAt: Date;
}

export interface QueryOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Filter[];
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface Filter {
  column: string;
  operator: 'eq' | 'gt' | 'lt' | 'contains';
  value: any;
}

export interface AuthResult {
  user: User;
  token: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// Chart types
export interface ChartDataPoint {
  x: any;
  y: number;
}

export interface ChartDataset {
  label: string;
  data: ChartDataPoint[];
  backgroundColor?: string;
  borderColor?: string;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartOptions {
  uploadId?: string;
  xColumn: string;
  yColumn: string;
  chartType: 'line' | 'bar';
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  groupBy?: string;
}

export interface ChartValidationResult {
  isValid: boolean;
  errors: string[];
}