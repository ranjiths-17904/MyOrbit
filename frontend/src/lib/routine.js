export const INTERESTS = [
  { id: 'web', label: 'Web development' },
  { id: 'java', label: 'Java and backend' },
  { id: 'data', label: 'Data and AI' },
  { id: 'mobile', label: 'Mobile apps' },
  { id: 'cloud', label: 'Cloud and DevOps' },
  { id: 'career', label: 'Interviews and career' },
  { id: 'english', label: 'English speaking' },
  { id: 'fitness', label: 'Fitness and health' }
];

const STACKS = {
  web: [
    ['HTML', 'Full Stack Development'],
    ['CSS', 'Full Stack Development'],
    ['JavaScript', 'Programming'],
    ['React.js', 'Full Stack Development'],
    ['Node.js', 'Full Stack Development']
  ],
  java: [
    ['Java', 'Programming'],
    ['SQL', 'Programming'],
    ['Spring Boot', 'Full Stack Development'],
    ['REST APIs', 'Full Stack Development'],
    ['Data Structures and Algorithms', 'Programming']
  ],
  data: [
    ['Python', 'Programming'],
    ['SQL', 'Programming'],
    ['Artificial Intelligence', 'Emerging Technologies'],
    ['Generative AI', 'Emerging Technologies'],
    ['Prompt Engineering', 'Emerging Technologies']
  ],
  mobile: [
    ['JavaScript', 'Programming'],
    ['React.js', 'Full Stack Development'],
    ['HTML', 'Full Stack Development'],
    ['CSS', 'Full Stack Development']
  ],
  cloud: [
    ['Cloud Computing', 'Emerging Technologies'],
    ['DevOps', 'Emerging Technologies'],
    ['JavaScript', 'Programming'],
    ['REST APIs', 'Full Stack Development']
  ],
  career: [
    ['Technical Interview Preparation', 'Career Preparation'],
    ['Aptitude', 'Career Preparation'],
    ['Resume and Portfolio', 'Career Preparation'],
    ['Data Structures and Algorithms', 'Programming']
  ],
  english: [
    ['English Speaking', 'Career Preparation'],
    ['Communication', 'Career Preparation']
  ],
  fitness: []
};

export function parseRoutineInput(raw = {}) {
  const age = Number(raw.age);
  const weightKg = Number(raw.weightKg);
  const heightCm = Number(raw.heightCm);
  const studyHoursPerDay = Number(raw.studyHoursPerDay);
  const interests = [...new Set((Array.isArray(raw.interests) ? raw.interests : []).filter((id) => INTERESTS.some((item) => item.id === id)))];
  const learningGoals = String(raw.learningGoals || '').trim();
  const careerTarget = String(raw.careerTarget || '').trim();
  const wakeTime = validTime(raw.wakeTime);
  const sleepTime = validTime(raw.sleepTime);
  const errors = [];
  if (!Number.isInteger(age) || age < 13 || age > 90) errors.push('Enter an age from 13 to 90.');
  if (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 250) errors.push('Enter a weight from 30 to 250 kg.');
  if (!Number.isInteger(heightCm) || heightCm < 120 || heightCm > 230) errors.push('Enter a height from 120 to 230 cm.');
  if (!interests.length) errors.push('Choose at least one interest.');
  if (learningGoals.length < 8 || learningGoals.length > 500) errors.push('Describe a learning goal in one or two sentences.');
  if (careerTarget.length < 2 || careerTarget.length > 120) errors.push('Enter a career target.');
  if (!Number.isFinite(studyHoursPerDay) || studyHoursPerDay < 1 || studyHoursPerDay > 8) errors.push('Study hours must be between 1 and 8.');
  if (!wakeTime || !sleepTime) errors.push('Set both a wake time and a sleep time.');
  if (errors.length) {
    const error = new Error(errors[0]);
    error.details = errors;
    throw error;
  }
  return {
    age,
    weightKg: Math.round(weightKg * 10) / 10,
    heightCm,
    interests,
    learningGoals,
    careerTarget,
    studyHoursPerDay,
    wakeTime,
    sleepTime
  };
}

export function buildRoutine(raw) {
  const input = parseRoutineInput(raw);
  const { age, weightKg, interests } = input;
  let waterGlasses = Math.round((weightKg * 30) / 250);
  if (age < 16 || age >= 65) waterGlasses = Math.min(waterGlasses, 8);
  waterGlasses = clamp(waterGlasses, 6, 10);

  let exerciseMinutes = 30;
  if (age < 18) exerciseMinutes = 25;
  else if (age >= 65) exerciseMinutes = 20;
  else if (interests.includes('fitness')) exerciseMinutes = 40;
  exerciseMinutes = Math.min(exerciseMinutes, 45);

  const sleepHours = age < 18 ? 8 : age >= 65 ? 7.5 : 7;
  let mobileLimitMinutes = interests.includes('career') || interests.includes('data') ? 90 : 120;
  if (age < 18) mobileLimitMinutes = Math.min(mobileLimitMinutes, 90);

  const stack = [];
  const seen = new Set();
  for (const interest of interests) {
    for (const [name, category] of STACKS[interest] || []) {
      if (seen.has(name) || stack.length >= 6) continue;
      seen.add(name);
      stack.push({ name, category });
    }
  }
  if (!stack.length) {
    stack.push(
      { name: 'JavaScript', category: 'Programming' },
      { name: 'HTML', category: 'Full Stack Development' },
      { name: 'CSS', category: 'Full Stack Development' },
      { name: 'React.js', category: 'Full Stack Development' }
    );
  }

  const budget = Math.round(input.studyHoursPerDay * 60 * 0.7);
  const each = clamp(Math.round(budget / stack.length), 20, 50);
  const skills = stack.map((item, index) => ({
    name: item.name,
    category: item.category,
    currentLevel: 'beginner',
    targetLevel: index === 0 ? 'intermediate' : 'basic',
    priority: index < 2 ? 'high' : 'medium',
    dailyMinutes: each,
    resources: [],
    notes: `Suggested from your ${input.careerTarget} plan.`,
    practiceTasks: [`Short practice for ${item.name}`],
    status: 'active',
    source: 'routine'
  }));

  const habits = [
    { title: 'Water through the day', detail: `Spread about ${waterGlasses} glasses across meals and study breaks.` },
    { title: 'Short movement', detail: `About ${exerciseMinutes} minutes of walking or easy strength. Stop earlier if anything hurts.` },
    { title: 'Sleep window', detail: `Aim for about ${sleepHours} hours, waking at ${input.wakeTime} and winding down by ${input.sleepTime}.` },
    { title: 'Phone limit', detail: `Keep non-work phone time under ${mobileLimitMinutes} minutes. Enter it yourself. The browser cannot read phone screen time.` }
  ];

  const tasks = [
    task(`Drink about ${waterGlasses} glasses of water`, 'Health', 'medium', 10, 'daily'),
    task(`${exerciseMinutes} minutes of easy movement`, 'Health', 'medium', exerciseMinutes, 'daily'),
    task(`Stay under ${mobileLimitMinutes} minutes on your phone`, 'Personal', 'low', 5, 'daily'),
    ...skills.slice(0, 3).map((skill, index) => task(
      `Study ${skill.name}`,
      'Learning',
      index === 0 ? 'high' : 'medium',
      skill.dailyMinutes,
      'none',
      `One focused block: a short explanation, then a small exercise. Priority follows your ${input.careerTarget} target.`
    )),
    task(`Start a small project for ${input.careerTarget}`, 'Project', 'high', 60, 'none', input.learningGoals)
  ];

  const goals = [
    { title: input.learningGoals, status: 'active' },
    { title: `Build toward ${input.careerTarget}`, status: 'active' }
  ];

  const notes = [
    'These amounts are planning targets for a general routine, not a medical assessment or a prescription.',
    'Keep hard exercise at or below the suggested minutes, and never above 45 minutes in this generated plan.',
    'If you are injured, pregnant, under a clinician’s care, or feel unwell, use a lighter day and ask a qualified professional before changing water, food, or exercise.'
  ];
  if (age < 18) notes.push('This plan stays light. A parent or clinician should review health targets for anyone under 18.');

  return {
    ...input,
    waterGlasses,
    exerciseMinutes,
    sleepHours,
    mobileLimitMinutes,
    preferredStudyStart: plusMinutes(input.wakeTime, 60),
    studyDays: [1, 2, 3, 4, 5, 6],
    restDays: [0],
    stack,
    skills,
    tasks,
    goals,
    habits,
    disclaimer: notes.join(' ')
  };
}

function task(title, category, priority, estimateMin, recurring, description = '') {
  return {
    title,
    description,
    category,
    priority,
    estimateMin,
    spentMin: 0,
    recurring,
    subtasks: [],
    notes: '',
    progress: 0,
    status: 'pending',
    source: 'routine'
  };
}

function plusMinutes(time, add) {
  const [hours, minutes] = time.split(':').map(Number);
  const total = Math.min(hours * 60 + minutes + add, 20 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function validTime(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
  if (!match) return '';
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return '';
  return `${match[1]}:${match[2]}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
