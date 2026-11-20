import { randomUUID } from 'node:crypto';
import { COLLECTIONS, getDb } from './db.js';
import { ApiError, text } from './errors.js';

export function toClient(doc) {
  if (!doc) return null;
  const copy = { ...doc };
  const id = copy.id || (copy._id != null ? String(copy._id) : '');
  delete copy._id;
  delete copy.userId;
  delete copy.passwordHash;
  if (id) copy.id = String(id);
  return copy;
}

export async function list(userId, collection) {
  const docs = await getDb().collection(collection).find({ userId }).toArray();
  return docs.map(toClient);
}

export async function create(userId, collection, body) {
  const id = text(body?.id) || randomUUID();
  const existing = await getDb().collection(collection).findOne({ _id: id, userId });
  if (existing) throw new ApiError(409, 'That record already exists.');
  return write(userId, collection, id, body);
}

export async function replace(userId, collection, id, body) {
  const existing = await getDb().collection(collection).findOne({ _id: id, userId });
  if (!existing) throw new ApiError(404, 'That record was not found.');
  return write(userId, collection, id, { ...body, id });
}

export async function save(userId, collection, body) {
  const id = text(body?.id) || randomUUID();
  return write(userId, collection, id, body);
}

export async function remove(userId, collection, id) {
  await getDb().collection(collection).deleteOne({ _id: id, userId });
}

export async function deleteAll(userId, collection) {
  await getDb().collection(collection).deleteMany({ userId });
}

export async function upsertByDate(userId, collection, body) {
  const date = text(body?.date);
  if (!date) throw new ApiError(400, 'A date is required.');
  const existing = await getDb().collection(collection).findOne({ userId, date });
  const id = existing ? String(existing._id) : text(body.id) || randomUUID();
  return write(userId, collection, id, { ...body, date });
}

export async function readProfile(userId) {
  const doc = await getDb().collection(COLLECTIONS.PROFILES).findOne({ _id: userId });
  return toClient(doc);
}

export async function writeProfile(userId, body) {
  return write(userId, COLLECTIONS.PROFILES, userId, body);
}

export async function readProposal(userId) {
  const doc = await getDb().collection(COLLECTIONS.PROPOSALS).findOne({ _id: userId });
  return toClient(doc);
}

export async function writeProposal(userId, body) {
  return write(userId, COLLECTIONS.PROPOSALS, userId, { ...body, savedAt: new Date().toISOString() });
}

export async function clearProposal(userId) {
  await getDb().collection(COLLECTIONS.PROPOSALS).deleteOne({ _id: userId });
}

export async function syncResources(userId, skillId, skillName, raw) {
  if (!skillId) return;
  await getDb().collection(COLLECTIONS.RESOURCES).deleteMany({ userId, skillId });
  const items = Array.isArray(raw) ? raw : [];
  let index = 0;
  for (const item of items) {
    const doc = { skillId, skillName };
    if (item && typeof item === 'object' && !Array.isArray(item)) Object.assign(doc, item);
    else if (item != null && String(item).trim()) doc.title = String(item);
    else continue;
    doc.skillId = skillId;
    let id = text(doc.id);
    if (!id || id === skillId) id = `${skillId}-${index}`;
    doc.id = id;
    await write(userId, COLLECTIONS.RESOURCES, id, doc);
    index += 1;
  }
}

export async function deleteResources(userId, skillId) {
  await getDb().collection(COLLECTIONS.RESOURCES).deleteMany({ userId, skillId });
}

export async function replaceOwned(userId, collection, raw) {
  await deleteAll(userId, collection);
  if (!Array.isArray(raw)) return;
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const id = text(item.id) || randomUUID();
    await write(userId, collection, id, item);
  }
}

async function write(userId, collection, id, body) {
  const doc = {};
  for (const [key, value] of Object.entries(body || {})) {
    if (key === 'id' || key === '_id' || key === 'userId' || key === 'passwordHash') continue;
    doc[key] = value;
  }
  doc._id = id;
  doc.id = id;
  doc.userId = userId;
  if (!doc.updatedAt) doc.updatedAt = new Date().toISOString();
  await getDb().collection(collection).replaceOne({ _id: id }, doc, { upsert: true });
  return toClient(doc);
}
