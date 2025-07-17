import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { DataQueryService } from '../services/DataQueryService';
import { QueryOptions, Filter } from '../types';

const router = Router();

// Apply authentication middleware to all data routes
router.use(authenticateToken);

/**
 * GET /api/data
 * Get user's data with pagination, sorting, and filtering
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000); // Cap at 1000
    const sortBy = req.query.sortBy as string;
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    
    // Parse filters from query string
    const filters: Filter[] = [];
    if (req.query.filters) {
      try {
        const parsedFilters = JSON.parse(req.query.filters as string);
        if (Array.isArray(parsedFilters)) {
          filters.push(...parsedFilters);
        }
      } catch (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILTERS',
            message: 'Invalid filters format. Expected JSON array.'
          }
        });
        return;
      }
    }

    const options: QueryOptions = {
      page,
      limit,
      sortBy,
      sortOrder
    };

    if (filters.length > 0) {
      options.filters = filters;
    }

    const result = await DataQueryService.getUserData(userId, options);
    
    // Transform data for frontend consumption
    const transformedData = DataQueryService.transformDataForFrontend(result.data);

    res.json({
      success: true,
      data: {
        rows: transformedData,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalCount: result.totalCount,
          totalPages: Math.ceil(result.totalCount / result.limit),
          hasNext: result.page * result.limit < result.totalCount,
          hasPrev: result.page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error retrieving user data:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATA_RETRIEVAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retrieve data'
      }
    });
  }
});

/**
 * GET /api/data/upload/:uploadId
 * Get data for a specific upload with advanced filtering and sorting
 */
router.get('/upload/:uploadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const uploadId = req.params.uploadId;
    
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const sortBy = req.query.sortBy as string;
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    
    // Parse filters
    const filters: Filter[] = [];
    if (req.query.filters) {
      try {
        const parsedFilters = JSON.parse(req.query.filters as string);
        if (Array.isArray(parsedFilters)) {
          filters.push(...parsedFilters);
        }
      } catch (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILTERS',
            message: 'Invalid filters format. Expected JSON array.'
          }
        });
        return;
      }
    }

    const options: QueryOptions = {
      page,
      limit,
      sortBy,
      sortOrder
    };

    if (filters.length > 0) {
      options.filters = filters;
    }

    const result = await DataQueryService.getUploadData(userId, uploadId, options);
    
    // Transform data for frontend consumption
    const transformedData = DataQueryService.transformDataForFrontend(result.data);

    res.json({
      success: true,
      data: {
        rows: transformedData,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalCount: result.totalCount,
          totalPages: Math.ceil(result.totalCount / result.limit),
          hasNext: result.page * result.limit < result.totalCount,
          hasPrev: result.page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error retrieving upload data:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'UPLOAD_NOT_FOUND',
          message: 'Upload not found or access denied'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'DATA_RETRIEVAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retrieve upload data'
        }
      });
    }
  }
});

/**
 * GET /api/data/columns
 * Get column information for dynamic table headers
 */
router.get('/columns', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const uploadId = req.query.uploadId as string;

    const columnInfo = await DataQueryService.getColumnInfo(userId, uploadId);

    res.json({
      success: true,
      data: {
        columns: columnInfo
      }
    });

  } catch (error) {
    console.error('Error retrieving column info:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'COLUMN_INFO_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retrieve column information'
      }
    });
  }
});

/**
 * GET /api/data/columns/calculated
 * Get calculated columns for a user or specific upload
 */
router.get('/columns/calculated', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const uploadId = req.query.uploadId as string;

    const calculatedColumns = await DataQueryService.getCalculatedColumns(userId, uploadId);

    res.json({
      success: true,
      data: {
        calculatedColumns
      }
    });

  } catch (error) {
    console.error('Error retrieving calculated columns:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CALCULATED_COLUMNS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retrieve calculated columns'
      }
    });
  }
});

/**
 * GET /api/data/stats
 * Get aggregated statistics for dashboard
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const stats = await DataQueryService.getDashboardStats(userId);

    res.json({
      success: true,
      data: {
        stats
      }
    });

  } catch (error) {
    console.error('Error retrieving dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retrieve statistics'
      }
    });
  }
});

/**
 * GET /api/data/uploads
 * Get user's upload history with metadata
 */
router.get('/uploads', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

    // Use existing DataStorageService method
    const { DataStorageService } = await import('../services/DataStorageService');
    const uploads = await DataStorageService.getUserUploads(userId, limit);

    res.json({
      success: true,
      data: {
        uploads
      }
    });

  } catch (error) {
    console.error('Error retrieving uploads:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOADS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retrieve uploads'
      }
    });
  }
});

/**
 * POST /api/data/search
 * Advanced search across user's data with complex filters
 */
router.post('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { 
      query, 
      columns, 
      page = 1, 
      limit = 100, 
      sortBy, 
      sortOrder = 'asc'
    } = req.body;

    // Validate input
    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SEARCH_QUERY',
          message: 'Search query is required and must be a string'
        }
      });
      return;
    }

    // Build search filters
    const filters: Filter[] = [];
    
    if (columns && Array.isArray(columns)) {
      // Search across specified columns
      columns.forEach(column => {
        filters.push({
          column,
          operator: 'contains',
          value: query
        });
      });
    }

    const options: QueryOptions = {
      page: Math.max(1, parseInt(page)),
      limit: Math.min(parseInt(limit), 1000),
      sortBy,
      sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
      filters
    };

    const result = await DataQueryService.getUserData(userId, options);
    const transformedData = DataQueryService.transformDataForFrontend(result.data);

    res.json({
      success: true,
      data: {
        rows: transformedData,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalCount: result.totalCount,
          totalPages: Math.ceil(result.totalCount / result.limit),
          hasNext: result.page * result.limit < result.totalCount,
          hasPrev: result.page > 1
        },
        searchQuery: query,
        searchColumns: columns
      }
    });

  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to perform search'
      }
    });
  }
});

export default router;