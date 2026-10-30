# phpMyAdmin Database Setup & Management Guide

This guide walks you through setting up and managing the **MySQL** database for the **Employee Attendance Automation POC** using **phpMyAdmin**.

---

## Prerequisites
- A running MySQL server (e.g., via XAMPP, WAMP, Laragon, or standalone MySQL Server).
- Access to **phpMyAdmin** in your browser (typically `http://localhost/phpmyadmin` or `http://127.0.0.1/phpmyadmin`).

---

## Step 1: Create the Database in phpMyAdmin

1. Open **phpMyAdmin** in your web browser.
2. In the left navigation sidebar, click **New** (or click the **Databases** tab in the main area).
3. Under **Create database**:
   - **Database name**: `attendance_poc_db`
   - **Collation**: Select `utf8mb4_unicode_ci` (or `utf8mb4_general_ci`)
4. Click the **Create** button.

---

## Step 2: Import the Database Schema (`schema.sql`)

1. In phpMyAdmin's left sidebar, click on the newly created **`attendance_poc_db`** database to select it.
2. In the top navigation bar, click the **Import** tab.
3. Under **File to import**, click **Choose File** (or **Browse**).
4. Navigate to your project folder and select:
   ```
   d:/Attendance-POC/database/schema.sql
   ```
5. Leave all format options at their defaults (**SQL**, character set **utf-8**).
6. Scroll to the bottom and click **Import** (or **Go**).
7. You should see a green success banner:  
   `Import has been successfully finished, 6 queries executed.`

### Tables Created:
| Table Name | Description | Approved BRD Fields |
| :--- | :--- | :--- |
| `users` | Accounts & roles | `id`, `company_email`, `full_name`, `employee_code`, `role`, `status`, `password_hash`, `created_at`, `updated_at` |
| `attendance_sessions` | Daily consolidated records | `id`, `user_id`, `work_date`, `check_in_at`, `check_out_at`, `status`, `created_at`, `updated_at` |
| `attendance_events` | Immutable punch events | `id`, `user_id`, `event_type`, `server_timestamp`, `qr_token_id`, `source`, `idempotency_key`, `created_at` |
| `qr_tokens` | Dynamic rotating QR tokens | `id`, `token_hash`, `issued_at`, `expires_at`, `used_at`, `status` |
| `correction_requests` | Missed punch review queue | `id`, `user_id`, `session_id`, `punch_type`, `requested_time`, `reason`, `status`, `reviewed_by`, `reviewed_at`, `decision_reason`, `created_at`, `updated_at` |
| `audit_logs` | Immutable audit trail | `id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `reason`, `created_at` |

---

## Step 3: Import Initial Seed Data (`seed.sql`)

1. Ensure **`attendance_poc_db`** is still selected in phpMyAdmin.
2. Click the **Import** tab again.
3. Click **Choose File** and select:
   ```
   d:/Attendance-POC/database/seed.sql
   ```
4. Click **Import** (or **Go**).
5. Default accounts created:
   - **Admin User**: `admin@company.com` | Password: `Admin@12345` (Role: Admin)
   - **Sample Employee**: `employee@company.com` | Password: `Employee@12345` (Role: Employee)

---

## Step 4: Configure Backend Environment Variables

1. Copy `.env.example` in the project root to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your actual local MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=attendance_poc_db
   DB_USER=root            # Or your MySQL username
   DB_PASSWORD=your_password  # Or leave empty if root has no password locally
   ```
3. Save the file. (Note: `.env` is ignored by `.gitignore` and will never be committed).

---

## Step 5: Verify Connection via Health Endpoint

1. Start the backend:
   ```bash
   npm --prefix backend run dev
   ```
2. Open `http://localhost:5000/api/health` in your browser.
3. When MySQL is connected, the response will show:
   ```json
   "database": {
     "status": "connected",
     "mode": "MySQL (Live Connected)",
     "targetDatabase": "attendance_poc_db"
   }
   ```
4. If MySQL is unreachable or credentials are not yet entered, the backend will safely run in `mock_fallback` mode without crashing.

---

## Step 6: Alternative CLI Migration Runner

If you prefer running migrations from the command line instead of using the phpMyAdmin web interface:

1. Ensure your `.env` contains the valid MySQL connection details.
2. From the project root, run:
   ```bash
   npm --prefix backend run db:migrate
   ```
3. The migration runner will execute `database/schema.sql` and `database/seed.sql` in sequence, verifying all tables and initial records.

---

## Step 7: Inspecting & Auditing Data in phpMyAdmin

Once the system is active, you can use phpMyAdmin to inspect live database records across the 6 core tables:

1. **Review Daily Attendance Records (`attendance_sessions`)**:
   - Navigate to `attendance_poc_db` -> `attendance_sessions` -> click **Browse**.
   - Review columns: `work_date`, `check_in_at`, `check_out_at`, `status` (`open`, `completed`, `incomplete`).

2. **Audit Administrative Decisions (`audit_logs`)**:
   - Navigate to `audit_logs` -> click **Browse**.
   - Review `action` (e.g. `EMPLOYEE_CREATED`, `CORRECTION_APPROVED`, `QR_ROTATED_MANUALLY`), `reason`, and `actor_user_id`.

3. **Verify Punch Events & QR Tokens**:
   - `attendance_events`: Immutable server-timestamped record of every scan or approved correction.
   - `qr_tokens`: Logs token usage and single-use status (`active` vs `used`) to verify replay protection.

---

## Step 8: Operational Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `Access denied for user 'root'@'localhost'` | Incorrect MySQL password in `.env` | Update `DB_PASSWORD` in `.env` to match your local MySQL root password. |
| `Unknown database 'attendance_poc_db'` | Database was not created before import | Run Step 1 in phpMyAdmin to create the database first. |
| `Port 3306 connection refused` | MySQL service is not running | Start MySQL service via XAMPP Control Panel or Windows Services (`services.msc`). |
| Backend reports `Mock Fallback Store` | `.env` has placeholder credentials | Update `.env` with actual database credentials and restart the backend. |

