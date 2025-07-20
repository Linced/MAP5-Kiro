import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Configure multer for CSV file uploads
const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file extension and MIME type
  const isCSV = file.mimetype === 'text/csv' ||
    file.mimetype === 'application/csv' ||
    file.originalname.toLowerCase().endsWith('.csv');

  if (isCSV) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed. Please upload a .csv file.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
    files: 1, // Only allow single file upload
  },
  fileFilter,
});

// Middleware wrapper with enhanced error handling
export const uploadCSVMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds 25MB limit. Please upload a smaller CSV file.'
          }
        });
      }

      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TOO_MANY_FILES',
            message: 'Only one file can be uploaded at a time.'
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: `Upload error: ${err.message}`
        }
      });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: err.message
        }
      });
    }

    // Check if file was provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No CSV file provided. Please select a file to upload.'
        }
      });
    }

    return next();
  });
};

export default uploadCSVMiddleware;