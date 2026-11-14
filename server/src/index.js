import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { connect } from './db.js';
import { router } from './routes.js';

const app = express();
const origins = config.frontendOrigin
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json({ limit: '4mb' }));
app.use('/api', router);
app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  const message = error.expose ? error.message : 'Something went wrong. Check that MongoDB is running.';
  res.status(status).json({ message });
});

const db = await connect();
console.log(`MongoDB connected: ${db.databaseName}`);
app.listen(config.port, () => {
  console.log(`MyOrbit API listening on http://localhost:${config.port}`);
});
