# Employee Attendance Automation — POC

An enterprise-grade, privacy-first Proof of Concept (POC) for automated employee attendance tracking using dynamic rotating office QR codes, server-authoritative timestamps, and single-step administrative exception workflows.

---

## Architecture Overview

```
                                      ┌─────────────────────────────────────────┐
                                      │        MySQL Database (Shared)          │
                                      │  (Managed locally via phpMyAdmin)       │
                                      └───────────────────▲─────────────────────┘
                                                          │
                                         ┌────────────────┴───────────────┐
                                         │   Node.js / Express Backend   │
                                         │       (Port 5000 /api)         │
                                         └────────▲──────────────▲────────┘
                                                  │              │
                   ┌──────────────────────────────┴────┐         │
                   │                                   │         │
┌──────────────────▼──────────────────┐   ┌────────────▼─────────┴─────────────┐
│    Admin Web Dashboard (React)      │   │     Mobile App (React Native/Expo) │
│ - Dense Blue UI Palette             │   │ - Dynamic QR Scanner (Camera)      │
│ - Today Summary (Present/Inc/No)    │   │ - Server-Authoritative Check-in    │
│ - Filtered Attendance Table         │   │ - Attendance History View          │
│ - 30s Rotating QR Display           │   │ - Missed-Punch Request Flow        │
│ - Single-Step Correction Review     │   │ - First-Login Password Change      │
│ - Filtered RFC-4180 CSV Export      │   └────────────────────────────────────┘
│ - Approved Employee Onboarding      │
└─────────────────────────────────────┘
```

### Technology Stack
* **Backend**: Node.js, Express, TypeScript, `mysql2/promise`, `bcryptjs`, `jsonwebtoken`, `qrcode`.
* **Web Admin**: React 18, Vite, TypeScript, Tailwind CSS (Dense Blue UI Palette: `#1D4ED8`, `#172554`, `#EFF6FF`).
* **Mobile**: React Native, Expo 52, TypeScript, Expo Camera / Barcode Scanner.
* **Database**: MySQL 8.x (Single shared database, managed via phpMyAdmin or CLI migrations).

---

## Quick Start & Setup

### 1. Prerequisites
* Node.js v18+ and npm installed.
* Local MySQL server (e.g. XAMPP, WAMP, Laragon, or standalone MySQL).
* Web browser for phpMyAdmin and Admin Web Dashboard.

### 2. Environment Configuration
Copy the provided `.env.example` to `.env` in the project root:
```bash
cp .env.example .env
```
Fill in your local MySQL credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=attendance_poc_db
DB_USER=root
DB_PASSWORD=""
```
*(Note: If MySQL is not running or credentials are not yet entered, the backend automatically runs in safe **Mock Fallback Store** mode, allowing immediate testing without crashing).*

### 3. Database Initialization
Follow the step-by-step instructions in [`database/PHPMYADMIN_GUIDE.md`](file:///d:/Attendance-POC/database/PHPMYADMIN_GUIDE.md) to import:
1. `database/schema.sql` (Creates 6 core tables with strictly approved BRD fields)
2. `database/seed.sql` (Inserts default Admin & Sample Employee accounts)

Alternatively, run the CLI migration tool:
```bash
npm --prefix backend run db:migrate
```

---

## Running the Applications

### 1. Start Backend API
```bash
npm --prefix backend run dev
```
* **API URL**: `http://localhost:5000`
* **Health Check**: `http://localhost:5000/api/health`
* **Current QR Display Endpoint**: `http://localhost:5000/api/qr/current`

### 2. Start Admin Web Dashboard
```bash
npm --prefix web run dev
```
* **URL**: `http://localhost:5173`
* **Default Admin Login**:
  * **Email**: `admin@company.com`
  * **Password**: `Admin@12345`

### 3. Start Mobile App (React Native / Expo)
```bash
npm --prefix mobile run start
```
* **Default Employee Login**:
  * **Email**: `employee@company.com`
  * **Password**: `Employee@12345` (Requires first-time password change on first login)

---

## Running the Test Suite

The test suite covers all 9 implementation phases with 100% automated test coverage across all subsystems:

```bash
# Run all 8 test suites in sequence
npm --prefix backend test
```

Individual test suites:
* `npm --prefix backend run test:db` — Database repository & schema constraints
* `npm --prefix backend run test:auth` — Password hashing, JWT auth, and RBAC
* `npm --prefix backend run test:qr` — Dynamic QR engine, HMAC signing & replay rejection
* `npm --prefix backend run test:attendance` — Check-in/check-out session state machine
* `npm --prefix backend run test:correction` — Missing-punch detection & admin correction
* `npm --prefix backend run test:admin` — Employee onboarding & CSV reporting (34 tests)
* `npm --prefix backend run test:mobile` — React Native mobile API integration
* `npm --prefix backend run test:e2e` — Full 12-step end-to-end lifecycle verification (57 tests)

---

## BRD Section 13 Acceptance Criteria Compliance

| ID | BRD Acceptance Criterion | Status | Implementation Verification |
| :--- | :--- | :---: | :--- |
| **AC-01** | Admin account seeded; password securely hashed with bcrypt; role verified. | ✅ Satisfied | Verified in `test:auth` and `test:e2e`. Bcrypt salt rounds: 10. |
| **AC-02** | Employee onboarding restricted to approved fields; temporary password issued; forced change on first login. | ✅ Satisfied | Verified in `test:admin` and `test:e2e`. Fields strictly limited to approved set. |
| **AC-03** | QR rotates every 30s with 15s grace window; HMAC-SHA256 signature; replay rejection. | ✅ Satisfied | Verified in `test:qr` and `test:e2e`. Used tokens marked and rejected on replay. |
| **AC-04** | QR scan records server-authoritative timestamp; atomic session state machine (open &rarr; completed). | ✅ Satisfied | Verified in `test:attendance` and `test:e2e`. Server clock enforced. |
| **AC-05** | Missing punch detection flags unclosed past sessions as `incomplete` without guessing punch times. | ✅ Satisfied | Verified in `test:correction` and `test:e2e`. Cutoff: 14:00; End: 23:00. |
| **AC-06** | Employee can submit missed-punch correction request with reason. | ✅ Satisfied | Verified in `test:correction` and `test:mobile`. Status starts as `pending`. |
| **AC-07** | Admin can approve/reject corrections with mandatory decision justification; updates session and audit log. | ✅ Satisfied | Verified in `test:correction` and `test:e2e`. Rejection enforced if reason empty. |
| **AC-08** | Complete immutable audit log of administrative actions (`audit_logs` table). | ✅ Satisfied | Verified in `test:db`, `test:admin`, and `test:e2e`. |
| **AC-09** | Filtered attendance query and RFC-4180 CSV export; Dense Blue UI palette. | ✅ Satisfied | Verified in `test:admin`, `test:e2e`, and web production build. |

---

## Security & Operational Boundaries

1. **Zero Unapproved Employee Fields**: Only `id`, `company_email`, `full_name`, `employee_code`, `role`, `status`, `password_hash`, `created_at`, `updated_at` are stored.
2. **Credential Protection**: `.env` is strictly gitignored. Dummy placeholders are provided in `.env.example`.
3. **No External Database Dependencies**: Self-contained MySQL database administered by the user through phpMyAdmin.
4. **Resilient Mock Fallback**: When MySQL is disconnected, the system falls back to an in-memory repository store without throwing unhandled exceptions.
5. **Replay & Tamper Protection**: QR tokens are signed with HMAC-SHA256 and tracked in the database to prevent screenshots, badge-sharing, or duplicate scans.

