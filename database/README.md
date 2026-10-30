# Database Directory (MySQL + phpMyAdmin)

This directory will hold all MySQL database migration and seed scripts for the Employee Attendance Automation POC.

## Target Architecture
- **Engine**: MySQL 8.0+ / MariaDB 10.4+
- **Management Tool**: phpMyAdmin
- **Default Database Name**: `attendance_poc_db`
- **Collation**: `utf8mb4_unicode_ci`

## Planned Files (Phase 2):
1. `schema.sql`: Contains pure, clean DDL statements (tables, primary keys, foreign keys, indexes) adhering strictly to approved BRD v1.1 fields.
2. `seed.sql`: Contains initial Admin account seed and test reference data.

## phpMyAdmin Import Process:
1. Open phpMyAdmin at your local URL (e.g., `http://localhost/phpmyadmin`).
2. Create a new database named `attendance_poc_db` with collation `utf8mb4_unicode_ci`.
3. Select `attendance_poc_db` and click the **Import** tab.
4. Upload `schema.sql` and click **Import** (or **Go**).

