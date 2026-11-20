import { LEVELS, levelIndex } from './scheduler.js';
import { addDays, minutesToLabel, todayISO } from './dates.js';
import { fitnessDayScore } from './scheduler.js';

function facts(vault) {
  const today = todayISO();
  const tasks = vault.tasks || [];
  const pending = tasks.filter((task) => task.status !== 'completed');
  const done = tasks.filter((task) => task.status === 'completed');
  const skills = vault.skills || [];
  return {
    today,
    name: vault.profile?.name || 'there',
    career: vault.profile?.careerTarget || 'your target role',
    hours: vault.profile?.studyHoursPerDay || 0,
    skills,
    pending,
    done,
    tasks
  };
}

function skillLine(skill) {
  return `${skill.name}: ${skill.currentLevel} → ${skill.targetLevel}, priority ${skill.priority}`;
}

function weakSkills(skills) {
  return [...skills].sort((a, b) => {
    const gapA = levelIndex(a.targetLevel) - levelIndex(a.currentLevel);
    const gapB = levelIndex(b.targetLevel) - levelIndex(b.currentLevel);
    const p = { low: 1, medium: 2, high: 3, critical: 4 };
    return gapB * 2 + (p[b.priority] || 2) - (gapA * 2 + (p[a.priority] || 2));
  });
}

export function coachReply(message, vault) {
  const text = message.toLowerCase();
  const data = facts(vault);
  if (!data.skills.length && !data.tasks.length) {
    return {
      source: 'rules',
      reply: 'I can only plan from data you have saved. Add a career target, study hours, and at least one skill, then ask again. I will not invent progress.',
      suggestions: []
    };
  }
  if (text.includes('missed') || text.includes('reorganize') || text.includes('yesterday')) {
    return reorganize(data, vault);
  }
  if (text.includes('weak') || text.includes('evaluate') || text.includes('progress')) {
    return evaluate(data, vault);
  }
  if (text.includes('hour') || text.includes('today') || text.includes('timetable')) {
    return shortDay(data, message);
  }
  if (text.includes('30') || text.includes('plan') || text.includes('fresher') || text.includes('schedule')) {
    return learningPlan(data, message);
  }
  if (text.includes('project')) {
    return projects(data);
  }
  return evaluate(data, vault);
}

function learningPlan(data, message) {
  const days = /30/.test(message) ? 30 : 14;
  const mentioned = data.skills.filter((skill) => message.toLowerCase().includes(skill.name.toLowerCase()));
  const focus = mentioned.length ? mentioned : weakSkills(data.skills).slice(0, 3);
  if (!focus.length) {
    return {
      source: 'rules',
      reply: 'I do not see saved skills that match that request. Add the skills first. I will not pretend they are already on your plan.',
      suggestions: []
    };
  }
  const hours = Number(data.hours) || 3;
  const lines = focus.map((skill, index) => {
    const share = Math.max(30, Math.round(((hours * 60) / focus.length) / 5) * 5);
    return `${index + 1}. ${skill.name} (${skill.currentLevel} now, target ${skill.targetLevel}): about ${share} minutes on study days, rotating theory, coding, and revision.`;
  });
  const suggestions = [];
  for (let i = 0; i < Math.min(days, 6); i += 1) {
    const skill = focus[i % focus.length];
    suggestions.push({
      type: 'task',
      title: `${skill.name} focus block`,
      detail: `Practice from your saved ${skill.currentLevel} level toward ${skill.targetLevel}.`,
      estimateMin: 45,
      dueDate: addDays(data.today, i),
      priority: skill.priority || 'medium',
      category: 'Learning',
      skillId: skill.id
    });
  }
  return {
    source: 'rules',
    reply: [
      `Here is a ${days}-day outline for ${data.name}, aimed at ${data.career}. It uses your saved study budget of ${hours} hours a day.`,
      ...lines,
      `You have ${data.done.length} completed tasks and ${data.pending.length} still open in the saved workspace. This plan does not mark anything complete.`,
      'Approve a weekly timetable in Smart Scheduler when you want these blocks on the calendar.'
    ].join('\n')
  , suggestions };
}

function reorganize(data, vault) {
  const missed = data.pending.filter((task) => task.dueDate && task.dueDate < data.today);
  if (!missed.length) {
    return {
      source: 'rules',
      reply: 'I checked your saved tasks. None are dated before today and still open, so there is nothing to carry forward.',
      suggestions: []
    };
  }
  const openMinutes = (vault.blocks || [])
    .filter((block) => block.date === data.today && block.status === 'planned')
    .length;
  return {
    source: 'rules',
    reply: `You have ${missed.length} unfinished task${missed.length === 1 ? '' : 's'} dated before today: ${missed.map((task) => task.title).join(', ')}. Today already has ${openMinutes} planned block${openMinutes === 1 ? '' : 's'}. Use "Reschedule missed" in Smart Scheduler to move them into real free slots. I have not marked them done.`,
    suggestions: missed.slice(0, 4).map((task) => ({
      type: 'task',
      title: `Carried: ${task.title}`,
      detail: task.description || 'Moved forward from an earlier due date.',
      estimateMin: task.estimateMin || 40,
      dueDate: data.today,
      priority: task.priority || 'high',
      category: task.category || 'Learning'
    }))
  };
}

function evaluate(data, vault) {
  const ranked = weakSkills(data.skills);
  const weakest = ranked.slice(0, 3);
  const todayFit = (vault.fitness || []).find((row) => row.date === data.today);
  const fit = todayFit ? fitnessDayScore(todayFit, vault.profile) : null;
  const mobile = (vault.mobile || []).find((row) => row.date === data.today);
  const lines = [
    `${data.name}, this is based only on saved records.`,
    `Tasks completed: ${data.done.length}. Still open: ${data.pending.length}.`,
    weakest.length
      ? `Largest saved gaps: ${weakest.map(skillLine).join('; ')}.`
      : 'No skills are saved yet.',
    fit === null ? 'No health log for today.' : `Today's health score from your log is ${fit}%.`,
    mobile ? `Mobile time logged today: ${minutesToLabel(mobile.totalMin)}.` : 'No mobile time logged today.'
  ];
  return {
    source: 'rules',
    reply: lines.join('\n'),
    suggestions: weakest.slice(0, 2).map((skill) => ({
      type: 'task',
      title: `Extra practice: ${skill.name}`,
      detail: `You are ${skill.currentLevel}. Target is ${skill.targetLevel}.`,
      estimateMin: 40,
      dueDate: data.today,
      priority: 'high',
      category: 'Learning',
      skillId: skill.id
    }))
  };
}

function shortDay(data, message) {
  const match = message.match(/(\d+(?:\.\d+)?)\s*hour/);
  const hours = match ? Number(match[1]) : Math.min(3, Number(data.hours) || 3);
  const focus = weakSkills(data.skills).slice(0, 3);
  const budget = Math.round(hours * 60);
  let left = budget;
  const parts = [];
  focus.forEach((skill) => {
    if (left < 25) return;
    const slice = Math.min(50, left);
    parts.push(`${slice} min ${skill.name} (${skill.currentLevel})`);
    left -= slice + 10;
  });
  const pending = data.pending.filter((task) => task.priority === 'critical' || task.priority === 'high').slice(0, 2);
  return {
    source: 'rules',
    reply: [
      `With ${hours} hour${hours === 1 ? '' : 's'}, use this order: ${parts.join(', then ') || 'add a skill first'}.`,
      'Keep a 10 minute break between blocks. Leave the rest of the day unscheduled.',
      pending.length ? `High-priority open tasks: ${pending.map((task) => task.title).join(', ')}.` : 'No high-priority tasks are waiting.',
      'Nothing is marked complete by this suggestion.'
    ].join('\n'),
    suggestions: focus.slice(0, 3).map((skill) => ({
      type: 'task',
      title: `${skill.name} short session`,
      detail: `Fits a ${hours} hour day.`,
      estimateMin: 40,
      dueDate: data.today,
      priority: skill.priority || 'medium',
      category: 'Learning',
      skillId: skill.id
    }))
  };
}

function projects(data) {
  const names = data.skills.map((skill) => skill.name);
  const ideas = [];
  if (names.some((name) => /java|spring/i.test(name))) ideas.push('A small Spring Boot API that stores your tasks in MongoDB.');
  if (names.some((name) => /react/i.test(name))) ideas.push('A React page that shows your own skill gaps from saved levels.');
  if (names.some((name) => /sql/i.test(name))) ideas.push('A SQL practice set using tables for students, courses, and enrollments.');
  if (!ideas.length) ideas.push('Add programming skills first. I will suggest a project from those saved skills.');
  return {
    source: 'rules',
    reply: `Project ideas from skills you actually saved (${names.join(', ') || 'none'}):\n- ${ideas.join('\n- ')}`,
    suggestions: ideas.slice(0, 2).map((idea) => ({
      type: 'task',
      title: idea.slice(0, 80),
      detail: idea,
      estimateMin: 60,
      dueDate: addDays(data.today, 3),
      priority: 'medium',
      category: 'Project'
    }))
  };
}

export function nextLevel(current) {
  const index = LEVELS.indexOf(current);
  return LEVELS[Math.min(LEVELS.length - 1, index + 1)] || 'basic';
}
