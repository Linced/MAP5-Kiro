// Strategy types
export interface Strategy {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  tags: Tag[];
  buckets: Bucket[];
  entryRules: Rule[];
  exitRules: Rule[];
  riskManagement: RiskManagement;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  bucketId?: number;
}

export interface Bucket {
  id: number;
  name: string;
  percentage: number;
  minAmount: number;
  maxAmount: number;
}

export interface Rule {
  id: string;
  type: 'entry' | 'exit' | 'stop_loss' | 'take_profit' | 'time_based' | 'condition';
  condition: string;
  value: number | string;
  operator: 'and' | 'or';
  description?: string;
}

export interface RiskManagement {
  stopLoss: number;
  takeProfit: number;
  maxDrawdown: number;
  positionSize: number;
  maxPositionSize?: number;
  stopLossPercentage?: number;
  takeProfitPercentage?: number;
  maxDailyLoss?: number;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  success: boolean;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Auth types
export interface AuthResult {
  token: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified?: boolean;
}

// Upload types
export interface Upload {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  uploadedAt: string;
  rowCount?: number;
  columnNames?: string[];
}

// Query types
export interface QueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Array<{
    field: string;
    value: any;
    operator?: string;
  }>;
}

// Strategy request types
export interface CreateStrategyRequest {
  name: string;
  description: string;
  isActive: boolean;
  tags: string[];
  tagIds?: number[];
  buckets: Bucket[];
  bucketId?: number;
  entryRules: Rule[];
  exitRules: Rule[];
  riskManagement: RiskManagement;
  notes?: string;
}

export interface UpdateStrategyRequest extends Partial<CreateStrategyRequest> {
  id: number;
}

// Bucket types
export interface StrategyBucket {
  id: number;
  userId: number;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBucketRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateBucketRequest extends Partial<CreateBucketRequest> {
  id?: number;
}

// Tag types
export interface Tag {
  id: number;
  name: string;
  color?: string;
  createdAt: string;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface UpdateTagRequest extends Partial<CreateTagRequest> {
  id: number;
}

// Form types
export interface StrategyFormData {
  name: string;
  description: string;
  isActive: boolean;
  tags: string[];
  buckets: Bucket[];
  entryRules: Rule[];
  exitRules: Rule[];
  riskManagement: RiskManagement;
}

// Component prop types
export interface StrategyAnalyticsProps {
  strategies: Strategy[];
}

export interface StrategyListProps {
  onEditStrategy: (strategy: Strategy) => void;
  onCreateStrategy: () => void;
  refreshTrigger: number;
}

export interface StrategyFormProps {
  strategy?: Strategy;
  onSave: (strategy: StrategyFormData) => void;
  onCancel: () => void;
}

export interface BucketManagerProps {
  buckets: Bucket[];
  onBucketChange: (buckets: Bucket[]) => void;
}

export interface TagManagerProps {
  tags: string[];
  availableTags: string[];
  onTagChange: (tags: string[]) => void;
}

// Chart types
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

// Additional rule types for compatibility
export interface EntryRule extends Rule {
  type: 'entry';
  description?: string;
}

export interface ExitRule extends Rule {
  type: 'exit';
  description?: string;
}

// Risk parameters alias
export interface RiskParameters extends RiskManagement {
  maxPositionSize?: number;
  stopLossPercentage?: number;
  takeProfitPercentage?: number;
  maxDailyLoss?: number;
}

// Event types
export interface FormEvent extends Event {
  target: HTMLFormElement;
}

export interface InputEvent extends Event {
  target: HTMLInputElement;
}

export interface SelectEvent extends Event {
  target: HTMLSelectElement;
}