import { addDays, todayISO, uid } from '../lib/dates.js';
import { generateWeekPlan } from '../lib/scheduler.js';

export function buildDemoVault() {
  const today = todayISO();
  const profile = {
    name: 'Developer',
    email: 'demo@myorbit.app',
    careerTarget: 'Software developer fresher',
    wakeTime: '06:00',
    sleepTime: '23:00',
    studyHoursPerDay: 6,
    studyDays: [1, 2, 3, 4, 5, 6],
    preferredStudyStart: '07:30',
    planStart: addDays(today, -14),
    onboarded: true,
    familyBlocks: [{ id: uid(), days: [1, 2, 3, 4, 5], start: '12:40', end: '13:40', title: 'Family time' }],
    fitness: { exerciseMinutes: 30, waterGlasses: 8, sleepHours: 7, restDays: [0] },
    mobileLimitMinutes: 120,
    notifications: { web: false, email: false, sms: false },
    demo: true,
    goals: []
  };
  const skills = [
    skill('Java', 'Programming', 'advanced', 'expert', 'high', 60),
    skill('React.js', 'Full Stack Development', 'intermediate', 'advanced', 'high', 45),
    skill('SQL', 'Programming', 'intermediate', 'advanced', 'high', 40),
    skill('Python', 'Programming', 'intermediate', 'advanced', 'medium', 30),
    skill('English Speaking', 'Career Preparation', 'basic', 'advanced', 'medium', 30)
  ];
  const plan = generateWeekPlan({ profile, skills, tasks: [], weekStart: today });
  const blocks = plan.blocks.map((block) => ({ ...block }));
  const tasks = plan.createdTasks.map((task) => ({ ...task }));
  let logged = 0;
  blocks
    .filter((block) => block.date === today && ['theory', 'coding', 'practice', 'project', 'revision'].includes(block.type))
    .forEach((block) => {
      const length = minutesBetween(block);
      if (logged >= 270) return;
      block.status = 'completed';
      block.actualMin = length;
      logged += length;
      const task = tasks.find((item) => item.id === block.taskId);
      if (task) {
        task.status = 'completed';
        task.progress = 100;
        task.spentMin = length;
        task.completedAt = new Date().toISOString();
      }
    });
  for (let i = 1; i <= 11; i += 1) {
    const date = addDays(today, -i);
    const existing = blocks.find((block) => block.date === date && block.type === 'practice');
    if (existing) {
      existing.status = 'completed';
      existing.actualMin = minutesBetween(existing);
    } else {
      blocks.push({
        id: uid(),
        date,
        start: '07:30',
        end: '08:20',
        title: 'Saved practice session',
        type: 'practice',
        difficulty: 'medium',
        status: 'completed',
        actualMin: 50,
        source: 'scheduler'
      });
    }
  }
  const quick = [
    ['Complete Java practice', 'Learning', 'high', true],
    ['Drink 2 glasses of water', 'Health', 'low', true],
    ['Read React documentation', 'Learning', 'medium', false],
    ['Write daily notes', 'Learning', 'low', false],
    ['Go for a walk', 'Health', 'medium', false]
  ];
  quick.forEach(([title, category, priority, done]) => {
    tasks.push({
      id: uid(),
      title,
      description: 'Sample task in the demo workspace.',
      category,
      priority,
      startDate: today,
      dueDate: today,
      estimateMin: 30,
      spentMin: done ? 30 : 0,
      recurring: 'none',
      subtasks: [],
      notes: '',
      progress: done ? 100 : 0,
      status: done ? 'completed' : 'pending',
      source: 'manual',
      completedAt: done ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });
  profile.goals = [
    { id: uid(), title: 'Complete React practice', targetDate: addDays(today, 7), status: 'active' },
    { id: uid(), title: 'Build a full stack project', targetDate: addDays(today, 12), status: 'active' },
    { id: uid(), title: 'Improve English fluency', targetDate: addDays(today, 17), status: 'active' }
  ];
  return {
    profile,
    skills,
    tasks,
    notes: [
      {
        id: uid(),
        type: 'learning',
        title: 'SQL joins',
        body: 'Inner join keeps matching rows. Left join keeps every row from the first table.',
        taskId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    blocks,
    proposal: null,
    fitness: [
      {
        date: today,
        waterGlasses: 6,
        sleepHours: 7,
        wakeTime: '06:00',
        exerciseMin: 30,
        walkMin: 20,
        runMin: 0,
        pushUps: 15,
        weightKg: '',
        restDay: false,
        note: 'Short mobility and a walk.',
        exercises: [{ name: 'Push-ups', reps: 15, minutes: 10 }]
      }
    ],
    routines: [
      { id: uid(), name: 'Morning mobility', minutes: 30, exercises: ['Easy walk', 'Mobility', 'Push-ups'] }
    ],
    mobile: [{ date: today, totalMin: 110, socialMin: 40, entertainmentMin: 25, productiveMin: 45, note: 'Entered manually' }],
    notifications: [],
    goals: [
      { id: uid(), title: 'Complete React practice', targetDate: addDays(today, 7), status: 'active' },
      { id: uid(), title: 'Build a full stack project', targetDate: addDays(today, 12), status: 'active' },
      { id: uid(), title: 'Improve English fluency', targetDate: addDays(today, 17), status: 'active' }
    ],
    reports: [],
    lastReview: null,
    demo: true
  };
}

function skill(name, category, currentLevel, targetLevel, priority, dailyMinutes) {
  return {
    id: uid(),
    name,
    category,
    currentLevel,
    targetLevel,
    priority,
    targetDate: addDays(todayISO(), 45),
    dailyMinutes,
    resources: [],
    notes: '',
    practiceTasks: [],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function minutesBetween(block) {
  const [sh, sm] = block.start.split(':').map(Number);
  const [eh, em] = block.end.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export function emptyVault(profile) {
  return {
    profile,
    skills: [],
    tasks: [],
    notes: [],
    blocks: [],
    proposal: null,
    fitness: [],
    routines: [],
    mobile: [],
    notifications: [],
    goals: [],
    reports: [],
    lastReview: null,
    demo: false
  };
}
