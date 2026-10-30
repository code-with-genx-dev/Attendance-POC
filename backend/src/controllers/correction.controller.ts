import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { dbRepository } from '../db';
import { missingPunchService } from '../services/missingPunch.service';
import { getOfficeWorkDate } from './attendance.controller';

/**
 * Submit a missed-punch correction request (Employee)
 */
export async function submitCorrection(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const { session_id, punch_type, requested_time, reason } = req.body;

  if (!punch_type || !['check_in', 'check_out'].includes(punch_type)) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid punch_type. Must be either "check_in" or "check_out".'
    });
    return;
  }

  if (!requested_time || isNaN(Date.parse(requested_time))) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'A valid requested_time ISO timestamp is required.'
    });
    return;
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Reason for the missed punch is required.'
    });
    return;
  }

  const requestedDate = new Date(requested_time);

  const correction = await dbRepository.createCorrectionRequest({
    user_id: user.id,
    session_id: session_id ? parseInt(session_id, 10) : null,
    punch_type,
    requested_time: requestedDate,
    reason: reason.trim()
  });

  res.status(201).json({
    message: 'Correction request submitted successfully for Admin review.',
    correction
  });
}

/**
 * Get personal correction requests for the authenticated employee
 */
export async function getMyCorrections(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const corrections = await dbRepository.getCorrections({ user_id: user.id });
  res.json({ corrections });
}

/**
 * List all correction requests for Admin review
 */
export async function getAdminCorrections(req: AuthenticatedRequest, res: Response): Promise<void> {
  const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;
  const corrections = await dbRepository.getCorrections({ status: statusFilter });
  res.json({ corrections });
}

/**
 * Admin review: Approve or reject a correction request with mandatory decision reason
 */
export async function reviewCorrection(req: AuthenticatedRequest, res: Response): Promise<void> {
  const admin = req.user!;
  const correctionId = parseInt(req.params.id, 10);
  const { status, decision_reason } = req.body;

  if (isNaN(correctionId)) {
    res.status(400).json({ error: 'Bad Request', message: 'Invalid correction request ID.' });
    return;
  }

  if (!status || !['approved', 'rejected'].includes(status)) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Status must be either "approved" or "rejected".'
    });
    return;
  }

  if (!decision_reason || typeof decision_reason !== 'string' || decision_reason.trim().length === 0) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'A decision reason is mandatory when reviewing correction requests.'
    });
    return;
  }

  const correction = await dbRepository.getCorrectionById(correctionId);
  if (!correction) {
    res.status(404).json({ error: 'Not Found', message: 'Correction request not found.' });
    return;
  }

  if (correction.status !== 'pending') {
    res.status(400).json({
      error: 'Bad Request',
      message: `Correction request has already been ${correction.status}.`
    });
    return;
  }

  const cleanReason = decision_reason.trim();

  // If approved, update session and add audit-backed attendance event
  if (status === 'approved') {
    const requestedTime = new Date(correction.requested_time);

    if (correction.session_id) {
      if (correction.punch_type === 'check_in') {
        await dbRepository.updateSessionCheckIn(correction.session_id, requestedTime);
      } else if (correction.punch_type === 'check_out') {
        await dbRepository.updateSessionCheckOut(correction.session_id, requestedTime);
      }
    } else {
      // Missed punch on a date with no existing session
      const workDate = getOfficeWorkDate(requestedTime);
      if (correction.punch_type === 'check_in') {
        await dbRepository.createSession({
          user_id: correction.user_id,
          work_date: workDate,
          check_in_at: requestedTime,
          status: 'open'
        });
      }
    }

    // Record immutable punch event with source: admin_correction
    await dbRepository.createAttendanceEvent({
      user_id: correction.user_id,
      event_type: correction.punch_type,
      server_timestamp: new Date(),
      qr_token_id: null,
      source: 'admin_correction',
      idempotency_key: `correction_${correction.id}_${Date.now()}`
    });
  }

  // Update correction status
  const updated = await dbRepository.reviewCorrection(correctionId, {
    status,
    reviewed_by: admin.id,
    decision_reason: cleanReason
  });

  // Record audit log
  await dbRepository.createAuditLog({
    actor_user_id: admin.id,
    action: `CORRECTION_${status.toUpperCase()}`,
    entity_type: 'correction_requests',
    entity_id: correctionId,
    reason: cleanReason
  });

  res.json({
    message: `Correction request ${status} successfully.`,
    correction: updated
  });
}

/**
 * Get exceptions summary (No Punch & Incomplete Sessions)
 */
export async function getExceptions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const summary = await missingPunchService.getExceptionsSummary();
  res.json(summary);
}

