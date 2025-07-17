import { Router } from 'express';
import { CalculationService } from '../services';
import { DataStorageService } from '../services';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const calculationService = new CalculationService();

// Validate formula endpoint
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { formula, uploadId } = req.body;
    
    if (!formula || !uploadId) {
      return res.status(400).json({
        error: 'Formula and uploadId are required'
      });
    }

    // Get upload metadata to get column names
    const upload = await DataStorageService.getUploadMetadata(uploadId, req.user!.id);
    if (!upload) {
      return res.status(404).json({
        error: 'Upload not found'
      });
    }

    const validation = calculationService.validateFormula(formula, upload.columnNames);
    
    return res.json({
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings || []
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: `Formula validation failed: ${errorMessage}`
    });
  }
});

// Generate formula preview endpoint
router.post('/preview', authenticateToken, async (req, res) => {
  try {
    const { formula, uploadId } = req.body;
    
    if (!formula || !uploadId) {
      return res.status(400).json({
        error: 'Formula and uploadId are required'
      });
    }

    // Get upload metadata
    const upload = await DataStorageService.getUploadMetadata(uploadId, req.user!.id);
    if (!upload) {
      return res.status(404).json({
        error: 'Upload not found'
      });
    }

    // Get sample data for preview (first 10 rows)
    const { rows } = await DataStorageService.getDataRows(uploadId, req.user!.id, 1, 10);
    const sampleData = rows.map(row => row.data);

    const preview = calculationService.generatePreview(formula, sampleData, upload.columnNames);
    
    return res.json(preview);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: `Preview generation failed: ${errorMessage}`
    });
  }
});

// Save calculated column endpoint
router.post('/columns', authenticateToken, async (req, res) => {
  try {
    const { columnName, formula, uploadId } = req.body;
    
    if (!columnName || !formula || !uploadId) {
      return res.status(400).json({
        error: 'Column name, formula, and uploadId are required'
      });
    }

    // Verify upload exists and user has access
    const upload = await DataStorageService.getUploadMetadata(uploadId, req.user!.id);
    if (!upload) {
      return res.status(404).json({
        error: 'Upload not found'
      });
    }

    // Validate formula before saving
    const validation = calculationService.validateFormula(formula, upload.columnNames);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid formula',
        details: validation.errors
      });
    }

    const savedColumn = await calculationService.saveCalculatedColumn(
      req.user!.id,
      uploadId,
      columnName,
      formula
    );
    
    return res.status(201).json(savedColumn);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: `Failed to save calculated column: ${errorMessage}`
    });
  }
});

// Get calculated columns for an upload
router.get('/columns/:uploadId', authenticateToken, async (req, res) => {
  try {
    const { uploadId } = req.params;
    
    // Verify upload exists and user has access
    const upload = await DataStorageService.getUploadMetadata(uploadId, req.user!.id);
    if (!upload) {
      return res.status(404).json({
        error: 'Upload not found'
      });
    }

    const columns = await calculationService.getCalculatedColumns(req.user!.id, uploadId);
    
    return res.json(columns);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: `Failed to retrieve calculated columns: ${errorMessage}`
    });
  }
});

// Delete calculated column
router.delete('/columns/:columnId', authenticateToken, async (req, res) => {
  try {
    const { columnId } = req.params;
    const columnIdNum = parseInt(columnId);
    
    if (isNaN(columnIdNum)) {
      return res.status(400).json({
        error: 'Invalid column ID'
      });
    }

    await calculationService.deleteCalculatedColumn(req.user!.id, columnIdNum);
    
    return res.status(204).send();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('not found')) {
      return res.status(404).json({
        error: errorMessage
      });
    } else {
      return res.status(500).json({
        error: `Failed to delete calculated column: ${errorMessage}`
      });
    }
  }
});

export default router;