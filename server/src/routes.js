import { Router } from 'express';
import { reply } from './assistant.js';
import { changePassword, login, readToken, register } from './auth.js';
import { config } from './config.js';
import { COLLECTIONS, getDb } from './db.js';
import { ApiError, requireText, text } from './errors.js';
import { sendTest } from './notify.js';
import { approve, assertBlockFits, generate, getProposal } from './planner.js';
import { getProfile, importVault, saveProfile } from './profile.js';
import { create, deleteResources, list, remove, replace, syncResources, upsertByDate } from './records.js';

export const router = Router();

router.get('/health', async (_req, res, next) => {
  try {
    await getDb().command({ ping: 1 });
    res.json({
      status: 'ok',
      stack: 'mern',
      mailConfigured: config.mailConfigured(),
      llmConfigured: config.llmConfigured(),
      smsConfigured: config.smsConfigured()
    });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/register', async (req, res, next) => {
  try {
    res.status(201).json(await register(req.body || {}));
  } catch (error) {
    next(error);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    res.json(await login(req.body || {}));
  } catch (error) {
    next(error);
  }
});

router.use((req, res, next) => {
  try {
    req.userId = readToken(req.headers.authorization);
    next();
  } catch (error) {
    next(error);
  }
});

router.post('/auth/password', async (req, res, next) => {
  try {
    requireText(req.body, 'currentPassword');
    requireText(req.body, 'newPassword');
    await changePassword(req.userId, req.body.currentPassword, req.body.newPassword);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get('/profile', async (req, res, next) => {
  try {
    res.json(await getProfile(req.userId));
  } catch (error) {
    next(error);
  }
});

router.put('/profile', async (req, res, next) => {
  try {
    res.json(await saveProfile(req.userId, req.body || {}));
  } catch (error) {
    next(error);
  }
});

router.get('/skills', crudList(COLLECTIONS.SKILLS));
router.post('/skills', async (req, res, next) => {
  try {
    requireText(req.body, 'name');
    const saved = await create(req.userId, COLLECTIONS.SKILLS, req.body);
    await syncResources(req.userId, text(saved.id), text(saved.name), saved.resources);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});
router.put('/skills/:id', async (req, res, next) => {
  try {
    requireText(req.body, 'name');
    const saved = await replace(req.userId, COLLECTIONS.SKILLS, req.params.id, req.body);
    await syncResources(req.userId, req.params.id, text(saved.name), saved.resources);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});
router.delete('/skills/:id', async (req, res, next) => {
  try {
    await remove(req.userId, COLLECTIONS.SKILLS, req.params.id);
    await deleteResources(req.userId, req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get('/tasks', crudList(COLLECTIONS.TASKS));
router.post('/tasks', crudCreate(COLLECTIONS.TASKS, 'title'));
router.put('/tasks/:id', crudReplace(COLLECTIONS.TASKS, 'title'));
router.delete('/tasks/:id', crudDelete(COLLECTIONS.TASKS));

router.get('/notes', crudList(COLLECTIONS.NOTES));
router.post('/notes', async (req, res, next) => {
  try {
    assertNote(req.body);
    res.status(201).json(await create(req.userId, COLLECTIONS.NOTES, req.body));
  } catch (error) {
    next(error);
  }
});
router.put('/notes/:id', async (req, res, next) => {
  try {
    assertNote(req.body);
    res.json(await replace(req.userId, COLLECTIONS.NOTES, req.params.id, req.body));
  } catch (error) {
    next(error);
  }
});
router.delete('/notes/:id', crudDelete(COLLECTIONS.NOTES));

router.get('/blocks', crudList(COLLECTIONS.SCHEDULES));
router.post('/blocks', async (req, res, next) => {
  try {
    requireText(req.body, 'title');
    await assertBlockFits(req.userId, req.body);
    res.status(201).json(await create(req.userId, COLLECTIONS.SCHEDULES, req.body));
  } catch (error) {
    next(error);
  }
});
router.put('/blocks/:id', async (req, res, next) => {
  try {
    requireText(req.body, 'title');
    const body = { ...req.body, id: req.params.id };
    await assertBlockFits(req.userId, body);
    res.json(await replace(req.userId, COLLECTIONS.SCHEDULES, req.params.id, body));
  } catch (error) {
    next(error);
  }
});
router.delete('/blocks/:id', crudDelete(COLLECTIONS.SCHEDULES));

router.get('/fitness', crudList(COLLECTIONS.FITNESS));
router.post('/fitness', dated(COLLECTIONS.FITNESS));
router.get('/routines', crudList(COLLECTIONS.HABITS));
router.post('/routines', crudCreate(COLLECTIONS.HABITS, 'name'));
router.delete('/routines/:id', crudDelete(COLLECTIONS.HABITS));
router.get('/mobile', crudList(COLLECTIONS.MOBILE));
router.post('/mobile', dated(COLLECTIONS.MOBILE));

router.get('/notifications', async (req, res, next) => {
  try {
    const items = await list(req.userId, COLLECTIONS.NOTIFICATIONS);
    items.sort((a, b) => text(b.createdAt).localeCompare(text(a.createdAt)));
    res.json(items.slice(0, 40));
  } catch (error) {
    next(error);
  }
});
router.post('/notifications', crudCreate(COLLECTIONS.NOTIFICATIONS, 'title'));
router.post('/notifications/read', async (req, res, next) => {
  try {
    const items = await list(req.userId, COLLECTIONS.NOTIFICATIONS);
    for (const item of items) {
      await replace(req.userId, COLLECTIONS.NOTIFICATIONS, item.id, { ...item, read: true });
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
router.post('/notifications/test', async (req, res, next) => {
  try {
    await sendTest(req.userId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get('/scheduler/proposal', async (req, res, next) => {
  try {
    res.json(await getProposal(req.userId));
  } catch (error) {
    next(error);
  }
});
router.post('/scheduler/generate', async (req, res, next) => {
  try {
    res.json(await generate(req.userId, req.body || {}));
  } catch (error) {
    next(error);
  }
});
router.post('/scheduler/approve', async (req, res, next) => {
  try {
    res.json(await approve(req.userId, req.body || {}));
  } catch (error) {
    next(error);
  }
});
router.post('/assistant', async (req, res, next) => {
  try {
    const message = text(req.body?.message);
    if (!message) throw new ApiError(400, 'message is required.');
    if (message.length > 4000) throw new ApiError(400, 'Keep the message under 4000 characters.');
    res.json(await reply(req.userId, message));
  } catch (error) {
    next(error);
  }
});
router.post('/vault/import', async (req, res, next) => {
  try {
    await importVault(req.userId, req.body || {});
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

function crudList(collection) {
  return async (req, res, next) => {
    try {
      res.json(await list(req.userId, collection));
    } catch (error) {
      next(error);
    }
  };
}

function crudCreate(collection, field) {
  return async (req, res, next) => {
    try {
      requireText(req.body, field);
      res.status(201).json(await create(req.userId, collection, req.body));
    } catch (error) {
      next(error);
    }
  };
}

function crudReplace(collection, field) {
  return async (req, res, next) => {
    try {
      requireText(req.body, field);
      res.json(await replace(req.userId, collection, req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  };
}

function crudDelete(collection) {
  return async (req, res, next) => {
    try {
      await remove(req.userId, collection, req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}

function dated(collection) {
  return async (req, res, next) => {
    try {
      res.json(await upsertByDate(req.userId, collection, req.body || {}));
    } catch (error) {
      next(error);
    }
  };
}

function assertNote(body) {
  if (!text(body?.title) && !text(body?.body)) throw new ApiError(400, 'Write a title or a note.');
}
