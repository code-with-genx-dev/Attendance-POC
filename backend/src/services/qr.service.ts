import crypto from 'crypto';
import QRCode from 'qrcode';
import { config } from '../config';
import { dbRepository } from '../db';
import { QrTokenRecord } from '../db/mockStore';

export interface QrPayload {
  token: string;
  expiresAt: string;
  expiresInSeconds: number;
  qrImageDataUrl: string;
  refreshIntervalSeconds: number;
}

export class QrService {
  private currentToken: {
    rawId: string;
    issuedAt: number;
    expiresAt: number;
    signedString: string;
    tokenHash: string;
    qrImageDataUrl: string;
    dbRecordId?: number;
  } | null = null;

  /**
   * Computes HMAC-SHA256 signature for token validation
   */
  private generateSignature(data: string): string {
    return crypto.createHmac('sha256', config.qr.secret).update(data).digest('hex');
  }

  /**
   * Hashes a token string for safe database lookup and uniqueness
   */
  private hashToken(tokenString: string): string {
    return crypto.createHash('sha256').update(tokenString).digest('hex');
  }

  /**
   * Generates a new rotating QR token, persists it, and renders QR image
   */
  public async generateNewToken(): Promise<QrPayload> {
    const rawId = crypto.randomBytes(16).toString('hex');
    const now = Date.now();
    const issuedAt = now;
    const expiresAt = now + (config.qr.rotationIntervalSeconds * 1000);

    const payloadToSign = `${rawId}.${issuedAt}.${expiresAt}`;
    const signature = this.generateSignature(payloadToSign);
    const signedString = `${payloadToSign}.${signature}`;
    const tokenHash = this.hashToken(signedString);

    // Save token to database / mock store
    const record = await dbRepository.createQrToken(
      tokenHash,
      new Date(issuedAt),
      new Date(expiresAt + (config.qr.gracePeriodSeconds * 1000))
    );

    // Generate base64 Data URL using open-source qrcode package
    const qrImageDataUrl = await QRCode.toDataURL(signedString, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 6,
      color: {
        dark: '#172554', // BRD Deep Navy
        light: '#FFFFFF'
      }
    });

    this.currentToken = {
      rawId,
      issuedAt,
      expiresAt,
      signedString,
      tokenHash,
      qrImageDataUrl,
      dbRecordId: record.id
    };

    return {
      token: signedString,
      expiresAt: new Date(expiresAt).toISOString(),
      expiresInSeconds: Math.max(0, Math.round((expiresAt - Date.now()) / 1000)),
      qrImageDataUrl,
      refreshIntervalSeconds: config.qr.rotationIntervalSeconds
    };
  }

  /**
   * Returns current active QR token, or automatically generates a new one if expired
   */
  public async getCurrentQr(): Promise<QrPayload> {
    const now = Date.now();
    if (!this.currentToken || now >= this.currentToken.expiresAt) {
      return this.generateNewToken();
    }

    return {
      token: this.currentToken.signedString,
      expiresAt: new Date(this.currentToken.expiresAt).toISOString(),
      expiresInSeconds: Math.max(0, Math.round((this.currentToken.expiresAt - now) / 1000)),
      qrImageDataUrl: this.currentToken.qrImageDataUrl,
      refreshIntervalSeconds: config.qr.rotationIntervalSeconds
    };
  }

  /**
   * Validates and consumes an incoming QR token scanned by the mobile client.
   * Enforces HMAC signature, expiry with grace period, and single-use replay protection.
   */
  public async validateAndConsumeToken(tokenString: string): Promise<{
    valid: boolean;
    tokenId?: number;
    reason?: string;
  }> {
    if (!tokenString || typeof tokenString !== 'string') {
      return { valid: false, reason: 'Missing or malformed QR token payload.' };
    }

    const parts = tokenString.split('.');
    if (parts.length !== 4) {
      return { valid: false, reason: 'Invalid QR token format.' };
    }

    const [rawId, issuedAtStr, expiresAtStr, signature] = parts;
    const payloadToSign = `${rawId}.${issuedAtStr}.${expiresAtStr}`;
    const expectedSignature = this.generateSignature(payloadToSign);

    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false, reason: 'Invalid QR code signature or tampered code.' };
    }

    const expiresAt = parseInt(expiresAtStr, 10);
    const now = Date.now();
    const maxAllowedTime = expiresAt + (config.qr.gracePeriodSeconds * 1000);

    if (now > maxAllowedTime) {
      return { valid: false, reason: 'This QR code has expired. Please scan the newly displayed code.' };
    }

    const tokenHash = this.hashToken(tokenString);
    const tokenRecord = await dbRepository.getQrTokenByHash(tokenHash);

    if (!tokenRecord) {
      return { valid: false, reason: 'Unrecognized office QR token.' };
    }

    if (tokenRecord.status === 'used') {
      return {
        valid: false,
        reason: 'This QR code has already been scanned and consumed. Please scan the current code on the display.'
      };
    }

    if (tokenRecord.status === 'expired') {
      return { valid: false, reason: 'This QR code has expired.' };
    }

    // Mark token as consumed to prevent replay attacks
    await dbRepository.markQrTokenUsed(tokenRecord.id);

    return {
      valid: true,
      tokenId: tokenRecord.id
    };
  }
}

export const qrService = new QrService();

