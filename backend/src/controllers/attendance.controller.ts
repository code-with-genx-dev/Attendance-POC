import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { dbRepository } from '../db';
import { qrService } from '../services/qr.service';
import { config } from '../config';

/**
 * Returns YYYY-MM-DD string for a date in the configured office timezone
 */
export function getOfficeWorkDate(date: Date = new Date()): string {
  // Use Intl.DateTimeFormat to reliably format in target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.attendance.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date); // outputs YYYY-MM-DD
}

/**
 * Formats a Date object for display in the office timezone
 */
export function formatOfficeTime(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: config.attendance.timezone,
      dateStyle: 'medium',
      timeStyle: 'medium'
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
}

/**
 * Validates office QR token and executes atomic check-in / check-out state transition
 */
export async function scanAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const { token, idempotency_key } = req.body;

  if (!token || typeof token !== 'string') {
    res.status(400).json({
      error: 'Bad Request',
      message: 'QR code token is required.'
    });
    return;
  }

  // Idempotency check: if already processed, return duplicate acknowledgment
  if (idempotency_key && typeof idempotency_key === 'string') {
    const existingEvent = await dbRepository.getAttendanceEventByIdempotency(idempotency_key);
    if (existingEvent) {
      res.json({
        success: true,
        status: 'duplicate_handled',
        message: 'Duplicate scan request recognized. No additional punch recorded.',
        event: existingEvent
      });
      return;
    }
  }

  // Cryptographically validate and consume token (enforces replay protection)
  const tokenValidation = await qrService.validateAndConsumeToken(token);
  if (!tokenValidation.valid) {
    res.status(400).json({
      error: 'Invalid QR Code',
      message: tokenValidation.reason || 'QR code validation failed.'
    });
    return;
  }

  const serverTimestamp = new Date();
  const workDate = getOfficeWorkDate(serverTimestamp);
  const formattedTime = formatOfficeTime(serverTimestamp);

  // Check for currently open session
  const openSession = await dbRepository.getOpenSessionByUser(user.id);

  if (openSession) {
    // Session state machine transition: Open -> Completed (Check-out)
    await dbRepository.updateSessionCheckOut(openSession.id, serverTimestamp);

    const event = await dbRepository.createAttendanceEvent({
      user_id: user.id,
      event_type: 'check_out',
      server_timestamp: serverTimestamp,
      qr_token_id: tokenValidation.tokenId || null,
      source: 'qr_scan',
      idempotency_key: idempotency_key || null
    });

    res.json({
      success: true,
      action: 'check_out',
      sessionId: openSession.id,
      eventId: event.id,
      workDate: openSession.work_date,
      serverTimestamp: serverTimestamp.toISOString(),
      formattedTime,
      status: 'completed',
      message: `Check-out recorded at ${formattedTime}`
    });
  } else {
    // Session state machine transition: No open session -> Open (Check-in)
    const newSession = await dbRepository.createSession({
      user_id: user.id,
      work_date: workDate,
      check_in_at: serverTimestamp,
      status: 'open'
    });

    const event = await dbRepository.createAttendanceEvent({
      user_id: user.id,
      event_type: 'check_in',
      server_timestamp: serverTimestamp,
      qr_token_id: tokenValidation.tokenId || null,
      source: 'qr_scan',
      idempotency_key: idempotency_key || null
    });

    res.json({
      success: true,
      action: 'check_in',
      sessionId: newSession.id,
      eventId: event.id,
      workDate: workDate,
      serverTimestamp: serverTimestamp.toISOString(),
      formattedTime,
      status: 'open',
      message: `Check-in recorded at ${formattedTime}`
    });
  }
}

/**
 * Returns personal attendance history for the authenticated employee
 */
export async function getMyAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const fromDate = typeof req.query.from === 'string' ? req.query.from : undefined;
  const toDate = typeof req.query.to === 'string' ? req.query.to : undefined;

  const todayWorkDate = getOfficeWorkDate(new Date());
  const todaySession = await dbRepository.getTodaySession(user.id, todayWorkDate);
  const history = await dbRepository.getSessionsByUser(user.id, fromDate, toDate);

  res.json({
    today: {
      workDate: todayWorkDate,
      hasSession: Boolean(todaySession),
      status: todaySession ? todaySession.status : 'not_started',
      checkInAt: todaySession?.check_in_at || null,
      checkOutAt: todaySession?.check_out_at || null
    },
    history,
    officeTimezone: config.attendance.timezone
  });
}
