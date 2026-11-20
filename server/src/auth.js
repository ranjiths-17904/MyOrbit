import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { COLLECTIONS, getDb } from './db.js';
import { ApiError, text } from './errors.js';
import { writeProfile } from './records.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function signToken(user) {
  return jwt.sign({ email: user.email }, config.jwtSecret, { subject: user.id, expiresIn: '14d' });
}

export function readToken(header) {
  const token = String(header || '').startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new ApiError(401, 'Sign in again.');
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (!payload.sub) throw new Error('missing subject');
    return payload.sub;
  } catch {
    throw new ApiError(401, 'Sign in again.');
  }
}

export async function requireUser(userId) {
  const user = await getDb().collection(COLLECTIONS.USERS).findOne({ _id: userId });
  if (!user) throw new ApiError(401, 'Sign in again.');
  return user;
}

export async function register({ name, email, password, careerTarget }) {
  const cleanName = text(name);
  const normalized = text(email).toLowerCase();
  const secret = text(password);
  if (!cleanName || cleanName.length > 80) throw new ApiError(400, 'Enter a name up to 80 characters.');
  if (!EMAIL.test(normalized) || normalized.length > 160) throw new ApiError(400, 'Enter a valid email.');
  if (secret.length < 8 || secret.length > 100) throw new ApiError(400, 'Use a password of 8 to 100 characters.');
  const existing = await getDb().collection(COLLECTIONS.USERS).findOne({ email: normalized });
  if (existing) throw new ApiError(409, 'An account with that email already exists.');
  const id = randomUUID();
  const user = {
    _id: id,
    id,
    name: cleanName,
    email: normalized,
    passwordHash: await bcrypt.hash(secret, 10),
    createdAt: new Date().toISOString()
  };
  await getDb().collection(COLLECTIONS.USERS).insertOne(user);
  await writeProfile(user.id, defaultProfile(user, careerTarget));
  return tokenResponse(user);
}

export async function login({ email, password }) {
  const normalized = text(email).toLowerCase();
  const user = await getDb().collection(COLLECTIONS.USERS).findOne({ email: normalized });
  const matches = user && (await bcrypt.compare(text(password), user.passwordHash));
  if (!matches) throw new ApiError(401, 'Email or password does not match.');
  return tokenResponse(user);
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await requireUser(userId);
  const matches = await bcrypt.compare(text(currentPassword), user.passwordHash);
  if (!matches) throw new ApiError(400, 'Current password does not match.');
  const next = text(newPassword);
  if (next.length < 8 || next.length > 100) throw new ApiError(400, 'Use at least 8 characters.');
  const passwordHash = await bcrypt.hash(next, 10);
  await getDb().collection(COLLECTIONS.USERS).updateOne({ _id: userId }, { $set: { passwordHash } });
}

function tokenResponse(user) {
  return {
    token: signToken({ id: user.id || user._id, email: user.email }),
    user: { id: user.id || String(user._id), email: user.email, name: user.name }
  };
}

function defaultProfile(user, careerTarget) {
  return {
    name: user.name,
    email: user.email,
    careerTarget: text(careerTarget).slice(0, 120),
    wakeTime: '06:00',
    sleepTime: '23:00',
    studyHoursPerDay: 4,
    studyDays: [1, 2, 3, 4, 5, 6],
    preferredStudyStart: '07:30',
    planStart: new Date().toISOString().slice(0, 10),
    onboarded: false,
    familyBlocks: [],
    fitness: { exerciseMinutes: 30, waterGlasses: 8, sleepHours: 7, restDays: [0] },
    mobileLimitMinutes: 120,
    notifications: { web: false, email: false, sms: false },
    goals: [],
    reports: [],
    phone: ''
  };
}
