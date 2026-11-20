import { randomUUID } from 'node:crypto';
import { COLLECTIONS } from './db.js';
import { ApiError, maps, text } from './errors.js';
import { requireUser } from './auth.js';
import {
  clearProposal,
  deleteAll,
  readProfile,
  replaceOwned,
  syncResources,
  upsertByDate,
  writeProfile,
  writeProposal
} from './records.js';

export async function getProfile(userId) {
  const user = await requireUser(userId);
  const profile = await readProfile(userId);
  if (!profile) throw new ApiError(404, 'Profile was not found.');
  profile.email = user.email;
  if (!text(profile.name)) profile.name = user.name;
  return profile;
}

export async function saveProfile(userId, incoming = {}) {
  const user = await requireUser(userId);
  const current = (await readProfile(userId)) || {};
  const next = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (key === 'email' || key === 'id' || key === 'userId') continue;
    next[key] = value;
  }
  next.email = user.email;
  const reports = unionById(maps(current.reports), maps(incoming.reports));
  for (const report of reports) {
    if (!text(report.id)) report.id = randomUUID();
  }
  next.reports = reports;
  next.lastReview = preferReview(current.lastReview, incoming.lastReview);
  if (!text(next.name)) next.name = user.name;
  const saved = await writeProfile(userId, next);
  await replaceOwned(userId, COLLECTIONS.GOALS, saved.goals);
  await replaceOwned(userId, COLLECTIONS.REPORTS, saved.reports);
  saved.email = user.email;
  return saved;
}

export async function importVault(userId, body) {
  await replaceOwned(userId, COLLECTIONS.SKILLS, body.skills);
  await replaceOwned(userId, COLLECTIONS.TASKS, body.tasks);
  await replaceOwned(userId, COLLECTIONS.NOTES, body.notes);
  await replaceOwned(userId, COLLECTIONS.SCHEDULES, body.blocks);
  await importDated(userId, COLLECTIONS.FITNESS, body.fitness);
  await replaceOwned(userId, COLLECTIONS.HABITS, body.routines);
  await importDated(userId, COLLECTIONS.MOBILE, body.mobile);
  for (const skill of maps(body.skills)) {
    await syncResources(userId, text(skill.id), text(skill.name), skill.resources);
  }
  await replaceOwned(userId, COLLECTIONS.NOTIFICATIONS, body.notifications);
  if (body.proposal && typeof body.proposal === 'object' && maps(body.proposal.blocks).length) {
    await writeProposal(userId, { ...body.proposal });
  } else {
    await clearProposal(userId);
  }
  const existing = await readProfile(userId);
  if (existing) {
    existing.reports = [];
    existing.lastReview = null;
    await writeProfile(userId, existing);
  }
  const profile = body.profile && typeof body.profile === 'object' ? { ...body.profile } : {};
  profile.reports = Array.isArray(body.reports) ? body.reports : profile.reports || [];
  if (body.lastReview != null) profile.lastReview = body.lastReview;
  if (profile.goals == null && Array.isArray(body.goals)) profile.goals = body.goals;
  await saveProfile(userId, profile);
}

async function importDated(userId, collection, raw) {
  await deleteAll(userId, collection);
  for (const item of maps(raw)) await upsertByDate(userId, collection, item);
}

function preferReview(server, client) {
  if (!client || typeof client !== 'object') return server ?? null;
  if (!server || typeof server !== 'object') return client;
  const serverKey = text(server.weekStart);
  const clientKey = text(client.weekStart);
  return clientKey >= serverKey ? client : server;
}

function unionById(server, client) {
  const merged = new Map();
  for (const item of server) merged.set(idOf(item), item);
  for (const item of client) merged.set(idOf(item), item);
  return [...merged.values()];
}

function idOf(item) {
  const id = text(item.id);
  if (id) return id;
  const created = text(item.savedAt);
  return created || JSON.stringify(item);
}
