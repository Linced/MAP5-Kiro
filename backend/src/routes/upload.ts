import express from 'express';
import { uploadCSVMiddleware } from '../middleware/upload';
import { authenticateToken } from '../middleware/auth';
import { 
  CSVService, 
  DataStorageService, 
  UploadTrackingService 
} from '../services';

const router = express.Router();

// CSV upload endpoint with comprehensive error handling
router.post('/csv', authenticateToken, uploadCSVMiddleware, async (req, res) => {
  let uploadId: string | undefined;
  
  try {
    const userId = req.user!.id;
    const file = req.file!;
    
    // Check upload limits
    const limitCheck = await UploadTrackingService.checkUploadLimits(userId);
    if (!limitCheck.canUpload) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'UPLOAD_LIMIT_EXCEEDED',
          message: limitCheck.reason,
          details: limitCheck.limits
        }
      });
    }
    
    // Initialize upload tracking
    uploadId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    UploadTrackingService.initializeUpload(uploadId);
    UploadTrackingService.updateProgress(uploadId, 10, 'processing', 'Parsing CSV file...');
    
    // Parse CSV file
    let parsedData;
    try {
      parsedData = await CSVService.parseFile(file.buffer);
      UploadTrackingService.updateProgress(uploadId, 30, 'processing', 'Validating CSV structure...');
    } catch (parseError) {
      UploadTrackingService.markAsFailed(uploadId, `CSV parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'CSV_PARSE_ERROR',
          message: parseError instanceof Error ? parseError.message : 'Failed to parse CSV file'
        }
      });
    }
    
    // Validate CSV structure
    const validation = CSVService.validateStructure(parsedData);
    if (!validation.isValid) {
      UploadTrackingService.markAsFailed(uploadId, `Validation failed: ${validation.errors.join(', ')}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'CSV_VALIDATION_ERROR',
          message: 'CSV file validation failed',
          details: validation.errors
        }
      });
    }
    
    UploadTrackingService.updateProgress(uploadId, 50, 'processing', 'Storing data...');
    
    // Store data in database
    let storageResult;
    try {
      storageResult = await DataStorageService.storeData(
        userId,
        file.originalname,
        parsedData
      );
      
      // Update tracking with actual upload ID
      const actualUploadId = storageResult.uploadId;
      UploadTrackingService.cleanup(uploadId); // Clean up temp tracking
      UploadTrackingService.initializeUpload(actualUploadId);
      UploadTrackingService.markAsCompleted(actualUploadId, storageResult.rowCount);
      uploadId = actualUploadId;
      
    } catch (storageError) {
      UploadTrackingService.markAsFailed(uploadId, `Storage failed: ${storageError instanceof Error ? storageError.message : 'Unknown error'}`);
      return res.status(500).json({
        success: false,
        error: {
          code: 'STORAGE_ERROR',
          message: storageError instanceof Error ? storageError.message : 'Failed to store CSV data'
        }
      });
    }
    
    // Detect column types for additional metadata
    const columnTypes = CSVService.detectColumnTypes(parsedData);
    
    // Return success response with comprehensive data
    return res.status(201).json({
      success: true,
      data: {
        uploadId: storageResult.uploadId,
        filename: file.originalname,
        rowCount: storageResult.rowCount,
        columns: parsedData.headers,
        columnTypes,
        preview: parsedData.rows.slice(0, 5), // First 5 rows for preview
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    
    if (uploadId) {
      UploadTrackingService.markAsFailed(uploadId, `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: 'An unexpected error occurred during file upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// Get uploaded data with enhanced error handling and authentication
router.get('/data/:uploadId', authenticateToken, async (req, res) => {
  try {
    const { uploadId } = req.params;
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000); // Cap at 1000
    const sortBy = req.query.sortBy as string;
    const sortOrder = (req.query.sortOrder as string) === 'desc' ? 'desc' : 'asc';

    // Get data using the service
    const result = await DataStorageService.getDataRows(
      uploadId, 
      userId, 
      page, 
      limit, 
      sortBy, 
      sortOrder
    );
    
    // Get upload metadata
    const upload = await DataStorageService.getUploadMetadata(uploadId, userId);
    if (!upload) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'UPLOAD_NOT_FOUND',
          message: 'Upload not found or access denied'
        }
      });
    }

    return res.json({
      success: true,
      data: {
        upload: {
          id: upload.id,
          filename: upload.filename,
          rowCount: upload.rowCount,
          columns: upload.columnNames,
          uploadedAt: upload.uploadedAt
        },
        rows: result.rows.map(row => ({
          index: row.rowIndex,
          data: row.data
        })),
        pagination: {
          page,
          limit,
          totalCount: result.totalCount,
          totalPages: Math.ceil(result.totalCount / limit)
        }
      }
    });

  } catch (error) {
    console.error('Data retrieval error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to retrieve data'
      }
    });
  }
});

// Get upload progress
router.get('/progress/:uploadId', authenticateToken, async (req, res) => {
  try {
    const { uploadId } = req.params;
    const progress = UploadTrackingService.getProgress(uploadId);
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROGRESS_NOT_FOUND',
          message: 'Upload progress not found'
        }
      });
    }
    
    return res.json({
      success: true,
      data: progress
    });
    
  } catch (error) {
    console.error('Progress retrieval error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'PROGRESS_ERROR',
        message: 'Failed to retrieve upload progress'
      }
    });
  }
});

// Get user's upload history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    
    const uploads = await DataStorageService.getUserUploads(userId, limit);
    
    return res.json({
      success: true,
      data: {
        uploads,
        count: uploads.length
      }
    });
    
  } catch (error) {
    console.error('Upload history error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'HISTORY_ERROR',
        message: 'Failed to retrieve upload history'
      }
    });
  }
});

// Get user's upload statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const [storageStats, uploadStats] = await Promise.all([
      DataStorageService.getUserStorageStats(userId),
      UploadTrackingService.getUserUploadStats(userId)
    ]);
    
    return res.json({
      success: true,
      data: {
        storage: storageStats,
        uploads: uploadStats
      }
    });
    
  } catch (error) {
    console.error('Stats retrieval error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: 'Failed to retrieve upload statistics'
      }
    });
  }
});

// Delete an upload and all associated data
router.delete('/:uploadId', authenticateToken, async (req, res) => {
  try {
    const { uploadId } = req.params;
    const userId = req.user!.id;
    
    const deleted = await DataStorageService.deleteUpload(uploadId, userId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'UPLOAD_NOT_FOUND',
          message: 'Upload not found or access denied'
        }
      });
    }
    
    // Clean up any tracking data
    UploadTrackingService.cleanup(uploadId);
    
    return res.json({
      success: true,
      message: 'Upload deleted successfully'
    });
    
  } catch (error) {
    console.error('Upload deletion error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete upload'
      }
    });
  }
});

// Get upload metadata only
router.get('/:uploadId/metadata', authenticateToken, async (req, res) => {
  try {
    const { uploadId } = req.params;
    const userId = req.user!.id;
    
    const upload = await DataStorageService.getUploadMetadata(uploadId, userId);
    
    if (!upload) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'UPLOAD_NOT_FOUND',
          message: 'Upload not found or access denied'
        }
      });
    }
    
    return res.json({
      success: true,
      data: upload
    });
    
  } catch (error) {
    console.error('Metadata retrieval error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'METADATA_ERROR',
        message: 'Failed to retrieve upload metadata'
      }
    });
  }
});

export default router;