import { Request, Response } from 'express';
import { qrService } from '../services/qr.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { dbRepository } from '../db';

export async function getCurrentQr(req: Request, res: Response): Promise<void> {
  try {
    const payload = await qrService.getCurrentQr();
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve or generate current QR token.'
    });
  }
}

export async function rotateQr(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const payload = await qrService.generateNewToken();

    if (req.user) {
      await dbRepository.createAuditLog({
        actor_user_id: req.user.id,
        action: 'QR_ROTATED_MANUALLY',
        entity_type: 'qr_tokens',
        entity_id: null,
        reason: 'Office QR token manually rotated by Admin'
      });
    }

    res.json({
      message: 'Office QR token successfully rotated.',
      ...payload
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to force QR rotation.'
    });
  }
}

