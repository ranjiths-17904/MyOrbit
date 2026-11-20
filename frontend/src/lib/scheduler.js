import { addDays, fmtMin, parseMin, startOfWeek, uid, weekDates } from './dates.js';

export const LEVELS = ['beginner', 'basic', 'intermediate', 'advanced', 'expert'];

export const STUDY_TYPES = ['theory', 'coding', 'practice', 'project', 'revision'];

const PRIORITY_WEIGHT = { low: 1, medium: 2, high: 3, critical: 4 };

export function levelIndex(level) {
  const i = LEVELS.indexOf(String(level || '').toLowerCase());
  return i < 0 ? 0 : i;
}

export function skillWeight(skill, modifier = 1) {
  const gap = Math.max(0, levelIndex(skill.targetLevel) - levelIndex(skill.currentLevel));
  const priority = PRIORITY_WEIGHT[skill.priority] || 2;
  const base = (gap + 1) * priority;
  return base * (modifier || 1);
}

export function isHardSkill(skill) {
  const gap = levelIndex(skill.targetLevel) - levelIndex(skill.currentLevel);
  return skill.priority === 'critical' || (gap >= 2 && (skill.priority === 'high' || skill.priority === 'critical'));
}

function mergeBusy(intervals) {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out = [];
  for (const item of sorted) {
    if (!out.length || item.start > out[out.length - 1].end) out.push({ ...item });
    else out[out.length - 1].end = Math.max(out[out.length - 1].end, item.end);
  }
  return out;
}

function gaps(dayStart, dayEnd, busy) {
  const merged = mergeBusy(busy.filter((b) => b.end > dayStart && b.start < dayEnd));
  const free = [];
  let cursor = dayStart;
  for (const block of merged) {
    const s = Math.max(block.start, dayStart);
    const e = Math.min(block.end, dayEnd);
    if (s - cursor >= 20) free.push({ start: cursor, end: s });
    cursor = Math.max(cursor, e);
  }
  if (dayEnd - cursor >= 20) free.push({ start: cursor, end: dayEnd });
  return free;
}

function place(free, duration, earliest = 0) {
  for (let i = 0; i < free.length; i += 1) {
    const gap = free[i];
    const start = Math.max(gap.start, earliest);
    if (gap.end - start >= duration) {
      const end = start + duration;
      const next = [];
      if (start - gap.start >= 10) next.push({ start: gap.start, end: start });
      if (gap.end - end >= 10) next.push({ start: end, end: gap.end });
      free.splice(i, 1, ...next);
      return { start, end };
    }
  }
  return null;
}

function interleave(chunks) {
  const hard = chunks.filter((c) => c.hard);
  const easy = chunks.filter((c) => !c.hard);
  const out = [];
  let h = 0;
  let e = 0;
  let hardRun = 0;
  while (h < hard.length || e < easy.length) {
    if ((hardRun >= 2 && e < easy.length) || (h >= hard.length && e < easy.length)) {
      out.push(easy[e]);
      e += 1;
      hardRun = 0;
    } else if (h < hard.length) {
      out.push(hard[h]);
      h += 1;
      hardRun += 1;
    }
  }
  return out;
}

function studyDays(profile) {
  const days = profile.studyDays?.length ? profile.studyDays : [1, 2, 3, 4, 5, 6];
  return new Set(days);
}

function familyBusy(profile, date) {
  const weekday = new Date(`${date}T12:00:00`).getDay();
  return (profile.familyBlocks || [])
    .filter((block) => !block.days?.length || block.days.includes(weekday))
    .map((block) => ({
      start: parseMin(block.start),
      end: parseMin(block.end),
      title: block.title || 'Family responsibility',
      type: 'personal'
    }));
}

function mealBusy(wake, sleep) {
  const meals = [];
  const breakfast = wake + 45;
  if (breakfast + 20 < sleep) meals.push({ start: breakfast, end: breakfast + 20, title: 'Breakfast', type: 'personal' });
  if (13 * 60 >= wake && 13 * 60 + 30 <= sleep) meals.push({ start: 13 * 60, end: 13 * 60 + 30, title: 'Lunch', type: 'personal' });
  const dinner = sleep - 150;
  if (dinner > wake + 180) meals.push({ start: dinner, end: dinner + 30, title: 'Dinner', type: 'personal' });
  return meals;
}

/**
 * Build a proposed week from saved profile, skills, tasks, and last week's results.
 * Nothing here is random. Placement follows priority, skill gap, deadlines, and free time.
 */
export function generateWeekPlan({
  profile,
  skills = [],
  tasks = [],
  weekStart,
  modifiers = {},
  previousBlocks = []
}) {
  const start = startOfWeek(weekStart);
  const dates = weekDates(start);
  const rationale = [];
  const warnings = [];
  const blocks = [];
  const createdTasks = [];
  const wake = parseMin(profile.wakeTime || '06:00');
  const sleep = parseMin(profile.sleepTime || '23:00');
  if (sleep - wake < 8 * 60) {
    warnings.push('Your wake and sleep window is very short. The plan uses only the time between them.');
  }
  const activeDays = studyDays(profile);
  const dailyBudget = Math.max(30, Math.round((Number(profile.studyHoursPerDay) || 4) * 60));
  const exerciseGoal = Math.min(90, Math.max(0, Number(profile.fitness?.exerciseMinutes) || 30));
  if ((Number(profile.fitness?.exerciseMinutes) || 0) > 90) {
    warnings.push('Exercise was kept at 90 minutes or less. This app does not recommend long daily workouts.');
  }

  const activeSkills = skills.filter((skill) => skill.status !== 'paused');
  const weighted = activeSkills
    .map((skill) => ({ skill, weight: skillWeight(skill, modifiers[skill.id] || 1) }))
    .sort((a, b) => b.weight - a.weight || a.skill.name.localeCompare(b.skill.name));

  if (!weighted.length) {
    warnings.push('Add at least one skill so the planner can fill study blocks. Personal and fitness time is still reserved.');
  } else {
    weighted.slice(0, 4).forEach(({ skill, weight }) => {
      const gap = levelIndex(skill.targetLevel) - levelIndex(skill.currentLevel);
      rationale.push(
        `${skill.name} is weighted ${weight.toFixed(1)} because it is ${skill.priority} priority with a gap of ${Math.max(gap, 0)} level${gap === 1 ? '' : 's'}.`
      );
    });
  }

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0) || 1;
  const studyDayCount = dates.filter((date) => activeDays.has(new Date(`${date}T12:00:00`).getDay())).length || 1;
  const weekBudget = dailyBudget * studyDayCount;
  let chunks = [];
  weighted.forEach(({ skill, weight }, index) => {
    let minutes = Math.round((weekBudget * weight) / totalWeight);
    const cap = Math.round(weekBudget * 0.4);
    if (minutes > cap) minutes = cap;
    const preferred = Number(skill.dailyMinutes) > 0 ? Number(skill.dailyMinutes) * studyDayCount : minutes;
    minutes = Math.min(minutes, preferred);
    if (minutes < 25) return;
    let typeCursor = index % STUDY_TYPES.length;
    let left = minutes;
    while (left >= 25) {
      const size = left >= 50 ? 50 : left >= 40 ? 40 : 25;
      const type = STUDY_TYPES[typeCursor % STUDY_TYPES.length];
      typeCursor += 1;
      chunks.push({
        skill,
        type,
        minutes: size,
        hard: isHardSkill(skill) && type !== 'revision'
      });
      left -= size;
    }
  });
  chunks = interleave(chunks);
  rationale.push('Hard skills are separated by an easier block so difficult work is not stacked.');

  const carried = tasks
    .filter((task) => task.status !== 'completed' && task.dueDate && task.dueDate < start)
    .sort((a, b) => (PRIORITY_WEIGHT[b.priority] || 2) - (PRIORITY_WEIGHT[a.priority] || 2));
  if (carried.length) {
    rationale.push(`${carried.length} unfinished task${carried.length === 1 ? '' : 's'} from earlier dates are placed before new practice.`);
  }

  const upcoming = tasks
    .filter((task) => task.status !== 'completed' && task.dueDate && task.dueDate >= start && task.dueDate <= addDays(start, 6))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || (PRIORITY_WEIGHT[b.priority] || 2) - (PRIORITY_WEIGHT[a.priority] || 2));

  const restDays = new Set(profile.fitness?.restDays || [0]);

  dates.forEach((date) => {
    const weekday = new Date(`${date}T12:00:00`).getDay();
    const isStudyDay = activeDays.has(weekday);
    const dayBudget = isStudyDay ? (weekday === 0 ? Math.round(dailyBudget * 0.5) : dailyBudget) : 0;
    const fixed = [...familyBusy(profile, date)];
    mealBusy(wake, sleep).forEach((meal) => {
      const hits = fixed.some((item) => meal.start < item.end && meal.end > item.start);
      if (!hits) fixed.push(meal);
    });
    const busy = fixed.map((item) => ({ start: item.start, end: item.end }));
    const free = gaps(wake, sleep, busy);

    fixed.forEach((item) => {
      blocks.push(makeBlock(date, item.start, item.end, item.title, item.type, 'easy'));
    });

    if (!restDays.has(weekday) && exerciseGoal >= 15) {
      const slot = place(free, exerciseGoal, wake + 15);
      if (slot) {
        blocks.push(makeBlock(date, slot.start, slot.end, 'Exercise and mobility', 'fitness', 'easy'));
      } else {
        warnings.push(`No free slot for exercise on ${date}.`);
      }
    } else if (restDays.has(weekday)) {
      const slot = place(free, 15, wake + 15);
      if (slot) blocks.push(makeBlock(date, slot.start, slot.end, 'Rest day walk', 'fitness', 'easy'));
    }

    if (!isStudyDay) return;

    let used = 0;
    let hardRun = 0;
    const dueToday = upcoming.filter((task) => task.dueDate === date);
    const queue = [
      ...carried.map((task) => ({ task, minutes: clampDuration(task.estimateMin), hard: task.priority === 'critical' || task.priority === 'high' })),
      ...dueToday.map((task) => ({ task, minutes: clampDuration(task.estimateMin), hard: task.priority === 'critical' }))
    ];

    while (queue.length && used < dayBudget) {
      const item = queue.shift();
      if (item.task && blocks.some((block) => block.taskId === item.task.id)) continue;
      const duration = Math.min(item.minutes, dayBudget - used);
      if (duration < 20) break;
      const slot = place(free, duration);
      if (!slot) {
        warnings.push(`Could not fit "${item.task.title}" on ${date} without an overlap.`);
        break;
      }
      const block = makeBlock(date, slot.start, slot.end, item.task.title, 'task', item.hard ? 'hard' : 'medium');
      block.taskId = item.task.id;
      blocks.push(block);
      used += duration;
      hardRun = item.hard ? hardRun + 1 : 0;
      const breakSlot = place(free, 10);
      if (breakSlot) blocks.push(makeBlock(date, breakSlot.start, breakSlot.end, 'Break', 'break', 'easy'));
    }

    while (chunks.length && used + 25 <= dayBudget) {
      if (chunks[0].hard && hardRun >= 2) {
        const easyIndex = chunks.findIndex((chunk) => !chunk.hard);
        if (easyIndex >= 0) {
          const [easy] = chunks.splice(easyIndex, 1);
          chunks.unshift(easy);
        } else {
          break;
        }
      }
      const chunk = chunks[0];
      if (chunk.minutes > dayBudget - used) break;
      const slot = place(free, chunk.minutes);
      if (!slot) break;
      chunks.shift();
      const title = `${chunk.skill.name} · ${labelType(chunk.type)}`;
      const block = makeBlock(date, slot.start, slot.end, title, chunk.type, chunk.hard ? 'hard' : 'medium');
      block.skillId = chunk.skill.id;
      const task = {
        id: uid(),
        title,
        description: `${labelType(chunk.type)} session generated from your ${chunk.skill.name} skill gap.`,
        category: 'Learning',
        priority: chunk.skill.priority || 'medium',
        startDate: date,
        dueDate: date,
        estimateMin: chunk.minutes,
        spentMin: 0,
        recurring: 'none',
        subtasks: [],
        notes: '',
        progress: 0,
        status: 'pending',
        source: 'scheduler',
        skillId: chunk.skill.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      block.taskId = task.id;
      task.blockId = block.id;
      createdTasks.push(task);
      blocks.push(block);
      used += chunk.minutes;
      hardRun = chunk.hard ? hardRun + 1 : 0;
      const breakSlot = place(free, 10);
      if (breakSlot && used < dayBudget) blocks.push(makeBlock(date, breakSlot.start, breakSlot.end, 'Break', 'break', 'easy'));
    }
  });

  if (chunks.length) {
    warnings.push(`${chunks.length} study block${chunks.length === 1 ? '' : 's'} did not fit. Raise daily study hours or shorten family blocks.`);
  }

  const carriedForward = previousBlocks.filter((block) => block.status === 'missed');
  if (carriedForward.length) {
    rationale.push('Missed sessions from the saved week stay visible in the review. They are not deleted.');
  }

  blocks.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const overlap = findOverlap(blocks);
  if (overlap) warnings.push(`Internal overlap detected between "${overlap[0].title}" and "${overlap[1].title}".`);

  return {
    id: uid(),
    weekStart: start,
    createdAt: new Date().toISOString(),
    rationale,
    warnings,
    blocks,
    createdTasks,
    modifiers
  };
}

function clampDuration(value) {
  const n = Number(value) || 45;
  return Math.min(90, Math.max(25, n));
}

function labelType(type) {
  if (type === 'coding') return 'Coding';
  if (type === 'theory') return 'Theory';
  if (type === 'practice') return 'Practice';
  if (type === 'project') return 'Project';
  if (type === 'revision') return 'Revision';
  return type;
}

function makeBlock(date, start, end, title, type, difficulty) {
  return {
    id: uid(),
    date,
    start: fmtMin(start),
    end: fmtMin(end),
    title,
    type,
    difficulty,
    status: 'planned',
    source: 'scheduler'
  };
}

export function findOverlap(blocks) {
  const groups = new Map();
  blocks.forEach((block) => {
    if (block.status === 'cancelled') return;
    const list = groups.get(block.date) || [];
    list.push(block);
    groups.set(block.date, list);
  });
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].start < sorted[i - 1].end) return [sorted[i - 1], sorted[i]];
    }
  }
  return null;
}

export function overlaps(blocks, candidate) {
  return blocks.some((block) => {
    if (block.id === candidate.id || block.date !== candidate.date || block.status === 'cancelled') return false;
    return candidate.start < block.end && candidate.end > block.start;
  });
}

export function blockMinutes(block) {
  return Math.max(0, parseMin(block.end) - parseMin(block.start));
}

export function moveBlock(block, date, startMin) {
  const duration = blockMinutes(block);
  return {
    ...block,
    date,
    start: fmtMin(startMin),
    end: fmtMin(startMin + duration)
  };
}

export function evaluateWeek({ profile, skills, tasks, blocks, fitness, mobile, weekStart }) {
  const start = startOfWeek(weekStart);
  const dates = weekDates(start);
  const weekBlocks = blocks.filter((block) => dates.includes(block.date) && block.status !== 'cancelled');
  const studyBlocks = weekBlocks.filter((block) => STUDY_TYPES.includes(block.type) || block.type === 'task');
  const plannedMin = studyBlocks.reduce((sum, block) => sum + blockMinutes(block), 0);
  const actualMin = studyBlocks
    .filter((block) => block.status === 'completed')
    .reduce((sum, block) => sum + (Number(block.actualMin) || blockMinutes(block)), 0);
  const missedBlocks = studyBlocks.filter((block) => block.status === 'missed' || (block.date < new Date().toISOString().slice(0, 10) && block.status === 'planned'));
  const weekTasks = tasks.filter((task) => task.dueDate && dates.includes(task.dueDate));
  const completedTasks = weekTasks.filter((task) => task.status === 'completed');
  const missedTasks = weekTasks.filter((task) => task.status !== 'completed' && task.dueDate < dates[6]);
  const activeDays = studyDays(profile);
  const plannedDays = dates.filter((date) => activeDays.has(new Date(`${date}T12:00:00`).getDay()));
  const studiedDates = new Set(studyBlocks.filter((block) => block.status === 'completed').map((block) => block.date));
  const consistency = plannedDays.length ? studiedDates.size / plannedDays.length : 0;

  const bySkill = new Map();
  studyBlocks.forEach((block) => {
    if (!block.skillId) return;
    const row = bySkill.get(block.skillId) || { planned: 0, done: 0 };
    row.planned += blockMinutes(block);
    if (block.status === 'completed') row.done += Number(block.actualMin) || blockMinutes(block);
    bySkill.set(block.skillId, row);
  });

  const weakSkills = [];
  const modifiers = {};
  skills.forEach((skill) => {
    const row = bySkill.get(skill.id);
    const gap = levelIndex(skill.targetLevel) - levelIndex(skill.currentLevel);
    const ratio = row && row.planned ? row.done / row.planned : null;
    if ((ratio !== null && ratio < 0.6) || (gap >= 2 && (ratio === null || ratio < 0.85))) {
      weakSkills.push({
        id: skill.id,
        name: skill.name,
        reason: ratio === null ? 'No finished practice was logged for this skill.' : `You finished ${Math.round(ratio * 100)}% of the planned time.`
      });
      modifiers[skill.id] = 1.3;
    } else if (ratio !== null && ratio >= 0.9 && gap <= 1) {
      modifiers[skill.id] = 0.85;
    }
  });

  const fitRows = (fitness || []).filter((row) => dates.includes(row.date));
  const fitnessScore = fitRows.length
    ? Math.round(
        fitRows.reduce((sum, row) => sum + fitnessDayScore(row, profile), 0) / fitRows.length
      )
    : 0;
  const mobileRows = (mobile || []).filter((row) => dates.includes(row.date));
  const mobileTotal = mobileRows.reduce((sum, row) => sum + (Number(row.totalMin) || 0), 0);
  const limit = Number(profile.mobileLimitMinutes) || 120;

  const recommendations = [];
  if (consistency < 0.7) recommendations.push('Keep the same goals, but protect one shorter focus block on days you missed.');
  if (plannedMin && actualMin < plannedMin * 0.7) recommendations.push('Planned study time was higher than finished time. Next week trims overflow instead of adding new topics.');
  if (weakSkills.length) recommendations.push(`Give extra time to ${weakSkills.map((skill) => skill.name).join(', ')}.`);
  if (!weakSkills.length && consistency >= 0.8) recommendations.push('Consistency is solid. Next week keeps the same priorities with a small reduction on skills you already finished.');
  if (mobileRows.some((row) => row.totalMin > limit)) recommendations.push('Mobile time went over your limit on at least one day. The plan still does not read your phone automatically.');
  if (fitnessScore < 60) recommendations.push('Fitness blocks stay short. A rest day remains on the calendar.');
  if (!recommendations.length) recommendations.push('No major change. Next week continues the same structure because the logged work matches the plan.');

  return {
    weekStart: start,
    plannedMin,
    actualMin,
    consistency,
    completedTasks: completedTasks.length,
    missedTasks,
    missedBlocks,
    weakSkills,
    modifiers,
    fitnessScore,
    mobileTotal,
    recommendations,
    productivity: productivityScore({ plannedMin, actualMin, completed: completedTasks.length, total: weekTasks.length, consistency, fitnessScore })
  };
}

export function fitnessDayScore(row, profile) {
  const waterGoal = Number(profile.fitness?.waterGlasses) || 8;
  const sleepGoal = Number(profile.fitness?.sleepHours) || 7;
  const moveGoal = Number(profile.fitness?.exerciseMinutes) || 30;
  const water = Math.min(1, (Number(row.waterGlasses) || 0) / waterGoal);
  const sleep = Math.min(1, (Number(row.sleepHours) || 0) / sleepGoal);
  const move = row.restDay ? 1 : Math.min(1, (Number(row.exerciseMin) || 0) / moveGoal);
  return Math.round(((water + sleep + move) / 3) * 100);
}

export function productivityScore({ plannedMin, actualMin, completed, total, consistency, fitnessScore }) {
  const hours = plannedMin ? Math.min(1, actualMin / plannedMin) : 0;
  const tasks = total ? completed / total : 0;
  const fit = (fitnessScore || 0) / 100;
  return Math.round((hours * 0.4 + tasks * 0.3 + consistency * 0.2 + fit * 0.1) * 100);
}

export function freeMinutes(blocks, date, profile) {
  const wake = parseMin(profile.wakeTime || '06:00');
  const sleep = parseMin(profile.sleepTime || '23:00');
  const busy = blocks
    .filter((block) => block.date === date && block.status !== 'cancelled')
    .map((block) => ({ start: parseMin(block.start), end: parseMin(block.end) }));
  return gaps(wake, sleep, busy).reduce((sum, gap) => sum + (gap.end - gap.start), 0);
}

export function rescheduleMissed(blocks, profile, fromDate) {
  const missed = blocks.filter((block) => block.status === 'missed' || (block.date < fromDate && block.status === 'planned' && block.type !== 'personal'));
  const next = blocks.map((block) => ({ ...block }));
  const notes = [];
  missed.forEach((block) => {
    const duration = blockMinutes(block);
    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(fromDate, offset);
      const wake = parseMin(profile.wakeTime || '06:00');
      const sleep = parseMin(profile.sleepTime || '23:00');
      const busy = next
        .filter((item) => item.date === date && item.status !== 'cancelled' && item.id !== block.id)
        .map((item) => ({ start: parseMin(item.start), end: parseMin(item.end) }));
      const free = gaps(wake, sleep, busy);
      const slot = place(free, duration);
      if (!slot) continue;
      const index = next.findIndex((item) => item.id === block.id);
      next[index] = {
        ...next[index],
        date,
        start: fmtMin(slot.start),
        end: fmtMin(slot.end),
        status: 'planned',
        title: next[index].title.replace(/^Carried: /, '')
      };
      if (!next[index].title.startsWith('Carried: ')) next[index].title = `Carried: ${next[index].title}`;
      notes.push(`${block.title} moved to ${date} ${next[index].start}.`);
      return;
    }
    notes.push(`No open slot this week for "${block.title}".`);
  });
  return { blocks: next, notes };
}
