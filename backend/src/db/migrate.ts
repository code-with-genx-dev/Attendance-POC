import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { config } from '../config';

async function runMigration() {
  console.log('--- Attendance POC Database Migration Runner ---');

  if (!config.db.isConfigured) {
    console.error('❌ Error: MySQL credentials are not configured in .env.');
    console.error('Please configure DB_USER and DB_PASSWORD or import database/schema.sql directly via phpMyAdmin.');
    process.exit(1);
  }

  const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Error: Schema file not found at ${schemaPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log(`Connecting to MySQL host: ${config.db.host}:${config.db.port}...`);
  try {
    const connection = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      multipleStatements: true
    });

    console.log(`Connected to database '${config.db.database}'. Executing schema.sql...`);
    await connection.query(sql);
    console.log('✅ Schema executed successfully!');
    await connection.end();
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration();
}

export { runMigration };
