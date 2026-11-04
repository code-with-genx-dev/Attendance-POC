import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { dbRepository } from '../db';
import { comparePassword, hashPassword, generateToken } from '../utils/auth';

export async function login(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { company_email, password } = req.body;

  if (!company_email || typeof company_email !== 'string') {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Company email is required.'
    });
    return;
  }

  if (!password || typeof password !== 'string') {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Password is required.'
    });
    return;
  }

  const user = await dbRepository.getUserByEmail(company_email);
  if (!user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid company email or password.'
    });
    return;
  }

  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid company email or password.'
    });
    return;
  }

  if (user.status === 'inactive') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'This account is deactivated. Please contact HR or System Administrator.'
    });
    return;
  }

  const token = generateToken({
    userId: user.id,
    email: user.company_email,
    role: user.role,
    status: user.status
  });

  const mustChangePassword = user.status === 'pending_password_change';

  res.json({
    message: 'Authentication successful.',
    token,
    mustChangePassword,
    user: {
      id: user.id,
      company_email: user.company_email,
      full_name: user.full_name,
      employee_code: user.employee_code,
      role: user.role,
      status: user.status,
      mustChangePassword
    }
  });
}

export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const { currentPassword, newPassword, current_password, new_password } = req.body;
  const targetNewPassword = newPassword || new_password;
  const targetCurrentPassword = currentPassword || current_password;

  if (!targetNewPassword || typeof targetNewPassword !== 'string' || targetNewPassword.length < 8) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'New password must be a string of at least 8 characters.'
    });
    return;
  }

  // If user is already active (not first-time temporary password reset), require current password
  if (user.status !== 'pending_password_change') {
    if (!targetCurrentPassword) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Current password is required to update your password.'
      });
      return;
    }

    const isMatch = await comparePassword(targetCurrentPassword, user.password_hash);
    if (!isMatch) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Current password does not match.'
      });
      return;
    }
  }

  const newHash = await hashPassword(targetNewPassword);
  await dbRepository.updateUserPassword(user.id, newHash);

  await dbRepository.createAuditLog({
    actor_user_id: user.id,
    action: 'PASSWORD_CHANGED',
    entity_type: 'users',
    entity_id: user.id,
    reason: user.status === 'pending_password_change'
      ? 'Initial temporary password replaced at first login'
      : 'Password updated by authenticated user'
  });

  res.json({
    message: 'Password updated successfully.',
    status: 'active',
    mustChangePassword: false
  });
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;

  res.json({
    user: {
      id: user.id,
      company_email: user.company_email,
      full_name: user.full_name,
      employee_code: user.employee_code,
      role: user.role,
      status: user.status,
      mustChangePassword: user.status === 'pending_password_change',
      created_at: user.created_at
    }
  });
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const { full_name } = req.body;

  if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Full name is required.'
    });
    return;
  }

  await dbRepository.updateUserName(user.id, full_name.trim());

  await dbRepository.createAuditLog({
    actor_user_id: user.id,
    action: 'PROFILE_UPDATED',
    entity_type: 'users',
    entity_id: user.id,
    reason: 'User updated their profile name'
  });

  res.json({
    message: 'Profile updated successfully.',
    full_name: full_name.trim()
  });
}

