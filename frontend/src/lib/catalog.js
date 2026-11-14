export const SKILL_CATEGORIES = [
  {
    name: 'Programming',
    skills: ['Java', 'Python', 'JavaScript', 'SQL', 'Data Structures and Algorithms']
  },
  {
    name: 'Full Stack Development',
    skills: ['HTML', 'CSS', 'React.js', 'Node.js', 'Spring Boot', 'MongoDB', 'REST APIs']
  },
  {
    name: 'Emerging Technologies',
    skills: ['Artificial Intelligence', 'Generative AI', 'LLM Integration', 'Prompt Engineering', 'AI Automation', 'Cloud Computing', 'DevOps']
  },
  {
    name: 'Career Preparation',
    skills: ['Technical Interview Preparation', 'Aptitude', 'Communication', 'English Speaking', 'Resume and Portfolio']
  }
];

export const LEVELS = ['beginner', 'basic', 'intermediate', 'advanced', 'expert'];

export const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export const NOTE_TYPES = [
  { id: 'daily', label: 'Daily note' },
  { id: 'learning', label: 'Learning' },
  { id: 'coding', label: 'Coding problem' },
  { id: 'interview', label: 'Interview question' },
  { id: 'idea', label: 'Project idea' },
  { id: 'reflection', label: 'Reflection' },
  { id: 'task', label: 'Task note' }
];

export const TASK_CATEGORIES = ['Learning', 'Coding', 'Project', 'Health', 'Personal', 'Career', 'Review'];

export function levelProgress(current, target) {
  const order = LEVELS;
  const c = Math.max(0, order.indexOf(current));
  const t = Math.max(c + 1, order.indexOf(target));
  return Math.round((c / t) * 100);
}
