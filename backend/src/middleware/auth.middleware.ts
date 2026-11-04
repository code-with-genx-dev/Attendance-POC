import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/auth';
import { dbRepository, UserRecord } from '../db';

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
  tokenPayload?: TokenPayload;
}

/**
 * Middleware: Requires a valid JWT in Authorization: Bearer <token>
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token is required.'
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    const user = await dbRepository.getUserById(payload.userId);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'The account associated with this token no longer exists.'
      });
      return;
    }

    if (user.status === 'inactive') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'This user account is inactive. Please contact your administrator.'
      });
      return;
    }

    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (err: any) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token.'
    });
    return;
  }
}

/**
 * Middleware: Restricts access to specific role(s)
 */
export function requireRole(...allowedRoles: Array<'Admin' | 'Employee'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}.`
      });
      return;
    }

    next();
  };
}

export const requireAdmin = requireRole('Admin');
export const requireEmployee = requireRole('Employee', 'Admin');

