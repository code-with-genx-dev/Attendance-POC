import path from 'path';
import dotenv from 'dotenv';

// Look for .env in current working dir, project root, and backend dir
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  connectionLimit: number;
  isConfigured: boolean;
  statusMessage: string;
}

export interface AppConfig {
  env: string;
  port: number;
  clientUrl: string;
  db: DatabaseConfig;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  qr: {
    secret: string;
    rotationIntervalSeconds: number;
    gracePeriodSeconds: number;
  };
  attendance: {
    timezone: string;
    workdayReviewCutoffHour: number;
    workdayEndHour: number;
  };
}

const rawDbUser = process.env.DB_USER || '';
const rawDbPass = process.env.DB_PASSWORD || '';
const rawDbName = process.env.DB_NAME || 'attendance_poc_db';
const rawDbHost = process.env.DB_HOST || 'localhost';
const rawDbPort = parseInt(process.env.DB_PORT || '3306', 10);

// Determine if user has configured MySQL or if placeholders are present
const isPlaceholderUser = !rawDbUser || rawDbUser === 'your_mysql_username';
const isPlaceholderPass = rawDbPass === 'your_mysql_password';
const isDbConfigured = !isPlaceholderUser && Boolean(rawDbUser);

const statusMessage = isDbConfigured
  ? `Configured to target MySQL database '${rawDbName}' at ${rawDbHost}:${rawDbPort}`
  : `MySQL credentials not yet configured. Operating in safe local/mock fallback mode until .env is updated.`;

export const config: AppConfig = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  db: {
    host: rawDbHost,
    port: rawDbPort,
    database: rawDbName,
    user: rawDbUser || 'placeholder_user',
    password: rawDbPass,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    isConfigured: isDbConfigured,
    statusMessage
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_key_attendance_poc_minimum_32_chars!',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  qr: {
    secret: process.env.QR_SECRET || 'dev_qr_hmac_secret_key_for_rotation_poc!',
    rotationIntervalSeconds: parseInt(process.env.QR_ROTATION_INTERVAL_SECONDS || '30', 10),
    gracePeriodSeconds: parseInt(process.env.QR_GRACE_PERIOD_SECONDS || '15', 10)
  },
  attendance: {
    timezone: process.env.OFFICE_TIMEZONE || 'Asia/Kolkata',
    workdayReviewCutoffHour: parseInt(process.env.WORKDAY_REVIEW_CUTOFF_HOUR || '14', 10),
    workdayEndHour: parseInt(process.env.WORKDAY_END_HOUR || '23', 10)
  }
};

