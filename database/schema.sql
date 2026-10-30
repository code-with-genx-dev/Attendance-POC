-- ==============================================================================
-- EMPLOYEE ATTENDANCE AUTOMATION - DATABASE SCHEMA (MySQL 8.0+ / MariaDB 10.4+)
-- BRD Revision 1.1 Specification
-- Single Shared Database for Express Backend, React Web, and React Native
-- ==============================================================================

-- Create database if not exists (Optional when importing into an existing database in phpMyAdmin)
-- CREATE DATABASE IF NOT EXISTS `attendance_poc_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE `attendance_poc_db`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `correction_requests`;
DROP TABLE IF EXISTS `attendance_events`;
DROP TABLE IF EXISTS `attendance_sessions`;
DROP TABLE IF EXISTS `qr_tokens`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------------
-- 1. USERS TABLE
-- Only approved BRD fields: id, company_email, full_name, employee_code, role, status, password_hash, created_at, updated_at
-- ------------------------------------------------------------------------------
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_email` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `employee_code` VARCHAR(64) DEFAULT NULL,
  `role` ENUM('Admin', 'Employee') NOT NULL DEFAULT 'Employee',
  `status` ENUM('active', 'inactive', 'pending_password_change') NOT NULL DEFAULT 'active',
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_users_email` (`company_email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. QR TOKENS TABLE
-- Token hash, expiry, and replay protection
-- ------------------------------------------------------------------------------
CREATE TABLE `qr_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `token_hash` VARCHAR(64) NOT NULL,
  `issued_at` DATETIME NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME DEFAULT NULL,
  `status` ENUM('active', 'used', 'expired') NOT NULL DEFAULT 'active',
  UNIQUE KEY `uk_qr_token_hash` (`token_hash`),
  KEY `idx_qr_expires` (`expires_at`),
  KEY `idx_qr_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. ATTENDANCE SESSIONS TABLE
-- Daily consolidated session view for Employee and Admin
-- ------------------------------------------------------------------------------
CREATE TABLE `attendance_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `work_date` DATE NOT NULL,
  `check_in_at` DATETIME DEFAULT NULL,
  `check_out_at` DATETIME DEFAULT NULL,
  `status` ENUM('open', 'completed', 'incomplete') NOT NULL DEFAULT 'open',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_sessions_user_date` (`user_id`, `work_date`),
  KEY `idx_sessions_work_date` (`work_date`),
  KEY `idx_sessions_status` (`status`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. ATTENDANCE EVENTS TABLE
-- Immutable punch events with server timestamp and replay/idempotency keys
-- ------------------------------------------------------------------------------
CREATE TABLE `attendance_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `event_type` ENUM('check_in', 'check_out') NOT NULL,
  `server_timestamp` DATETIME NOT NULL,
  `qr_token_id` INT DEFAULT NULL,
  `source` ENUM('qr_scan', 'admin_correction') NOT NULL DEFAULT 'qr_scan',
  `idempotency_key` VARCHAR(128) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_attendance_idempotency` (`idempotency_key`),
  KEY `idx_events_user_time` (`user_id`, `server_timestamp`),
  CONSTRAINT `fk_events_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_events_qr_token` FOREIGN KEY (`qr_token_id`) REFERENCES `qr_tokens` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. CORRECTION REQUESTS TABLE
-- Employee missed-punch requests with mandatory Admin review reason
-- ------------------------------------------------------------------------------
CREATE TABLE `correction_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `session_id` INT DEFAULT NULL,
  `punch_type` ENUM('check_in', 'check_out') NOT NULL,
  `requested_time` DATETIME NOT NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` INT DEFAULT NULL,
  `reviewed_at` DATETIME DEFAULT NULL,
  `decision_reason` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_corrections_user` (`user_id`),
  KEY `idx_corrections_status` (`status`),
  CONSTRAINT `fk_corrections_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_corrections_session` FOREIGN KEY (`session_id`) REFERENCES `attendance_sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_corrections_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. AUDIT LOGS TABLE
-- Immutable audit log for administrative decisions, account creations, and corrections
-- ------------------------------------------------------------------------------
CREATE TABLE `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `actor_user_id` INT DEFAULT NULL,
  `action` VARCHAR(128) NOT NULL,
  `entity_type` VARCHAR(64) NOT NULL,
  `entity_id` INT DEFAULT NULL,
  `reason` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_audit_actor` (`actor_user_id`),
  KEY `idx_audit_action` (`action`),
  CONSTRAINT `fk_audit_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

