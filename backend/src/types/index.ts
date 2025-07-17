// TypeScript type definitions for backend
export interface User {
  id: number;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  verificationToken?: string;
  createdAt: Date;
  updatedAt: Date;
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
  user: Omit<User, 'passwordHash' | 'verificationToken'>;
  token: string;
}

export interface ParsedData {
  headers: string[];
  rows: Record<string, any>[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface StorageResult {
  uploadId: string;
  rowCount: number;
}

export interface DataResult {
  data: DataRow[];
  totalCount: number;
  page: number;
  limit: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface ParsedFormula {
  expression: string;
  variables: string[];
}

export interface FormulaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface CalculationResult {
  values: (number | null)[];
  errors: string[];
}

export interface FormulaPreview {
  columnName: string;
  formula: string;
  previewValues: (number | null)[];
  errors: string[];
}

// Service interfaces
export interface AuthService {
  register(email: string, password: string): Promise<User>;
  login(email: string, password: string): Promise<AuthResult>;
  verifyEmail(token: string): Promise<boolean>;
  generateJWT(userId: number): string;
  verifyJWT(token: string): Promise<User>;
}

export interface CSVService {
  parseFile(file: Buffer): Promise<ParsedData>;
  validateStructure(data: any[]): ValidationResult;
  storeData(userId: number, data: any[]): Promise<StorageResult>;
}

export interface DataService {
  getUserData(userId: number, options: QueryOptions): Promise<DataResult>;
  getColumnInfo(userId: number): Promise<ColumnInfo[]>;
  applyFilters(data: any[], filters: Filter[]): any[];
}

export interface CalculationEngine {
  parseFormula(formula: string): ParsedFormula;
  validateFormula(formula: string, columns: string[]): FormulaValidationResult;
  executeFormula(formula: ParsedFormula, data: any[]): CalculationResult;
  generatePreview(formula: string, data: any[], columns: string[]): FormulaPreview;
  saveCalculatedColumn(userId: number, uploadId: string, columnName: string, formula: string): Promise<CalculatedColumn>;
  getCalculatedColumns(userId: number, uploadId: string): Promise<CalculatedColumn[]>;
  deleteCalculatedColumn(userId: number, columnId: number): Promise<void>;
}

// Strategy Management Types
export interface StrategyBucket {
  id: number;
  userId: number;
  name: string;
  description?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Strategy {
  id: number;
  userId: number;
  bucketId?: number;
  name: string;
  description?: string;
  entryRules: EntryRule[];
  exitRules: ExitRule[];
  riskManagement: RiskParameters;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  bucket?: StrategyBucket;
  tags?: Tag[];
}

export interface Tag {
  id: number;
  userId: number;
  name: string;
  color?: string;
  createdAt: Date;
}

export interface EntryRule {
  condition: string;
  operator: 'and' | 'or';
  value: any;
  description?: string;
}

export interface ExitRule {
  type: 'stop_loss' | 'take_profit' | 'time_based' | 'condition';
  condition?: string;
  value: any;
  description?: string;
}

export interface RiskParameters {
  maxPositionSize?: number;
  stopLossPercentage?: number;
  takeProfitPercentage?: number;
  maxDailyLoss?: number;
  maxDrawdown?: number;
}

export interface CreateStrategyRequest {
  name: string;
  description?: string;
  bucketId?: number;
  entryRules: EntryRule[];
  exitRules: ExitRule[];
  riskManagement: RiskParameters;
  notes?: string;
  tagIds?: number[];
}

export interface UpdateStrategyRequest {
  name?: string;
  description?: string;
  bucketId?: number;
  entryRules?: EntryRule[];
  exitRules?: ExitRule[];
  riskManagement?: RiskParameters;
  notes?: string;
  isActive?: boolean;
}

export interface CreateBucketRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateBucketRequest {
  name?: string;
  description?: string;
  color?: string;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
}

// Strategy Management Service Interfaces
export interface StrategyService {
  createStrategy(userId: number, strategy: CreateStrategyRequest): Promise<Strategy>;
  updateStrategy(userId: number, strategyId: number, updates: UpdateStrategyRequest): Promise<Strategy>;
  deleteStrategy(userId: number, strategyId: number): Promise<void>;
  getUserStrategies(userId: number, options: QueryOptions): Promise<Strategy[]>;
  getStrategyById(userId: number, strategyId: number): Promise<Strategy>;
  assignStrategyToBucket(strategyId: number, bucketId: number): Promise<void>;
  addTagsToStrategy(strategyId: number, tagIds: number[]): Promise<void>;
}

export interface BucketService {
  createBucket(userId: number, bucket: CreateBucketRequest): Promise<StrategyBucket>;
  updateBucket(userId: number, bucketId: number, updates: UpdateBucketRequest): Promise<StrategyBucket>;
  deleteBucket(userId: number, bucketId: number): Promise<void>;
  getUserBuckets(userId: number): Promise<StrategyBucket[]>;
  getStrategiesInBucket(userId: number, bucketId: number): Promise<Strategy[]>;
}

export interface TagService {
  createTag(userId: number, tag: CreateTagRequest): Promise<Tag>;
  updateTag(userId: number, tagId: number, updates: UpdateTagRequest): Promise<Tag>;
  deleteTag(userId: number, tagId: number): Promise<void>;
  getUserTags(userId: number): Promise<Tag[]>;
  getStrategiesByTag(userId: number, tagId: number): Promise<Strategy[]>;
}

// Chart Data Types
export interface ChartDataPoint {
  x: any;
  y: number;
  label?: string;
}

export interface ChartDataset {
  label: string;
  data: ChartDataPoint[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
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
  limit?: number;
  filters?: Filter[];
}

export interface ChartValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}