import request from 'supertest';
import express from 'express';
import chartRoutes from '../charts';
import { ChartDataService } from '../../services/ChartDataService';
import { authenticateToken } from '../../middleware/auth';

// Mock dependencies
jest.mock('../../services/ChartDataService');
jest.mock('../../middleware/auth');

const mockChartDataService = ChartDataService as jest.Mocked<typeof ChartDataService>;
const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

// Create test app
const app = express();
app.use(express.json());
app.use('/api/charts', chartRoutes);

// Mock user for authenticated requests
const mockUser = { id: 1, email: 'test@example.com' };

describe('Chart Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock authentication middleware
        mockAuthenticateToken.mockImplementation(async (req: any, _res: any, next: any) => {
            req.user = mockUser;
            next();
        });
    });

    describe('POST /api/charts/data', () => {
        it('should generate chart data successfully', async () => {
            const mockChartData = {
                labels: ['2023-01-01', '2023-01-02'],
                datasets: [{
                    label: 'price vs date',
                    data: [
                        { x: '2023-01-01', y: 100 },
                        { x: '2023-01-02', y: 105 }
                    ]
                }]
            };

            mockChartDataService.generateChartData.mockResolvedValue(mockChartData);

            const response = await request(app)
                .post('/api/charts/data')
                .send({
                    xColumn: 'date',
                    yColumn: 'price',
                    chartType: 'line'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.chartData).toEqual(mockChartData);
            expect(mockChartDataService.generateChartData).toHaveBeenCalledWith(
                mockUser.id,
                expect.objectContaining({
                    xColumn: 'date',
                    yColumn: 'price',
                    chartType: 'line'
                })
            );
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/charts/data')
                .send({
                    xColumn: 'date'
                    // Missing yColumn and chartType
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
        });

        it('should return 400 for invalid chart type', async () => {
            const response = await request(app)
                .post('/api/charts/data')
                .send({
                    xColumn: 'date',
                    yColumn: 'price',
                    chartType: 'invalid'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('INVALID_CHART_TYPE');
        });

        it('should handle validation errors', async () => {
            mockChartDataService.generateChartData.mockRejectedValue(
                new Error('Chart validation failed: X-axis column does not exist')
            );

            const response = await request(app)
                .post('/api/charts/data')
                .send({
                    xColumn: 'nonexistent',
                    yColumn: 'price',
                    chartType: 'line'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('CHART_VALIDATION_ERROR');
        });

        it('should handle service errors', async () => {
            mockChartDataService.generateChartData.mockRejectedValue(
                new Error('Database connection failed')
            );

            const response = await request(app)
                .post('/api/charts/data')
                .send({
                    xColumn: 'date',
                    yColumn: 'price',
                    chartType: 'line'
                });

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('CHART_GENERATION_ERROR');
        });

        it('should handle filters and aggregation', async () => {
            const mockChartData = {
                labels: ['A', 'B'],
                datasets: [{
                    label: 'value vs category',
                    data: [
                        { x: 'A', y: 150 },
                        { x: 'B', y: 200 }
                    ]
                }]
            };

            mockChartDataService.generateChartData.mockResolvedValue(mockChartData);

            const response = await request(app)
                .post('/api/charts/data')
                .send({
                    xColumn: 'category',
                    yColumn: 'value',
                    chartType: 'bar',
                    aggregation: 'sum',
                    filters: [
                        { column: 'status', operator: 'eq', value: 'active' }
                    ]
                });

            expect(response.status).toBe(200);
            expect(mockChartDataService.generateChartData).toHaveBeenCalledWith(
                mockUser.id,
                expect.objectContaining({
                    aggregation: 'sum',
                    filters: [{ column: 'status', operator: 'eq', value: 'active' }]
                })
            );
        });

        it('should cap limit at 10000', async () => {
            mockChartDataService.generateChartData.mockResolvedValue({
                labels: [],
                datasets: []
            });

            await request(app)
                .post('/api/charts/data')
                .send({
                    xColumn: 'date',
                    yColumn: 'price',
                    chartType: 'line',
                    limit: 50000
                });

            expect(mockChartDataService.generateChartData).toHaveBeenCalledWith(
                mockUser.id,
                expect.objectContaining({
                    limit: 10000
                })
            );
        });
    });

    describe('POST /api/charts/optimized', () => {
        it('should generate optimized chart data', async () => {
            const mockChartData = {
                labels: ['2023-01-01'],
                datasets: [{
                    label: 'price vs date',
                    data: [{ x: '2023-01-01', y: 100 }]
                }]
            };

            mockChartDataService.getOptimizedChartData.mockResolvedValue(mockChartData);

            const response = await request(app)
                .post('/api/charts/optimized')
                .send({
                    xColumn: 'date',
                    yColumn: 'price',
                    chartType: 'line'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.optimized).toBe(true);
            expect(mockChartDataService.getOptimizedChartData).toHaveBeenCalled();
        });
    });

    describe('POST /api/charts/validate', () => {
        it('should validate chart options', async () => {
            const mockValidation = {
                isValid: true,
                errors: [],
                warnings: ['Large dataset may impact performance']
            };

            mockChartDataService.validateChartOptions.mockResolvedValue(mockValidation);

            const response = await request(app)
                .post('/api/charts/validate')
                .send({
                    xColumn: 'date',
                    yColumn: 'price',
                    chartType: 'line'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.validation).toEqual(mockValidation);
        });
    });

    describe('GET /api/charts/columns/numeric', () => {
        it('should return numeric columns', async () => {
            const mockColumns = [
                { name: 'price', type: 'number', nullable: true },
                { name: 'volume', type: 'text', nullable: true }
            ];

            mockChartDataService.getNumericColumns.mockResolvedValue(mockColumns);

            const response = await request(app)
                .get('/api/charts/columns/numeric');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.columns).toEqual(mockColumns);
        });

        it('should handle uploadId parameter', async () => {
            mockChartDataService.getNumericColumns.mockResolvedValue([]);

            await request(app)
                .get('/api/charts/columns/numeric?uploadId=test-upload-id');

            expect(mockChartDataService.getNumericColumns).toHaveBeenCalledWith(
                mockUser.id,
                'test-upload-id'
            );
        });
    });

    describe('POST /api/charts/preview', () => {
        it('should generate chart preview', async () => {
            const mockPreviewData = {
                labels: ['2023-01-01'],
                datasets: [{
                    label: 'price vs date',
                    data: [{ x: '2023-01-01', y: 100 }]
                }]
            };

            mockChartDataService.getChartPreview.mockResolvedValue(mockPreviewData);

            const response = await request(app)
                .post('/api/charts/preview')
                .send({
                    xColumn: 'date',
                    yColumn: 'price',
                    chartType: 'line'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.preview).toBe(true);
            expect(response.body.data.chartData).toEqual(mockPreviewData);
        });
    });

    describe('GET /api/charts/aggregations', () => {
        it('should return available aggregation options', async () => {
            const response = await request(app)
                .get('/api/charts/aggregations');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.aggregations).toHaveLength(5);
            expect(response.body.data.aggregations[0]).toHaveProperty('value');
            expect(response.body.data.aggregations[0]).toHaveProperty('label');
            expect(response.body.data.aggregations[0]).toHaveProperty('description');
        });
    });

    describe('POST /api/charts/line', () => {
        it('should generate line chart data', async () => {
            const mockChartData = {
                labels: ['2023-01-01'],
                datasets: [{
                    label: 'price vs date',
                    data: [{ x: '2023-01-01', y: 100 }]
                }]
            };

            mockChartDataService.getOptimizedChartData.mockResolvedValue(mockChartData);

            const response = await request(app)
                .post('/api/charts/line')
                .send({
                    xColumn: 'date',
                    yColumn: 'price'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.chartType).toBe('line');
            expect(mockChartDataService.getOptimizedChartData).toHaveBeenCalledWith(
                mockUser.id,
                expect.objectContaining({
                    chartType: 'line'
                })
            );
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/charts/line')
                .send({
                    xColumn: 'date'
                    // Missing yColumn
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
        });
    });

    describe('POST /api/charts/bar', () => {
        it('should generate bar chart data', async () => {
            const mockChartData = {
                labels: ['A', 'B'],
                datasets: [{
                    label: 'value vs category',
                    data: [
                        { x: 'A', y: 100 },
                        { x: 'B', y: 150 }
                    ]
                }]
            };

            mockChartDataService.getOptimizedChartData.mockResolvedValue(mockChartData);

            const response = await request(app)
                .post('/api/charts/bar')
                .send({
                    xColumn: 'category',
                    yColumn: 'value'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.chartType).toBe('bar');
            expect(mockChartDataService.getOptimizedChartData).toHaveBeenCalledWith(
                mockUser.id,
                expect.objectContaining({
                    chartType: 'bar'
                })
            );
        });
    });

    describe('Authentication', () => {
        it('should require authentication for all routes', async () => {
            // Mock authentication failure
            mockAuthenticateToken.mockImplementation(async (_req: any, res: any, _next: any) => {
                res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
            });

            const response = await request(app)
                .post('/api/charts/data')
                .send({
                    xColumn: 'date',
                    yColumn: 'price',
                    chartType: 'line'
                });

            expect(response.status).toBe(401);
        });
    });

    describe('Error handling', () => {
        it('should handle service errors gracefully', async () => {
            mockChartDataService.generateChartData.mockRejectedValue(
                new Error('Unexpected error')
            );

            const response = await request(app)
                .post('/api/charts/data')
                .send({
                    xColumn: 'date',
                    yColumn: 'price',
                    chartType: 'line'
                });

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Unexpected error');
        });

        it('should handle validation service errors', async () => {
            mockChartDataService.validateChartOptions.mockRejectedValue(
                new Error('Validation service error')
            );

            const response = await request(app)
                .post('/api/charts/validate')
                .send({
                    xColumn: 'date',
                    yColumn: 'price',
                    chartType: 'line'
                });

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('CHART_VALIDATION_ERROR');
        });
    });
});