import express from 'express';
import { UserModel } from '../models/User';

const router = express.Router();

// Temporary endpoint to verify an email directly
router.post('/verify-demo', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Only allow demo email for security
    if (email !== 'demo@tradeinsight.com') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only demo account can be verified with this endpoint'
        }
      });
    }
    
    // Find the user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Demo user not found'
        }
      });
    }
    
    // Check if already verified
    if (user.emailVerified) {
      return res.json({
        success: true,
        message: 'Demo account is already verified'
      });
    }
    
    // Verify the email
    const success = await UserModel.verifyEmailById(user.id);
    
    if (success) {
      return res.json({
        success: true,
        message: 'Demo account verified successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_FAILED',
          message: 'Failed to verify demo account'
        }
      });
    }
  } catch (error) {
    console.error('Demo verification error:', error);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

export default router;