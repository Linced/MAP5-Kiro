import { Router, Request, Response } from 'express';
import { BucketService } from '../services';
import { authenticateToken } from '../middleware/auth';
import { CreateBucketRequest, UpdateBucketRequest } from '../types';

const router = Router();
const bucketService = new BucketService();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/buckets - Get user's buckets
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const buckets = await bucketService.getUserBuckets(userId);
    
    res.json({
      success: true,
      data: buckets
    });
  } catch (error: any) {
    console.error('Error fetching buckets:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_BUCKETS_ERROR',
        message: 'Failed to fetch buckets',
        details: error.message
      }
    });
  }
});

// GET /api/buckets/:id/strategies - Get strategies in a bucket
router.get('/:id/strategies', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const bucketId = parseInt(req.params.id);

    if (isNaN(bucketId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BUCKET_ID',
          message: 'Invalid bucket ID'
        }
      });
    }

    const strategies = await bucketService.getStrategiesInBucket(userId, bucketId);
    
    res.json({
      success: true,
      data: strategies
    });
  } catch (error: any) {
    console.error('Error fetching strategies in bucket:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_BUCKET_STRATEGIES_ERROR',
        message: 'Failed to fetch strategies in bucket',
        details: error.message
      }
    });
  }
});

// POST /api/buckets - Create new bucket
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const bucketData: CreateBucketRequest = req.body;

    // Basic validation
    if (!bucketData.name || !bucketData.name.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bucket name is required'
        }
      });
    }

    // Validate color format if provided
    if (bucketData.color && !/^#[0-9A-F]{6}$/i.test(bucketData.color)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Color must be a valid hex color (e.g., #FF0000)'
        }
      });
    }

    const bucket = await bucketService.createBucket(userId, bucketData);
    
    res.status(201).json({
      success: true,
      data: bucket
    });
  } catch (error: any) {
    console.error('Error creating bucket:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_BUCKET_ERROR',
        message: 'Failed to create bucket',
        details: error.message
      }
    });
  }
});

// PUT /api/buckets/:id - Update bucket
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const bucketId = parseInt(req.params.id);
    const updates: UpdateBucketRequest = req.body;

    if (isNaN(bucketId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BUCKET_ID',
          message: 'Invalid bucket ID'
        }
      });
    }

    // Validate color format if provided
    if (updates.color && !/^#[0-9A-F]{6}$/i.test(updates.color)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Color must be a valid hex color (e.g., #FF0000)'
        }
      });
    }

    const bucket = await bucketService.updateBucket(userId, bucketId, updates);
    
    res.json({
      success: true,
      data: bucket
    });
  } catch (error: any) {
    console.error('Error updating bucket:', error);
    
    if (error.message === 'Bucket not found or access denied') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BUCKET_NOT_FOUND',
          message: 'Bucket not found or access denied'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_BUCKET_ERROR',
        message: 'Failed to update bucket',
        details: error.message
      }
    });
  }
});

// DELETE /api/buckets/:id - Delete bucket
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const bucketId = parseInt(req.params.id);

    if (isNaN(bucketId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BUCKET_ID',
          message: 'Invalid bucket ID'
        }
      });
    }

    await bucketService.deleteBucket(userId, bucketId);
    
    res.json({
      success: true,
      message: 'Bucket deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting bucket:', error);
    
    if (error.message === 'Bucket not found or access denied') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BUCKET_NOT_FOUND',
          message: 'Bucket not found or access denied'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_BUCKET_ERROR',
        message: 'Failed to delete bucket',
        details: error.message
      }
    });
  }
});

export default router;