import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'src/data/ecotrack.db');

// Cached database connection pool/instance
let dbInstance: Database | null = null;

export async function getSqlDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  // Ensure directories exist
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Open database connection
  dbInstance = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await dbInstance.exec('PRAGMA foreign_keys = ON;');

  // Create users table with points column
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      points INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Dynamic migration: Ensure points column exists if table was pre-existing
  try {
    const tableInfo = await dbInstance.all("PRAGMA table_info(users);");
    const hasPoints = tableInfo.some(col => col.name === 'points');
    if (!hasPoints) {
      console.log("Migrating users table: Adding points column...");
      await dbInstance.exec("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0;");
    }
  } catch (err) {
    console.error("Failed to verify users table points column structure:", err);
  }

  // Create user_challenges table to store SQL completed challenges
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS user_challenges (
      user_id VARCHAR(255) NOT NULL,
      challenge_id VARCHAR(255) NOT NULL,
      PRIMARY KEY (user_id, challenge_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Securely check for existence of 'carbon_footprint_logs' table
  const logsTableCheck = await dbInstance.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='carbon_footprint_logs'"
  );

  if (!logsTableCheck) {
    console.log("carbon_footprint_logs table is absent. Executing DDL migration CREATE TABLE sequence...");
    await dbInstance.exec(`
      CREATE TABLE carbon_footprint_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(255) NOT NULL,
        electricity_kwh NUMERIC(10, 2) NOT NULL CHECK (electricity_kwh >= 0),
        travel_km NUMERIC(10, 2) NOT NULL CHECK (travel_km >= 0),
        diet_type VARCHAR(50) NOT NULL,
        total_co2_score NUMERIC(10, 2) NOT NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  // Establish native database indexes to optimize read lookups
  await dbInstance.exec(`
    CREATE INDEX IF NOT EXISTS idx_logs_user_id ON carbon_footprint_logs (user_id);
    CREATE INDEX IF NOT EXISTS idx_logs_recorded_at ON carbon_footprint_logs (recorded_at DESC);
  `);

  // Mock Seed Data Auto-Population Routine
  try {
    const logsCount = await dbInstance.get('SELECT COUNT(*) as count FROM carbon_footprint_logs');
    if (logsCount && logsCount.count === 0) {
      console.log("Database registry is empty. Initiating 6-month historical seeding routine...");
      
      const now = new Date();
      const baselineUsers = [
        { id: 'user_elena', name: 'Elena Rostova', points: 450, baseElectricity: 120, baseTravel: 300, diet: 'Vegan' },
        { id: 'user_marcus', name: 'Marcus Vance', points: 380, baseElectricity: 180, baseTravel: 500, diet: 'Vegetarian' },
        { id: 'user_sarah', name: 'Sarah Chen', points: 320, baseElectricity: 100, baseTravel: 200, diet: 'Vegan' },
        { id: 'user_david', name: 'David Kim', points: 240, baseElectricity: 250, baseTravel: 600, diet: 'Non-Vegetarian' },
        { id: 'user_amina', name: 'Amina Diop', points: 190, baseElectricity: 150, baseTravel: 400, diet: 'Vegetarian' },
        { id: 'user_liam', name: 'Liam O\'Connor', points: 150, baseElectricity: 200, baseTravel: 500, diet: 'Non-Vegetarian' }
      ];

      for (const u of baselineUsers) {
        // Ensure baseline user exists in database
        const userCheck = await dbInstance.get('SELECT id FROM users WHERE id = ?', [u.id]);
        if (!userCheck) {
          await dbInstance.run('INSERT INTO users (id, username, points) VALUES (?, ?, ?)', [u.id, u.name, u.points]);
        } else {
          await dbInstance.run('UPDATE users SET points = ? WHERE id = ?', [u.points, u.id]);
        }

        // Seed 6 distinct chronological months of data points with seasonal variations
        for (let i = 5; i >= 0; i--) {
          const recordedDate = new Date(now.getFullYear(), now.getMonth() - i, 15, 12, 0, 0);
          const dateStr = recordedDate.toISOString();

          // Seasonal variation factor based on the month of the year
          const monthIndex = recordedDate.getMonth();
          const elecMultiplier = 1.0 + 0.15 * Math.sin((monthIndex / 12) * 2 * Math.PI);
          const travelMultiplier = 1.0 + 0.10 * Math.cos((monthIndex / 12) * 2 * Math.PI);

          const electricity_kwh = Math.round(u.baseElectricity * elecMultiplier);
          const travel_km = Math.round(u.baseTravel * travelMultiplier);

          let dietScore = 250;
          if (u.diet === 'Vegan') dietScore = 100;
          else if (u.diet === 'Vegetarian') dietScore = 150;

          const monthlyCO2 = (electricity_kwh * 0.85) + (travel_km * 0.2) + dietScore;
          const annualCO2 = Math.round(monthlyCO2 * 12);

          await dbInstance.run(
            `INSERT INTO carbon_footprint_logs (user_id, electricity_kwh, travel_km, diet_type, total_co2_score, recorded_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [u.id, electricity_kwh, travel_km, u.diet, annualCO2, dateStr]
          );
        }
      }
      console.log("Database successfully seeded with 6 months of baseline records!");
    }
  } catch (err) {
    console.error("Seeding SQL database failed:", err);
  }

  console.log("SQL Relational Database Initialized at:", DB_PATH);
  return dbInstance;
}

// Close database connection
export async function closeSqlDb() {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}
