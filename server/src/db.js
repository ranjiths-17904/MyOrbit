import { MongoClient } from 'mongodb';
import { config } from './config.js';

export const COLLECTIONS = {
  USERS: 'users',
  PROFILES: 'userProfiles',
  SKILLS: 'skills',
  GOALS: 'goals',
  TASKS: 'tasks',
  SCHEDULES: 'schedules',
  NOTES: 'notes',
  FITNESS: 'fitnessRecords',
  HABITS: 'habits',
  MOBILE: 'mobileUsage',
  NOTIFICATIONS: 'notifications',
  PROPOSALS: 'proposals',
  REPORTS: 'weeklyReports',
  RESOURCES: 'learningResources'
};

let client;
let database;

export async function connect() {
  client = new MongoClient(config.mongoUri);
  await client.connect();
  database = client.db();
  await ensureIndexes();
  return database;
}

export function getDb() {
  if (!database) throw new Error('Database is not connected.');
  return database;
}

async function ensureIndexes() {
  const db = getDb();
  await db.collection(COLLECTIONS.USERS).createIndex({ email: 1 }, { unique: true });
  const owned = [
    COLLECTIONS.PROFILES,
    COLLECTIONS.SKILLS,
    COLLECTIONS.GOALS,
    COLLECTIONS.TASKS,
    COLLECTIONS.SCHEDULES,
    COLLECTIONS.NOTES,
    COLLECTIONS.FITNESS,
    COLLECTIONS.HABITS,
    COLLECTIONS.MOBILE,
    COLLECTIONS.NOTIFICATIONS,
    COLLECTIONS.PROPOSALS,
    COLLECTIONS.REPORTS,
    COLLECTIONS.RESOURCES
  ];
  for (const name of owned) {
    await db.collection(name).createIndex({ userId: 1 });
  }
  await db.collection(COLLECTIONS.SCHEDULES).createIndex({ userId: 1, date: 1 });
  await db.collection(COLLECTIONS.FITNESS).createIndex({ userId: 1, date: 1 }, { unique: true });
  await db.collection(COLLECTIONS.MOBILE).createIndex({ userId: 1, date: 1 }, { unique: true });
  await db.collection(COLLECTIONS.NOTES).createIndex({ userId: 1, updatedAt: -1 });
  await db.collection(COLLECTIONS.TASKS).createIndex({ userId: 1, dueDate: 1 });
}
