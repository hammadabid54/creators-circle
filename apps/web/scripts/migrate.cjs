// Explicit, versioned additive migrations for the local SQLite database.
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const target = process.argv[2];
if (!target) throw new Error('Pass the SQLite database path explicitly.');
const database = new DatabaseSync(path.resolve(target));
database.exec('PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS _CircleMigration (name TEXT PRIMARY KEY, appliedAt TEXT NOT NULL)');
for (const name of fs.readdirSync(path.join(__dirname, '../db/migrations')).filter(x => x.endsWith('.sql')).sort()) {
 if (database.prepare('SELECT name FROM _CircleMigration WHERE name=?').get(name)) continue;
 database.exec('BEGIN IMMEDIATE');
 try {
  database.exec(fs.readFileSync(path.join(__dirname, '../db/migrations', name), 'utf8'));
  database.prepare('INSERT INTO _CircleMigration VALUES (?,?)').run(name, new Date().toISOString());
  database.exec('COMMIT'); console.log('Applied ' + name);
 } catch (e) { database.exec('ROLLBACK'); throw e; }
}
database.close();
