import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, setApiBase } from '../api.js';
import { buildDemoVault, emptyVault } from '../data/demo.js';
import { nowIso, todayISO, uid } from '../lib/dates.js';
import { evaluateWeek, findOverlap, generateWeekPlan, rescheduleMissed } from '../lib/scheduler.js';

const KEY = 'myorbit-db-v1';
const StoreContext = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* keep a clean database if storage is unreadable */
  }
  return { users: [], sessionUserId: null, token: null, useApi: false, theme: 'dark', vaults: {} };
}

async function hashPassword(email, password) {
  const data = new TextEncoder().encode(`myorbit|${email.trim().toLowerCase()}|${password}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function StoreProvider({ children }) {
  const [db, setDb] = useState(load);
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const dbRef = useRef(db);
  dbRef.current = db;

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(db));
    document.documentElement.dataset.theme = db.theme || 'dark';
  }, [db]);

  const toast = (message, type = 'ok') => {
    const id = uid();
    setToasts((list) => [...list, { id, message, type }]);
    setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), 3200);
  };

  const confirm = (opts) =>
    new Promise((resolve) => {
      setConfirmState({ ...opts, resolve });
    });

  const vault = db.sessionUserId ? db.vaults[db.sessionUserId] : null;

  const commit = (recipe) => {
    setDb((current) => recipe(current));
  };

  const patchVault = (recipe) => {
    commit((current) => {
      const id = current.sessionUserId;
      if (!id || !current.vaults[id]) return current;
      return { ...current, vaults: { ...current.vaults, [id]: recipe(current.vaults[id]) } };
    });
  };

  const loginLocal = async (email, password) => {
    const hash = await hashPassword(email, password);
    const user = dbRef.current.users.find((item) => item.email === email.trim().toLowerCase() && item.passwordHash === hash);
    if (!user) throw new Error('Email or password does not match.');
    commit((current) => ({ ...current, sessionUserId: user.id, token: null }));
  };

  const registerLocal = async ({ name, email, password, careerTarget }) => {
    const normalized = email.trim().toLowerCase();
    if (dbRef.current.users.some((item) => item.email === normalized)) throw new Error('An account with that email already exists on this browser.');
    const user = { id: uid(), name: name.trim(), email: normalized, passwordHash: await hashPassword(normalized, password) };
    const profile = {
      name: user.name,
      email: user.email,
      careerTarget: careerTarget || '',
      wakeTime: '06:00',
      sleepTime: '23:00',
      studyHoursPerDay: 4,
      studyDays: [1, 2, 3, 4, 5, 6],
      preferredStudyStart: '07:30',
      planStart: todayISO(),
      onboarded: false,
      familyBlocks: [],
      fitness: { exerciseMinutes: 30, waterGlasses: 8, sleepHours: 7, restDays: [0] },
      mobileLimitMinutes: 120,
      notifications: { web: false, email: false, sms: false },
      demo: false
    };
    commit((current) => ({
      ...current,
      users: [...current.users, user],
      sessionUserId: user.id,
      token: null,
      vaults: { ...current.vaults, [user.id]: emptyVault(profile) }
    }));
  };

  const enterDemo = async () => {
    const email = 'demo@myorbit.app';
    let user = dbRef.current.users.find((item) => item.email === email);
    const passwordHash = user?.passwordHash || (await hashPassword(email, 'demo1234'));
    if (!user) user = { id: uid(), name: 'Developer', email, passwordHash };
    const vaultData = buildDemoVault();
    commit((current) => ({
      ...current,
      users: current.users.some((item) => item.email === email) ? current.users : [...current.users, user],
      sessionUserId: user.id,
      token: null,
      useApi: false,
      vaults: { ...current.vaults, [user.id]: vaultData }
    }));
    toast('Demo workspace loaded. These numbers are sample data.');
  };

  const logout = () => commit((current) => ({ ...current, sessionUserId: null, token: null }));

  const hydrate = async (token, user) => {
    const [profile, skills, tasks, notes, blocks, fitness, routines, mobile, notifications, proposal] = await Promise.all([
      api('/api/profile', { token }),
      api('/api/skills', { token }),
      api('/api/tasks', { token }),
      api('/api/notes', { token }),
      api('/api/blocks', { token }),
      api('/api/fitness', { token }),
      api('/api/routines', { token }),
      api('/api/mobile', { token }),
      api('/api/notifications', { token }),
      api('/api/scheduler/proposal', { token })
    ]);
    const vaultData = {
      profile: { ...profile, email: user.email, name: profile.name || user.name },
      skills,
      tasks,
      notes,
      blocks,
      proposal: proposal?.blocks ? proposal : null,
      fitness,
      routines,
      mobile,
      notifications,
      goals: profile.goals || [],
      reports: profile.reports || [],
      lastReview: profile.lastReview || null,
      demo: false
    };
    commit((current) => ({
      ...current,
      useApi: true,
      token,
      sessionUserId: user.id,
      vaults: { ...current.vaults, [user.id]: vaultData }
    }));
  };

  const login = async (email, password) => {
    if (!dbRef.current.useApi) return loginLocal(email, password);
    const result = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    await hydrate(result.token, result.user);
  };

  const register = async (form) => {
    if (!dbRef.current.useApi) return registerLocal(form);
    const result = await api('/api/auth/register', { method: 'POST', body: form });
    await hydrate(result.token, result.user);
  };

  const remote = async (path, options, apply) => {
    const token = dbRef.current.token;
    const saved = await api(path, { ...options, token });
    apply(saved);
    return saved;
  };

  const updateProfile = async (profile) => {
    if (dbRef.current.useApi) {
      const saved = await api('/api/profile', { method: 'PUT', token: dbRef.current.token, body: profile });
      patchVault((current) => ({ ...current, profile: { ...current.profile, ...saved } }));
      return;
    }
    patchVault((current) => ({ ...current, profile: { ...current.profile, ...profile } }));
  };

  const addSkill = async (skill) => saveItem('/api/skills', 'skills', { ...skill, id: uid(), status: 'active', resources: skill.resources || [], practiceTasks: skill.practiceTasks || [], createdAt: nowIso(), updatedAt: nowIso() });
  const updateSkill = async (skill) => saveItem(`/api/skills/${skill.id}`, 'skills', { ...skill, updatedAt: nowIso() }, 'PUT');
  const deleteSkill = async (id) => removeItem(`/api/skills/${id}`, 'skills', id);

  const addTask = async (task) => saveItem('/api/tasks', 'tasks', { subtasks: [], progress: 0, status: 'pending', spentMin: 0, source: 'manual', recurring: 'none', ...task, id: task.id || uid(), createdAt: nowIso(), updatedAt: nowIso() });
  const updateTask = async (task) => saveItem(`/api/tasks/${task.id}`, 'tasks', { ...task, updatedAt: nowIso() }, 'PUT');
  const deleteTask = async (id) => removeItem(`/api/tasks/${id}`, 'tasks', id);

  const toggleTask = async (task) => {
    const done = task.status !== 'completed';
    const next = {
      ...task,
      status: done ? 'completed' : 'pending',
      progress: done ? 100 : 0,
      completedAt: done ? nowIso() : null,
      updatedAt: nowIso()
    };
    await updateTask(next);
    if (task.blockId) {
      const block = dbRef.current.vaults[dbRef.current.sessionUserId]?.blocks.find((item) => item.id === task.blockId);
      if (block) await updateBlock({ ...block, status: done ? 'completed' : 'planned', actualMin: done ? block.actualMin || undefined : 0 });
    }
    if (done && task.recurring && task.recurring !== 'none') {
      const due = new Date(`${task.dueDate || todayISO()}T12:00:00`);
      due.setDate(due.getDate() + (task.recurring === 'daily' ? 1 : 7));
      const iso = due.toISOString().slice(0, 10);
      await addTask({ ...task, id: uid(), status: 'pending', progress: 0, spentMin: 0, completedAt: null, dueDate: iso, startDate: iso, source: 'manual' });
    }
  };

  const addNote = async (note) => saveItem('/api/notes', 'notes', { ...note, id: uid(), createdAt: nowIso(), updatedAt: nowIso() });
  const updateNote = async (note) => saveItem(`/api/notes/${note.id}`, 'notes', { ...note, updatedAt: nowIso() }, 'PUT');
  const deleteNote = async (id) => removeItem(`/api/notes/${id}`, 'notes', id);

  const addBlock = async (block) => {
    const existing = dbRef.current.vaults[dbRef.current.sessionUserId]?.blocks || [];
    if (findOverlap([...existing, block])) throw new Error('That time overlaps another block.');
    return saveItem('/api/blocks', 'blocks', { ...block, id: block.id || uid(), status: block.status || 'planned', source: block.source || 'manual' });
  };
  const updateBlock = async (block) => {
    const existing = dbRef.current.vaults[dbRef.current.sessionUserId]?.blocks || [];
    if (findOverlap(existing.map((item) => (item.id === block.id ? block : item)))) throw new Error('That change overlaps another block.');
    return saveItem(`/api/blocks/${block.id}`, 'blocks', block, 'PUT');
  };
  const deleteBlock = async (id) => removeItem(`/api/blocks/${id}`, 'blocks', id);

  async function saveItem(path, key, item, method) {
    const verb = method || 'POST';
    if (dbRef.current.useApi) {
      const saved = await api(path, { method: verb, token: dbRef.current.token, body: item });
      patchVault((current) => ({
        ...current,
        [key]: verb === 'POST' ? [...current[key], saved] : current[key].map((row) => (row.id === saved.id ? saved : row))
      }));
      return saved;
    }
    patchVault((current) => ({
      ...current,
      [key]: verb === 'POST' ? [...current[key], item] : current[key].map((row) => (row.id === item.id ? item : row))
    }));
    return item;
  }

  async function removeItem(path, key, id) {
    if (dbRef.current.useApi) await api(path, { method: 'DELETE', token: dbRef.current.token });
    patchVault((current) => ({ ...current, [key]: current[key].filter((row) => row.id !== id) }));
  }

  const saveFitness = async (record) => {
    if (dbRef.current.useApi) {
      const saved = await api('/api/fitness', { method: 'POST', token: dbRef.current.token, body: record });
      patchVault((current) => ({ ...current, fitness: upsertDate(current.fitness, saved) }));
      return;
    }
    patchVault((current) => ({ ...current, fitness: upsertDate(current.fitness, record) }));
  };

  const saveMobile = async (record) => {
    if (dbRef.current.useApi) {
      const saved = await api('/api/mobile', { method: 'POST', token: dbRef.current.token, body: record });
      patchVault((current) => ({ ...current, mobile: upsertDate(current.mobile, saved) }));
      return;
    }
    patchVault((current) => ({ ...current, mobile: upsertDate(current.mobile, record) }));
  };

  const addRoutine = async (routine) => saveItem('/api/routines', 'routines', { ...routine, id: uid() });
  const deleteRoutine = async (id) => removeItem(`/api/routines/${id}`, 'routines', id);

  const proposeWeek = async (weekStart) => {
    const current = dbRef.current.vaults[dbRef.current.sessionUserId];
    const review = current.lastReview;
    let proposal = generateWeekPlan({
      profile: current.profile,
      skills: current.skills,
      tasks: current.tasks,
      weekStart,
      modifiers: review?.modifiers || {},
      previousBlocks: current.blocks
    });
    proposal.review = evaluateWeek({ ...current, weekStart });
    if (dbRef.current.useApi) {
      proposal = await api('/api/scheduler/generate', { method: 'POST', token: dbRef.current.token, body: proposal });
    }
    patchVault((vaultData) => ({ ...vaultData, proposal }));
    return proposal;
  };

  const approveProposal = async () => {
    const current = dbRef.current.vaults[dbRef.current.sessionUserId];
    if (!current?.proposal) return;
    if (dbRef.current.useApi) {
      const saved = await api('/api/scheduler/approve', { method: 'POST', token: dbRef.current.token, body: current.proposal });
      patchVault((vaultData) => ({
        ...vaultData,
        blocks: saved.blocks,
        tasks: saved.tasks,
        proposal: null,
        reports: saved.reports || vaultData.reports,
        lastReview: saved.lastReview || vaultData.lastReview,
        profile: {
          ...vaultData.profile,
          reports: saved.reports || vaultData.profile.reports || [],
          lastReview: saved.lastReview || vaultData.profile.lastReview || null
        }
      }));
      return;
    }
    const dates = new Set(current.proposal.blocks.map((block) => block.date));
    const kept = current.blocks.filter((block) => !dates.has(block.date) || block.status === 'completed');
    const report = {
      id: uid(),
      savedAt: nowIso(),
      ...(current.proposal.review || {}),
      rationale: current.proposal.rationale
    };
    patchVault((vaultData) => ({
      ...vaultData,
      blocks: [...kept, ...current.proposal.blocks],
      tasks: [...vaultData.tasks, ...current.proposal.createdTasks.filter((task) => !vaultData.tasks.some((item) => item.id === task.id))],
      proposal: null,
      reports: [...vaultData.reports, report],
      lastReview: current.proposal.review || vaultData.lastReview,
      profile: {
        ...vaultData.profile,
        reports: [...(vaultData.profile.reports || []), report],
        lastReview: current.proposal.review || vaultData.profile.lastReview || null
      }
    }));
  };

  const discardProposal = () => patchVault((current) => ({ ...current, proposal: null }));

  const updateProposalBlock = (block) => {
    patchVault((current) => {
      const blocks = current.proposal.blocks.map((item) => (item.id === block.id ? block : item));
      if (findOverlap(blocks)) return current;
      return { ...current, proposal: { ...current.proposal, blocks } };
    });
  };

  const reschedule = () => {
    const current = dbRef.current.vaults[dbRef.current.sessionUserId];
    const result = rescheduleMissed(current.blocks, current.profile, todayISO());
    patchVault((vaultData) => ({ ...vaultData, blocks: result.blocks }));
    return result.notes;
  };

  const markMissedPast = () => {
    const today = todayISO();
    patchVault((current) => ({
      ...current,
      blocks: current.blocks.map((block) => (block.date < today && block.status === 'planned' && block.type !== 'personal' && block.type !== 'break' ? { ...block, status: 'missed' } : block))
    }));
  };

  const pushNotification = async (item) => {
    const current = dbRef.current.vaults[dbRef.current.sessionUserId];
    if (!current || current.notifications.some((note) => note.key === item.key)) return;
    const note = { id: uid(), read: false, createdAt: nowIso(), ...item };
    if (dbRef.current.useApi) {
      try {
        const saved = await api('/api/notifications', { method: 'POST', token: dbRef.current.token, body: note });
        patchVault((vaultData) => ({ ...vaultData, notifications: [saved, ...vaultData.notifications].slice(0, 40) }));
        return;
      } catch {
        /* show it locally if the server is briefly unavailable */
      }
    }
    patchVault((vaultData) => ({ ...vaultData, notifications: [note, ...vaultData.notifications].slice(0, 40) }));
  };

  const markAllRead = async () => {
    if (dbRef.current.useApi) await api('/api/notifications/read', { method: 'POST', token: dbRef.current.token });
    patchVault((current) => ({ ...current, notifications: current.notifications.map((item) => ({ ...item, read: true })) }));
  };

  const setTheme = (theme) => commit((current) => ({ ...current, theme }));

  const connectServer = async (base) => {
    setApiBase(base);
    await api('/api/health');
    commit((current) => ({ ...current, useApi: true, sessionUserId: null, token: null }));
    toast('Server is reachable. Sign in with your server account.');
  };

  const useBrowserOnly = () => {
    commit((current) => ({ ...current, useApi: false, token: null, sessionUserId: null }));
    toast('Switched to this browser. Data stays on this device until you connect a server.');
  };

  const exportVault = () => vault;

  const importVault = async (data) => {
    const clean = { ...data, demo: false };
    if (dbRef.current.useApi) {
      await api('/api/vault/import', { method: 'POST', token: dbRef.current.token, body: clean });
      const profile = dbRef.current.vaults[dbRef.current.sessionUserId]?.profile;
      await hydrate(dbRef.current.token, {
        id: dbRef.current.sessionUserId,
        email: profile?.email,
        name: profile?.name
      });
      return;
    }
    patchVault(() => ({ ...emptyVault(vault.profile), ...clean }));
  };

  const value = useMemo(() => ({
    db, vault, toasts, confirmState, setConfirmState, toast, confirm,
    login, register, enterDemo, logout, updateProfile,
    addSkill, updateSkill, deleteSkill,
    addTask, updateTask, deleteTask, toggleTask,
    addNote, updateNote, deleteNote,
    addBlock, updateBlock, deleteBlock,
    saveFitness, saveMobile, addRoutine, deleteRoutine,
    proposeWeek, approveProposal, discardProposal, updateProposalBlock, reschedule, markMissedPast,
    pushNotification, markAllRead, setTheme, connectServer, useBrowserOnly, exportVault, importVault, remote
  }), [db, vault, toasts, confirmState]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function upsertDate(list, record) {
  const rest = (list || []).filter((item) => item.date !== record.date);
  return [...rest, record].sort((a, b) => a.date.localeCompare(b.date));
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('Store missing');
  return value;
}
