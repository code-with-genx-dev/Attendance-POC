-- ==============================================================================
-- EMPLOYEE ATTENDANCE AUTOMATION - INITIAL SEED DATA
-- BRD Revision 1.1 Specification
-- Default Initial Credentials (For testing / initial setup):
--   Admin:    admin@company.com    / Admin@12345
--   Employee: employee@company.com / Employee@12345
-- ==============================================================================

-- 1. Insert Initial Admin Account
INSERT INTO `users` (`id`, `company_email`, `full_name`, `employee_code`, `role`, `status`, `password_hash`, `created_at`)
VALUES
  (1, 'admin@company.com', 'System Administrator', 'ADM001', 'Admin', 'active', '$2a$10$u3JuFEBOGMbvd5B5mDrw5.tyiXHcoGkKdp/SlWblOjoMCcy2Wn0NG', NOW()),
  (2, 'employee@company.com', 'Sample Employee', 'EMP001', 'Employee', 'active', '$2a$10$vCyYX1dqMjk6EaNwsX7NRe2qry1QQRXNKv7/KH19nGK40cqPNYvVW', NOW())
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- 2. Audit Trail for System Initialization
INSERT INTO `audit_logs` (`actor_user_id`, `action`, `entity_type`, `entity_id`, `reason`, `created_at`)
VALUES
  (1, 'SYSTEM_INIT', 'users', 1, 'Initial database schema and default admin seed created', NOW());
