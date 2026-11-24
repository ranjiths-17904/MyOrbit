import { randomUUID } from 'node:crypto';
import { COLLECTIONS } from './db.js';
import { buildRoutine } from './routine.js';
import { getProfile, saveProfile } from './profile.js';
import { create, list } from './records.js';

export async function applyRoutine(userId, input) {
  const plan = buildRoutine(input);
  const profile = await getProfile(userId);
  const today = /^\d{4}-\d{2}-\d{2}$/.test(input.today) ? input.today : new Date().toISOString().slice(0, 10);
  const saved = await saveProfile(userId, {
    ...profile,
    age: plan.age,
    weightKg: plan.weightKg,
    heightCm: plan.heightCm,
    interests: plan.interests,
    learningGoals: plan.learningGoals,
    careerTarget: plan.careerTarget,
    wakeTime: plan.wakeTime,
    sleepTime: plan.sleepTime,
    preferredStudyStart: plan.preferredStudyStart,
    studyHoursPerDay: plan.studyHoursPerDay,
    studyDays: Array.isArray(profile.studyDays) && profile.studyDays.length ? profile.studyDays : plan.studyDays,
    mobileLimitMinutes: plan.mobileLimitMinutes,
    onboarded: true,
    planStart: profile.planStart || today,
    fitness: {
      ...(profile.fitness || {}),
      exerciseMinutes: plan.exerciseMinutes,
      waterGlasses: plan.waterGlasses,
      sleepHours: plan.sleepHours,
      restDays: Array.isArray(profile.fitness?.restDays) && profile.fitness.restDays.length ? profile.fitness.restDays : plan.restDays
    },
    goals: mergeGoals(profile.goals, plan.goals),
    routine: summary(plan)
  });

  const skills = await addMissing(userId, COLLECTIONS.SKILLS, await list(userId, COLLECTIONS.SKILLS), plan.skills, (item) => item.name);
  const tasks = await addMissing(userId, COLLECTIONS.TASKS, await list(userId, COLLECTIONS.TASKS), plan.tasks.map((item) => ({
    ...item,
    startDate: today,
    dueDate: today
  })), (item) => item.title);
  const routines = await addMissing(userId, COLLECTIONS.HABITS, await list(userId, COLLECTIONS.HABITS), [{
    name: 'Daily routine',
    minutes: plan.exerciseMinutes,
    exercises: plan.habits.map((habit) => habit.title),
    source: 'routine'
  }], (item) => item.name);
  const blocks = await list(userId, COLLECTIONS.SCHEDULES);
  return { profile: saved, skills, tasks, routines, blocks, plan: { ...plan, skills, tasks } };
}

async function addMissing(userId, collection, existing, incoming, keyOf) {
  const keys = new Set(existing.map((item) => keyOf(item)));
  const next = [...existing];
  for (const item of incoming) {
    if (keys.has(keyOf(item))) continue;
    keys.add(keyOf(item));
    next.push(await create(userId, collection, item));
  }
  return next;
}

function mergeGoals(existing, incoming) {
  const goals = Array.isArray(existing) ? existing.map((item) => ({ ...item })) : [];
  for (const goal of incoming) {
    if (goals.some((item) => item.title === goal.title)) continue;
    goals.push({ id: randomUUID(), title: goal.title, status: 'active', targetDate: '' });
  }
  return goals;
}

function summary(plan) {
  return {
    waterGlasses: plan.waterGlasses,
    exerciseMinutes: plan.exerciseMinutes,
    sleepHours: plan.sleepHours,
    mobileLimitMinutes: plan.mobileLimitMinutes,
    stack: plan.stack,
    habits: plan.habits,
    disclaimer: plan.disclaimer,
    generatedAt: new Date().toISOString()
  };
}
