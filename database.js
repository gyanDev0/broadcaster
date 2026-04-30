const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await dbInstance.exec('PRAGMA foreign_keys = ON;');

  // Create Institutions Table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS Institutions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institution_name TEXT NOT NULL,
      institution_code TEXT NOT NULL UNIQUE
    );
  `);

  // Create Users Table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      broadcast_uuid TEXT NOT NULL UNIQUE,
      institution_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (institution_id) REFERENCES Institutions(id)
    );
  `);

  // Pre-populate a test institution if none exists
  const count = await dbInstance.get('SELECT COUNT(*) as count FROM Institutions');
  if (count.count === 0) {
    await dbInstance.run(
      'INSERT INTO Institutions (institution_name, institution_code) VALUES (?, ?)',
      ['Test University', 'TEST1234']
    );
    console.log('✅ Seeded database with Test University (Code: TEST1234)');
  }

  return dbInstance;
}

module.exports = { getDb };
