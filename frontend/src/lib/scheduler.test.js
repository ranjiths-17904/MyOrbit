import assert from 'node:assert/strict';
import { findOverlap, generateWeekPlan, skillWeight } from './scheduler.js';

const profile = {
  wakeTime: '06:00',
  sleepTime: '23:00',
  studyHoursPerDay: 4,
  studyDays: [1, 2, 3, 4, 5, 6],
  familyBlocks: [{ days: [1, 2, 3, 4, 5], start: '13:00', end: '14:00', title: 'Family time' }],
  fitness: { exerciseMinutes: 30, restDays: [0], waterGlasses: 8, sleepHours: 7 }
};

const skills = [
  { id: 'java', name: 'Java', priority: 'high', currentLevel: 'basic', targetLevel: 'advanced', dailyMinutes: 60 },
  { id: 'sql', name: 'SQL', priority: 'high', currentLevel: 'beginner', targetLevel: 'intermediate', dailyMinutes: 45 },
  { id: 'eng', name: 'English Speaking', priority: 'medium', currentLevel: 'intermediate', targetLevel: 'advanced', dailyMinutes: 30 }
];

const tasks = [
  { id: 't1', title: 'Finish SQL joins worksheet', status: 'pending', dueDate: '2026-11-10', priority: 'high', estimateMin: 40 }
];

assert.ok(skillWeight(skills[1]) > skillWeight(skills[2]));

const plan = generateWeekPlan({
  profile,
  skills,
  tasks,
  weekStart: '2026-11-16',
  modifiers: { sql: 1.3 }
});

assert.equal(plan.weekStart, '2026-11-16');
assert.equal(findOverlap(plan.blocks), null);
assert.ok(plan.blocks.some((block) => block.title.includes('SQL')));
assert.ok(plan.blocks.some((block) => block.type === 'fitness'));
assert.ok(plan.blocks.some((block) => block.taskId === 't1'));
assert.ok(plan.rationale.length > 0);

const hardRuns = new Map();
plan.blocks.forEach((block) => {
  const list = hardRuns.get(block.date) || [];
  list.push(block);
  hardRuns.set(block.date, list);
});
for (const list of hardRuns.values()) {
  let run = 0;
  list
    .filter((block) => block.type !== 'personal' && block.type !== 'break')
    .forEach((block) => {
      run = block.difficulty === 'hard' ? run + 1 : 0;
      assert.ok(run < 3, 'three hard blocks were stacked');
    });
}

console.log(`scheduler ok: ${plan.blocks.length} blocks, ${plan.createdTasks.length} tasks, ${plan.warnings.length} warnings`);
