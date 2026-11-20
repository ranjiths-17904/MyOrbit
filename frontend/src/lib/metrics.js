import { addDays, minutesToLabel, startOfWeek, todayISO, weekDates, weekNumber } from './dates.js';
import { STUDY_TYPES, blockMinutes, fitnessDayScore } from './scheduler.js';

export function studyMinutesOn(blocks, date) {
  return (blocks || [])
    .filter((block) => block.date === date && block.status === 'completed' && isStudy(block))
    .reduce((sum, block) => sum + (Number(block.actualMin) || blockMinutes(block)), 0);
}

export function isStudy(block) {
  return STUDY_TYPES.includes(block.type) || block.type === 'task';
}

export function streakCount(vault, today = todayISO()) {
  const days = new Set();
  (vault.blocks || []).forEach((block) => {
    if (block.status === 'completed' && isStudy(block)) days.add(block.date);
  });
  (vault.tasks || []).forEach((task) => {
    if (task.status === 'completed' && task.completedAt && task.category === 'Learning') {
      days.add(task.completedAt.slice(0, 10));
    }
  });
  let cursor = days.has(today) ? today : addDays(today, -1);
  if (!days.has(cursor)) return 0;
  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function dashboardModel(vault, today = todayISO()) {
  const profile = vault.profile;
  const goalMin = Math.round((Number(profile.studyHoursPerDay) || 0) * 60);
  const actualMin = studyMinutesOn(vault.blocks, today);
  const tasksToday = (vault.tasks || []).filter((task) => task.dueDate === today || task.startDate === today);
  const tasksDone = tasksToday.filter((task) => task.status === 'completed').length;
  const fitness = (vault.fitness || []).find((row) => row.date === today) || null;
  const fitScore = fitness ? fitnessDayScore(fitness, profile) : 0;
  const parts = [];
  if (goalMin) parts.push(Math.min(1, actualMin / goalMin));
  if (tasksToday.length) parts.push(tasksDone / tasksToday.length);
  if (fitness) parts.push(fitScore / 100);
  const progress = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) : 0;
  const week = weekDates(startOfWeek(today)).map((date) => {
    const dayBlocks = (vault.blocks || []).filter((block) => block.date === date && block.status !== 'cancelled' && isStudy(block));
    if (!dayBlocks.length) return { date, label: new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' }), value: 0 };
    const done = dayBlocks.filter((block) => block.status === 'completed').length;
    return {
      date,
      label: new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
      value: Math.round((done / dayBlocks.length) * 100)
    };
  });
  const mobile = (vault.mobile || []).find((row) => row.date === today) || null;
  const schedule = (vault.blocks || [])
    .filter((block) => block.date === today && block.status !== 'cancelled')
    .sort((a, b) => a.start.localeCompare(b.start));
  return {
    today,
    progress,
    actualMin,
    goalMin,
    tasksDone,
    tasksTotal: tasksToday.length,
    streak: streakCount(vault, today),
    week,
    weekNumber: weekNumber(profile.planStart, today),
    dayNumber: new Date(`${today}T12:00:00`).getDay() || 7,
    fitScore,
    fitness,
    mobile,
    schedule,
    message: motivation(progress, tasksDone, tasksToday.length),
    pendingToday: tasksToday.filter((task) => task.status !== 'completed')
  };
}

export function motivation(progress, done, total) {
  if (!total && progress === 0) return "Add today's plan, then finish the first small block.";
  if (progress >= 85) return 'You are on track this week. Keep up the work you already logged.';
  if (progress >= 60) return `You finished ${done} of ${total || 'your'} saved items. One more block keeps the streak honest.`;
  if (progress >= 30) return 'You have started. Finish the highest-priority open task before adding anything new.';
  return 'Log a real session, even a short one. The numbers move only when you mark work done.';
}

export function weekSeries(rows, key) {
  return weekDates(startOfWeek(todayISO())).map((date) => {
    const row = (rows || []).find((item) => item.date === date);
    return {
      label: new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
      value: row ? Number(row[key]) || 0 : 0
    };
  });
}

export function buildReport(vault, weekStart) {
  const dates = weekDates(weekStart);
  const blocks = (vault.blocks || []).filter((block) => dates.includes(block.date));
  const study = blocks.filter(isStudy);
  const planned = study.reduce((sum, block) => sum + blockMinutes(block), 0);
  const actual = study.filter((block) => block.status === 'completed').reduce((sum, block) => sum + (Number(block.actualMin) || blockMinutes(block)), 0);
  const tasks = (vault.tasks || []).filter((task) => task.dueDate && dates.includes(task.dueDate));
  const skills = (vault.skills || []).map((skill) => {
    const related = study.filter((block) => block.skillId === skill.id);
    const done = related.filter((block) => block.status === 'completed').reduce((sum, block) => sum + blockMinutes(block), 0);
    return { name: skill.name, currentLevel: skill.currentLevel, targetLevel: skill.targetLevel, minutes: done };
  });
  const fitness = (vault.fitness || []).filter((row) => dates.includes(row.date));
  const mobile = (vault.mobile || []).filter((row) => dates.includes(row.date));
  const model = dashboardModel(vault);
  return {
    weekStart,
    planned,
    actual,
    tasksCompleted: tasks.filter((task) => task.status === 'completed').length,
    tasksMissed: tasks.filter((task) => task.status !== 'completed').length,
    skills,
    fitnessAverage: fitness.length ? Math.round(fitness.reduce((sum, row) => sum + fitnessDayScore(row, vault.profile), 0) / fitness.length) : 0,
    mobileTotal: mobile.reduce((sum, row) => sum + (Number(row.totalMin) || 0), 0),
    productivity: model.progress,
    codingMinutes: study.filter((block) => block.status === 'completed' && (block.type === 'coding' || block.type === 'practice')).reduce((sum, block) => sum + blockMinutes(block), 0),
    projectMinutes: study.filter((block) => block.status === 'completed' && block.type === 'project').reduce((sum, block) => sum + blockMinutes(block), 0),
    englishMinutes: study.filter((block) => block.status === 'completed' && /english/i.test(block.title)).reduce((sum, block) => sum + blockMinutes(block), 0)
  };
}

export function toCsv(report) {
  const lines = [
    ['Metric', 'Value'],
    ['Week start', report.weekStart],
    ['Planned study minutes', report.planned],
    ['Actual study minutes', report.actual],
    ['Tasks completed', report.tasksCompleted],
    ['Tasks missed', report.tasksMissed],
    ['Coding and practice minutes', report.codingMinutes],
    ['Project minutes', report.projectMinutes],
    ['English minutes', report.englishMinutes],
    ['Fitness average', report.fitnessAverage],
    ['Mobile minutes', report.mobileTotal],
    ['Snapshot productivity', report.productivity]
  ];
  report.skills.forEach((skill) => lines.push([`${skill.name} minutes`, skill.minutes]));
  return lines.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
}

export function formatHours(min) {
  return minutesToLabel(min || 0);
}
