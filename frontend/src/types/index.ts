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