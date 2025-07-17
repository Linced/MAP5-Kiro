import { Router, Request, Response } from 'express';
import { TagService } from '../services';
import { authenticateToken } from '../middleware/auth';
import { CreateTagRequest, UpdateTagRequest } from '../types';

const router = Router();
const tagService = new TagService();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/tags - Get user's tags
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tags = await tagService.getUserTags(userId);
    
    res.json({
      success: true,
      data: tags
    });
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_TAGS_ERROR',
        message: 'Failed to fetch tags',
        details: error.message
      }
    });
  }
});

// GET /api/tags/:id/strategies - Get strategies with a specific tag
router.get('/:id/strategies', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tagId = parseInt(req.params.id);

    if (isNaN(tagId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TAG_ID',
          message: 'Invalid tag ID'
        }
      });
    }

    const strategies = await tagService.getStrategiesByTag(userId, tagId);
    
    res.json({
      success: true,
      data: strategies
    });
  } catch (error: any) {
    console.error('Error fetching strategies by tag:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_TAG_STRATEGIES_ERROR',
        message: 'Failed to fetch strategies by tag',
        details: error.message
      }
    });
  }
});

// POST /api/tags - Create new tag
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tagData: CreateTagRequest = req.body;

    // Basic validation
    if (!tagData.name || !tagData.name.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Tag name is required'
        }
      });
    }

    // Validate color format if provided
    if (tagData.color && !/^#[0-9A-F]{6}$/i.test(tagData.color)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Color must be a valid hex color (e.g., #FF0000)'
        }
      });
    }

    const tag = await tagService.createTag(userId, tagData);
    
    res.status(201).json({
      success: true,
      data: tag
    });
  } catch (error: any) {
    console.error('Error creating tag:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'TAG_EXISTS',
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_TAG_ERROR',
        message: 'Failed to create tag',
        details: error.message
      }
    });
  }
});

// PUT /api/tags/:id - Update tag
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tagId = parseInt(req.params.id);
    const updates: UpdateTagRequest = req.body;

    if (isNaN(tagId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TAG_ID',
          message: 'Invalid tag ID'
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

    const tag = await tagService.updateTag(userId, tagId, updates);
    
    res.json({
      success: true,
      data: tag
    });
  } catch (error: any) {
    console.error('Error updating tag:', error);
    
    if (error.message === 'Tag not found or access denied') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TAG_NOT_FOUND',
          message: 'Tag not found or access denied'
        }
      });
    }

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'TAG_EXISTS',
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_TAG_ERROR',
        message: 'Failed to update tag',
        details: error.message
      }
    });
  }
});

// DELETE /api/tags/:id - Delete tag
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tagId = parseInt(req.params.id);

    if (isNaN(tagId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TAG_ID',
          message: 'Invalid tag ID'
        }
      });
    }

    await tagService.deleteTag(userId, tagId);
    
    res.json({
      success: true,
      message: 'Tag deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting tag:', error);
    
    if (error.message === 'Tag not found or access denied') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TAG_NOT_FOUND',
          message: 'Tag not found or access denied'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_TAG_ERROR',
        message: 'Failed to delete tag',
        details: error.message
      }
    });
  }
});

export default router;