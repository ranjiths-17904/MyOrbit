import { config } from './config.js';
import { COLLECTIONS } from './db.js';
import { text } from './errors.js';
import { list, readProfile } from './records.js';

export async function reply(userId, message) {
  const fallback = { source: 'rules' };
  if (!config.llmConfigured() || !text(message)) return fallback;
  const skills = await list(userId, COLLECTIONS.SKILLS);
  const tasks = await list(userId, COLLECTIONS.TASKS);
  if (!skills.length && !tasks.length) return fallback;
  try {
    const response = await fetch(config.llmUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.llmKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload(text(message), await context(userId, skills, tasks))),
      signal: AbortSignal.timeout(25000)
    });
    if (!response.ok) return fallback;
    return parse(await response.text());
  } catch (error) {
    console.warn('AI API did not answer:', error.message);
    return fallback;
  }
}

function payload(message, saved) {
  return {
    model: config.llmModel,
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: [
          'You are the planner inside MyOrbit. Use only the saved data included in the user message.',
          'Never claim a task, skill, hour, streak, or fitness log is complete unless that saved status says completed.',
          'Do not diagnose illness or prescribe treatment. Keep exercise at or below the user saved exercise goal and never above 90 minutes.',
          'Reply with JSON only, no markdown:',
          '{"reply":"...","suggestions":[{"title":"...","detail":"...","category":"Learning","priority":"medium","estimateMin":40}]}'
        ].join(' ')
      },
      { role: 'user', content: `${message}\n\nSaved data:\n${saved}` }
    ]
  };
}

async function context(userId, skills, tasks) {
  const profile = await readProfile(userId);
  const lines = [];
  if (profile) {
    lines.push(`Name: ${text(profile.name)}`);
    lines.push(`Career target: ${text(profile.careerTarget)}`);
    lines.push(`Study hours per day: ${profile.studyHoursPerDay ?? ''}`);
    if (profile.fitness && typeof profile.fitness === 'object') {
      lines.push(`Exercise goal minutes: ${profile.fitness.exerciseMinutes ?? ''}`);
    }
  }
  lines.push('Skills:');
  for (const skill of skills.slice(0, 30)) {
    lines.push(`- ${text(skill.name)} | current ${text(skill.currentLevel)} | target ${text(skill.targetLevel)} | priority ${text(skill.priority)}`);
  }
  lines.push('Tasks:');
  for (const task of tasks.slice(0, 40)) {
    lines.push(`- ${text(task.title)} | status ${text(task.status)} | due ${text(task.dueDate)}`);
  }
  return lines.join('\n');
}

function parse(raw) {
  let root;
  try {
    root = JSON.parse(raw || '{}');
  } catch {
    return { source: 'rules' };
  }
  let content = text(root?.choices?.[0]?.message?.content);
  if (content.startsWith('```')) {
    content = content.replace(/^```json/, '').replace(/^```/, '');
    const end = content.lastIndexOf('```');
    if (end >= 0) content = content.slice(0, end);
    content = content.trim();
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { reply: content };
  }
  let answer = text(parsed.reply || content);
  if (!answer) return { source: 'rules' };
  if (answer.length > 6000) answer = answer.slice(0, 6000);
  const suggestions = [];
  if (Array.isArray(parsed.suggestions)) {
    for (const item of parsed.suggestions) {
      if (suggestions.length >= 8) break;
      const title = text(item?.title);
      if (!title || title.length > 140) continue;
      const priority = text(item.priority).toLowerCase();
      suggestions.push({
        title,
        detail: clip(item.detail, 400),
        category: clip(item.category || 'Learning', 40),
        priority: ['low', 'medium', 'high', 'critical'].includes(priority) ? priority : 'medium',
        estimateMin: Math.min(180, Math.max(15, Number(item.estimateMin) || 40))
      });
    }
  }
  return { source: 'llm', reply: answer, suggestions };
}

function clip(value, max) {
  const trimmed = text(value);
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}
