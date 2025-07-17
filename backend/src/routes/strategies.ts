import { Router, Request, Response } from 'express';
import { StrategyService } from '../services';
import { authenticateToken } from '../middleware/auth';
import { CreateStrategyRequest, UpdateStrategyRequest, QueryOptions } from '../types';

const router = Router();
const strategyService = new StrategyService();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/strategies - Get user's strategies with optional filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc';
    
    // Parse filters
    const filters = [];
    if (req.query.name) {
      filters.push({
        column: 'name',
        operator: 'contains' as const,
        value: req.query.name
      });
    }
    if (req.query.isActive !== undefined) {
      filters.push({
        column: 'is_active',
        operator: 'eq' as const,
        value: req.query.isActive === 'true'
      });
    }
    if (req.query.bucketId) {
      filters.push({
        column: 'bucket_id',
        operator: 'eq' as const,
        value: parseInt(req.query.bucketId as string)
      });
    }

    const options: QueryOptions = {
      page,
      limit,
      sortBy,
      sortOrder,
      filters: filters.length > 0 ? filters : undefined
    };

    const strategies = await strategyService.getUserStrategies(userId, options);
    
    res.json({
      success: true,
      data: strategies
    });
  } catch (error: any) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_STRATEGIES_ERROR',
        message: 'Failed to fetch strategies',
        details: error.message
      }
    });
  }
});

// GET /api/strategies/:id - Get specific strategy
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const strategyId = parseInt(req.params.id);

    if (isNaN(strategyId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STRATEGY_ID',
          message: 'Invalid strategy ID'
        }
      });
    }

    const strategy = await strategyService.getStrategyById(userId, strategyId);
    
    res.json({
      success: true,
      data: strategy
    });
  } catch (error: any) {
    console.error('Error fetching strategy:', error);
    
    if (error.message === 'Strategy not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STRATEGY_NOT_FOUND',
          message: 'Strategy not found'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_STRATEGY_ERROR',
        message: 'Failed to fetch strategy',
        details: error.message
      }
    });
  }
});

// POST /api/strategies - Create new strategy
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const strategyData: CreateStrategyRequest = req.body;

    // Basic validation
    if (!strategyData.name || !strategyData.name.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Strategy name is required'
        }
      });
    }

    if (!strategyData.entryRules || !Array.isArray(strategyData.entryRules)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Entry rules are required and must be an array'
        }
      });
    }

    if (!strategyData.exitRules || !Array.isArray(strategyData.exitRules)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Exit rules are required and must be an array'
        }
      });
    }

    if (!strategyData.riskManagement || typeof strategyData.riskManagement !== 'object') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Risk management parameters are required'
        }
      });
    }

    const strategy = await strategyService.createStrategy(userId, strategyData);
    
    res.status(201).json({
      success: true,
      data: strategy
    });
  } catch (error: any) {
    console.error('Error creating strategy:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_STRATEGY_ERROR',
        message: 'Failed to create strategy',
        details: error.message
      }
    });
  }
});

// PUT /api/strategies/:id - Update strategy
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const strategyId = parseInt(req.params.id);
    const updates: UpdateStrategyRequest = req.body;

    if (isNaN(strategyId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STRATEGY_ID',
          message: 'Invalid strategy ID'
        }
      });
    }

    const strategy = await strategyService.updateStrategy(userId, strategyId, updates);
    
    res.json({
      success: true,
      data: strategy
    });
  } catch (error: any) {
    console.error('Error updating strategy:', error);
    
    if (error.message === 'Strategy not found or access denied') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STRATEGY_NOT_FOUND',
          message: 'Strategy not found or access denied'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_STRATEGY_ERROR',
        message: 'Failed to update strategy',
        details: error.message
      }
    });
  }
});

// DELETE /api/strategies/:id - Delete strategy
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const strategyId = parseInt(req.params.id);

    if (isNaN(strategyId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STRATEGY_ID',
          message: 'Invalid strategy ID'
        }
      });
    }

    await strategyService.deleteStrategy(userId, strategyId);
    
    res.json({
      success: true,
      message: 'Strategy deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting strategy:', error);
    
    if (error.message === 'Strategy not found or access denied') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STRATEGY_NOT_FOUND',
          message: 'Strategy not found or access denied'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_STRATEGY_ERROR',
        message: 'Failed to delete strategy',
        details: error.message
      }
    });
  }
});

// PUT /api/strategies/:id/bucket - Assign strategy to bucket
router.put('/:id/bucket', async (req: Request, res: Response) => {
  try {
    const strategyId = parseInt(req.params.id);
    const { bucketId } = req.body;

    if (isNaN(strategyId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STRATEGY_ID',
          message: 'Invalid strategy ID'
        }
      });
    }

    if (bucketId !== null && (isNaN(parseInt(bucketId)) || parseInt(bucketId) <= 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BUCKET_ID',
          message: 'Invalid bucket ID'
        }
      });
    }

    await strategyService.assignStrategyToBucket(strategyId, bucketId);
    
    res.json({
      success: true,
      message: 'Strategy assigned to bucket successfully'
    });
  } catch (error: any) {
    console.error('Error assigning strategy to bucket:', error);
    
    if (error.message === 'Strategy not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STRATEGY_NOT_FOUND',
          message: 'Strategy not found'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'ASSIGN_BUCKET_ERROR',
        message: 'Failed to assign strategy to bucket',
        details: error.message
      }
    });
  }
});

// PUT /api/strategies/:id/tags - Update strategy tags
router.put('/:id/tags', async (req: Request, res: Response) => {
  try {
    const strategyId = parseInt(req.params.id);
    const { tagIds } = req.body;

    if (isNaN(strategyId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STRATEGY_ID',
          message: 'Invalid strategy ID'
        }
      });
    }

    if (!Array.isArray(tagIds)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TAG_IDS',
          message: 'Tag IDs must be an array'
        }
      });
    }

    // Validate all tag IDs are numbers
    const validTagIds = tagIds.every(id => Number.isInteger(id) && id > 0);
    if (!validTagIds) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TAG_IDS',
          message: 'All tag IDs must be positive integers'
        }
      });
    }

    await strategyService.addTagsToStrategy(strategyId, tagIds);
    
    res.json({
      success: true,
      message: 'Strategy tags updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating strategy tags:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_TAGS_ERROR',
        message: 'Failed to update strategy tags',
        details: error.message
      }
    });
  }
});

export default router;