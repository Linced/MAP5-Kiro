import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ChartDataService, ChartOptions } from '../services/ChartDataService';

const router = Router();

// Apply authentication middleware to all chart routes
router.use(authenticateToken);

/**
 * POST /api/charts/data
 * Generate chart data based on specified options
 */
router.post('/data', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      uploadId,
      xColumn,
      yColumn,
      chartType,
      aggregation,
      groupBy,
      limit,
      filters
    } = req.body;

    // Validate required fields
    if (!xColumn || !yColumn || !chartType) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'xColumn, yColumn, and chartType are required'
        }
      });
      return;
    }

    // Validate chart type
    if (!['line', 'bar'].includes(chartType)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CHART_TYPE',
          message: 'chartType must be either "line" or "bar"'
        }
      });
      return;
    }

    const options: ChartOptions = {
      uploadId,
      xColumn,
      yColumn,
      chartType,
      ...(aggregation && { aggregation }),
      ...(groupBy && { groupBy }),
      ...(limit && { limit: Math.min(parseInt(limit), 10000) }),
      ...(Array.isArray(filters) && { filters })
    };

    const chartData = await ChartDataService.generateChartData(userId, options);

    res.json({
      success: true,
      data: {
        chartData,
        options: {
          xColumn,
          yColumn,
          chartType,
          aggregation,
          groupBy
        }
      }
    });

  } catch (error) {
    console.error('Error generating chart data:', error);
    
    if (error instanceof Error && error.message.includes('validation failed')) {
      res.status(400).json({
        success: false,
        error: {
          code: 'CHART_VALIDATION_ERROR',
          message: error.message
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'CHART_GENERATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate chart data'
        }
      });
    }
  }
});

/**
 * POST /api/charts/optimized
 * Generate optimized chart data with automatic performance optimizations
 */
router.post('/optimized', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      uploadId,
      xColumn,
      yColumn,
      chartType,
      aggregation,
      groupBy,
      filters
    } = req.body;

    // Validate required fields
    if (!xColumn || !yColumn || !chartType) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'xColumn, yColumn, and chartType are required'
        }
      });
      return;
    }

    const options: ChartOptions = {
      uploadId,
      xColumn,
      yColumn,
      chartType,
      ...(aggregation && { aggregation }),
      ...(groupBy && { groupBy }),
      ...(Array.isArray(filters) && { filters })
    };

    const chartData = await ChartDataService.getOptimizedChartData(userId, options);

    res.json({
      success: true,
      data: {
        chartData,
        optimized: true,
        options: {
          xColumn,
          yColumn,
          chartType,
          aggregation,
          groupBy
        }
      }
    });

  } catch (error) {
    console.error('Error generating optimized chart data:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'OPTIMIZED_CHART_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate optimized chart data'
      }
    });
  }
});

/**
 * POST /api/charts/validate
 * Validate chart options before generating chart
 */
router.post('/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      uploadId,
      xColumn,
      yColumn,
      chartType,
      aggregation,
      groupBy,
      filters
    } = req.body;

    const options: ChartOptions = {
      uploadId,
      xColumn,
      yColumn,
      chartType,
      ...(aggregation && { aggregation }),
      ...(groupBy && { groupBy }),
      ...(Array.isArray(filters) && { filters })
    };

    const validation = await ChartDataService.validateChartOptions(userId, options);

    res.json({
      success: true,
      data: {
        validation,
        options
      }
    });

  } catch (error) {
    console.error('Error validating chart options:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CHART_VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to validate chart options'
      }
    });
  }
});

/**
 * GET /api/charts/columns/numeric
 * Get available numeric columns for charting
 */
router.get('/columns/numeric', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const uploadId = req.query.uploadId as string;

    const numericColumns = await ChartDataService.getNumericColumns(userId, uploadId);

    res.json({
      success: true,
      data: {
        columns: numericColumns
      }
    });

  } catch (error) {
    console.error('Error retrieving numeric columns:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'NUMERIC_COLUMNS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retrieve numeric columns'
      }
    });
  }
});

/**
 * POST /api/charts/preview
 * Generate a quick preview of chart data (limited to 50 points)
 */
router.post('/preview', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      uploadId,
      xColumn,
      yColumn,
      chartType,
      aggregation,
      groupBy,
      filters
    } = req.body;

    // Validate required fields
    if (!xColumn || !yColumn || !chartType) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'xColumn, yColumn, and chartType are required'
        }
      });
      return;
    }

    const options: ChartOptions = {
      uploadId,
      xColumn,
      yColumn,
      chartType,
      ...(aggregation && { aggregation }),
      ...(groupBy && { groupBy }),
      ...(Array.isArray(filters) && { filters })
    };

    const previewData = await ChartDataService.getChartPreview(userId, options);

    res.json({
      success: true,
      data: {
        chartData: previewData,
        preview: true,
        options: {
          xColumn,
          yColumn,
          chartType,
          aggregation,
          groupBy
        }
      }
    });

  } catch (error) {
    console.error('Error generating chart preview:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CHART_PREVIEW_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate chart preview'
      }
    });
  }
});

/**
 * GET /api/charts/aggregations
 * Get available aggregation options
 */
router.get('/aggregations', async (_req: Request, res: Response): Promise<void> => {
  try {
    const aggregations = [
      { value: 'sum', label: 'Sum', description: 'Add all values together' },
      { value: 'avg', label: 'Average', description: 'Calculate mean of all values' },
      { value: 'count', label: 'Count', description: 'Count number of data points' },
      { value: 'min', label: 'Minimum', description: 'Find the smallest value' },
      { value: 'max', label: 'Maximum', description: 'Find the largest value' }
    ];

    res.json({
      success: true,
      data: {
        aggregations
      }
    });

  } catch (error) {
    console.error('Error retrieving aggregations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGGREGATIONS_ERROR',
        message: 'Failed to retrieve aggregation options'
      }
    });
  }
});

/**
 * POST /api/charts/line
 * Generate line chart data (convenience endpoint)
 */
router.post('/line', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const options: ChartOptions = {
      ...req.body,
      chartType: 'line'
    };

    // Validate required fields
    if (!options.xColumn || !options.yColumn) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'xColumn and yColumn are required'
        }
      });
      return;
    }

    const chartData = await ChartDataService.getOptimizedChartData(userId, options);

    res.json({
      success: true,
      data: {
        chartData,
        chartType: 'line',
        options
      }
    });

  } catch (error) {
    console.error('Error generating line chart:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LINE_CHART_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate line chart'
      }
    });
  }
});

/**
 * POST /api/charts/bar
 * Generate bar chart data (convenience endpoint)
 */
router.post('/bar', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const options: ChartOptions = {
      ...req.body,
      chartType: 'bar'
    };

    // Validate required fields
    if (!options.xColumn || !options.yColumn) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'xColumn and yColumn are required'
        }
      });
      return;
    }

    const chartData = await ChartDataService.getOptimizedChartData(userId, options);

    res.json({
      success: true,
      data: {
        chartData,
        chartType: 'bar',
        options
      }
    });

  } catch (error) {
    console.error('Error generating bar chart:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BAR_CHART_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate bar chart'
      }
    });
  }
});

export default router;