import { randomUUID } from 'node:crypto';
import { COLLECTIONS } from './db.js';
import { ApiError, maps, text } from './errors.js';
import { weekApproved } from './notify.js';
import { getProfile, saveProfile } from './profile.js';
import { clearProposal, create, deleteAll, list, readProposal, save, writeProposal } from './records.js';

export async function getProposal(userId) {
  const saved = await readProposal(userId);
  if (!saved || maps(saved.blocks).length === 0) return {};
  return saved;
}

export async function generate(userId, proposal) {
  const blocks = maps(proposal?.blocks);
  if (!blocks.length) throw new ApiError(400, 'A proposal needs at least one block.');
  assertNoOverlap(blocks);
  return writeProposal(userId, proposal);
}

export async function approve(userId, proposal) {
  const proposed = maps(proposal?.blocks);
  if (!proposed.length) throw new ApiError(400, 'Approve a proposal that still has blocks.');
  assertNoOverlap(proposed);
  const dates = new Set(proposed.map((block) => text(block.date)));
  const kept = [];
  for (const block of await list(userId, COLLECTIONS.SCHEDULES)) {
    if (!dates.has(text(block.date)) || block.status === 'completed') kept.push(block);
  }
  await deleteAll(userId, COLLECTIONS.SCHEDULES);
  for (const block of kept) await save(userId, COLLECTIONS.SCHEDULES, block);
  for (const block of proposed) await save(userId, COLLECTIONS.SCHEDULES, block);

  const taskIds = new Set((await list(userId, COLLECTIONS.TASKS)).map((task) => text(task.id)));
  for (const task of maps(proposal.createdTasks)) {
    const id = text(task.id);
    if (id && !taskIds.has(id)) {
      taskIds.add(id);
      await create(userId, COLLECTIONS.TASKS, task);
    }
  }

  const profile = await getProfile(userId);
  const reports = maps(profile.reports);
  const report = {
    ...(proposal.review && typeof proposal.review === 'object' ? proposal.review : {}),
    id: randomUUID(),
    savedAt: new Date().toISOString(),
    rationale: proposal.rationale
  };
  reports.push(report);
  const next = { ...profile, reports };
  if (proposal.review && typeof proposal.review === 'object') next.lastReview = proposal.review;
  const savedProfile = await saveProfile(userId, next);
  await clearProposal(userId);
  await weekApproved(userId);

  return {
    blocks: await list(userId, COLLECTIONS.SCHEDULES),
    tasks: await list(userId, COLLECTIONS.TASKS),
    reports: savedProfile.reports,
    lastReview: savedProfile.lastReview ?? null
  };
}

export async function assertBlockFits(userId, block) {
  const start = minutes(block.start);
  const end = minutes(block.end);
  if (end <= start) throw new ApiError(400, 'End time must be after the start time.');
  const date = text(block.date);
  if (!date) throw new ApiError(400, 'A date is required.');
  const id = text(block.id);
  for (const other of await list(userId, COLLECTIONS.SCHEDULES)) {
    if (id && id === text(other.id)) continue;
    if (date !== text(other.date)) continue;
    const otherStart = minutes(other.start);
    const otherEnd = minutes(other.end);
    if (start < otherEnd && otherStart < end) throw new ApiError(400, 'That time overlaps another block.');
  }
}

function assertNoOverlap(blocks) {
  for (let i = 0; i < blocks.length; i += 1) {
    const start = minutes(blocks[i].start);
    const end = minutes(blocks[i].end);
    if (end <= start) throw new ApiError(400, 'End time must be after the start time.');
    for (let j = i + 1; j < blocks.length; j += 1) {
      if (text(blocks[i].date) !== text(blocks[j].date)) continue;
      const otherStart = minutes(blocks[j].start);
      const otherEnd = minutes(blocks[j].end);
      if (start < otherEnd && otherStart < end) {
        throw new ApiError(400, 'That proposal overlaps itself. Adjust the times before saving.');
      }
    }
  }
}

function minutes(value) {
  const parts = text(value).split(':');
  if (parts.length < 2) throw new ApiError(400, 'Use a time like 07:30.');
  const hours = Number(parts[0]);
  const mins = Number(parts[1]);
  if (!Number.isInteger(hours) || !Number.isInteger(mins)) throw new ApiError(400, 'Use a time like 07:30.');
  return hours * 60 + mins;
}
