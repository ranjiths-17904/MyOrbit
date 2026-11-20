# AI Life Scheduler

Personal learning, tasks, health, fitness, and screen-time planner. The weekly timetable is generated from your goals and saved progress, and it stays a proposal until you approve it.

The site works in the browser with no server. MongoDB, email, and an AI API are optional and stay off until you fill them in.

Before sign-in the site is three pages: **Main**, **About**, and **Login**. That bar is gone after you sign in. The side menu is the app. Main plays a particle field in the browser, so you do not need a video file.

## Do this next

1. `cd frontend`, then `npm install`, then `npm run dev`. Open http://localhost:5173.
2. On **Login**, use **Open sample workspace** to look around, or **Create account** for an empty plan on this device.
3. Finish the welcome steps, then **Smart Scheduler → Generate this week → Approve**.
4. Add links only when you leave browser-only mode. The addresses and where each secret goes are in the tables below.
   - Database: [MongoDB Atlas](https://www.mongodb.com/atlas)
   - AI key: [Groq console](https://console.groq.com)
   - API host: [Render](https://dashboard.render.com/)
   - Site host: [Netlify](https://app.netlify.com/)
   - Optional mail: [Gmail app passwords](https://myaccount.google.com/apppasswords)
5. Copy `server/.env.example` to `server/.env`. Keep that file off GitHub. Set `VITE_API_URL` only when you build the site for Netlify.

## Start the website only

You need Node.js 20 or newer.

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

On the sign-in screen choose **Open sample workspace** to see the dashboard with sample data, or **Create account** for an empty plan stored in this browser. Sample numbers are not your real progress.

## Where each connection goes

| What | Where you put it | Leave it blank to |
| --- | --- | --- |
| MongoDB | `server/.env` → `MONGODB_URI` | Use browser storage only |
| JWT secret | `server/.env` → `JWT_SECRET` | Local development default |
| AI (Groq or local Ollama) | `server/.env` → `LLM_URL`, `LLM_KEY`, `LLM_MODEL` | Use the built-in rule-based planner |
| Email (SMTP) | `server/.env` → `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | Skip email |
| Phone webhook | `server/.env` → `SMS_WEBHOOK_URL` | Skip phone messages |
| Frontend API address | Netlify `VITE_API_URL`, or Settings → **API address** | Vite proxy to `http://localhost:8080` |

Copy the example for local development. The `.env` file is gitignored; never commit it.

```powershell
Copy-Item server\.env.example server\.env
```

### MongoDB on this PC

Install Docker, then from the project folder:

```powershell
docker compose up -d
```

The example `.env` uses this local MongoDB URI:

```text
MONGODB_URI=mongodb://127.0.0.1:27017/myorbit
```

### MongoDB Atlas free tier

1. Create a free cluster at https://www.mongodb.com/atlas
2. Database Access → create a dedicated database user with only `readWrite` access to the `myorbit` database. Do not use an Atlas administrator account for the app.
3. Network Access → allow the Render service's outbound IP addresses if available. If you must use `0.0.0.0/0` because Render's outbound IPs are not fixed for your plan, use a dedicated least-privilege database user and a strong unique password.
4. Connect → Drivers → copy the SRV string
5. Add `/myorbit` as the database path in the URI and replace the placeholders:

```text
mongodb+srv://<db_username>:<URL_ENCODED_PASSWORD>@<cluster-host>/myorbit?retryWrites=true&w=majority
```

If the password contains reserved URI characters, URL-encode them. Set this complete URI as `MONGODB_URI` in Render; do not put it in frontend variables or commit it to GitHub. Collections and indexes are created by the API.

### AI without a paid plan

Groq has a free key: https://console.groq.com

```text
LLM_URL=https://api.groq.com/openai/v1/chat/completions
LLM_KEY=<your-groq-api-key>
LLM_MODEL=llama-3.1-8b-instant
```

Or run Ollama locally and set:

```text
LLM_URL=http://localhost:11434/v1/chat/completions
LLM_KEY=ollama
LLM_MODEL=llama3.1
```

If those lines are empty, the assistant still answers from your saved skills, tasks, and hours.

### Email

Gmail: turn on 2-step verification, then create an App Password. Put the app password in `MAIL_PASSWORD`, not your normal Gmail password.

```text
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=you@gmail.com
MAIL_PASSWORD=<gmail-app-password>
MAIL_FROM=you@gmail.com
MAIL_STARTTLS=true
```

Then in the app: Settings → enable **Email when a week is approved**.

### Phone messages

Set `SMS_WEBHOOK_URL` in `server/.env` to any URL you control. When you approve a week, the API sends JSON `{ "text", "email", "phone" }`. A free provider such as CallMeBot can sit behind that URL. The app does not call WhatsApp by itself.

## Start the API

You need Node.js 20 or newer.

```powershell
cd server
npm install
npm run dev
```

API: http://localhost:8080  
Health: http://localhost:8080/api/health

Health JSON shows whether mail, AI, and the phone webhook are configured. It does not show secrets. For local development, set `MONGODB_URI` in `server/.env` if you are not using the default local MongoDB.

In the website, sign in and open **Settings → Connect server**. Leave the API address blank while `npm run dev` is running. The Vite dev server forwards `/api` to port 8080. Create the account again after connecting so the user is stored in MongoDB.

For a production build, set the API origin before building (for example in `frontend/.env`):

```powershell
cd frontend
Copy-Item .env.example .env
# Edit .env and set VITE_API_URL=https://your-render-service.onrender.com
npm run build
```

Static files are in `frontend/dist`.

## What to click first

1. Open http://localhost:5173 and create an account, or open the sample workspace.
2. If the account is empty, finish the welcome steps: wake time, study hours, career target, skills.
3. **Smart Scheduler** → generate a week → read it → **Approve**. Nothing replaces the live plan until you approve.
4. Mark blocks and tasks done on **Dashboard**, **Calendar**, or **Tasks**. Those marks are what next week’s plan uses.
5. Log water, sleep, and exercise on **Health & Fitness**. Log screen time on **Mobile Tracker**. The browser cannot read phone screen time.
6. **AI Assistant** uses saved data. With no LLM key it uses the local planner.
7. **Reports** builds the week from saved records. Download CSV or print to PDF from the browser.

## API

All routes except register, login, and health require `Authorization: Bearer <token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/password` | Change password |
| GET | `/api/health` | API and channel status |
| GET, PUT | `/api/profile` | Profile, goals, notification flags |
| GET, POST, PUT, DELETE | `/api/skills` | Skills |
| GET, POST, PUT, DELETE | `/api/tasks` | Tasks |
| GET, POST, PUT, DELETE | `/api/notes` | Notes |
| GET, POST, PUT, DELETE | `/api/blocks` | Calendar blocks |
| GET, POST | `/api/fitness` | Daily fitness log |
| GET, POST, DELETE | `/api/routines` | Fitness routines |
| GET, POST | `/api/mobile` | Manual screen-time log |
| GET, POST | `/api/notifications` | In-app reminders |
| POST | `/api/notifications/read` | Mark reminders read |
| POST | `/api/notifications/test` | Test enabled email or webhook |
| GET | `/api/scheduler/proposal` | Current proposed week |
| POST | `/api/scheduler/generate` | Build a new week from saved data |
| POST | `/api/scheduler/approve` | Make the proposal the active plan |
| POST | `/api/assistant` | AI or rule-based reply |
| POST | `/api/vault/import` | Replace workspace from export JSON |

## Deploy: Netlify frontend + Render API + MongoDB Atlas

The browser must call the public API URL, while MongoDB credentials and the JWT secret belong only in Render's environment settings.

### 1. Prepare MongoDB Atlas

1. In Atlas, rotate/revoke any database password that has been shared or exposed. Create a new dedicated database user with `readWrite` permission only on `myorbit`.
2. Add the API host's outbound IPs in Network Access where possible. If your Render plan does not provide fixed outbound IPs, `0.0.0.0/0` may be required; pair it with the restricted database user and a strong unique password.
3. Copy the cluster's SRV connection string and set its database path to `/myorbit`, for example `mongodb+srv://<db_username>:<URL_ENCODED_PASSWORD>@<cluster-host>/myorbit?retryWrites=true&w=majority`.

### 2. Deploy the API to Render

1. Push the project to GitHub and create a **Web Service** at [Render](https://dashboard.render.com/), connected to this repository.
2. Set **Root Directory** to `server`, **Build Command** to `npm ci`, and **Start Command** to `npm start`.
3. Add these environment variables in the Render service settings:
   - `MONGODB_URI` — the Atlas URI from step 1 (keep it secret).
   - `JWT_SECRET` — a long, random, unique secret. Generate one locally, for example with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
4. Deploy and open `https://<your-render-service>.onrender.com/api/health`. Confirm it responds with `"status":"ok"`.

### 3. Deploy the frontend to Netlify

1. Import the same GitHub repository at [Netlify](https://app.netlify.com/).
2. Set **Base directory** to `frontend`, **Build command** to `npm run build`, and **Publish directory** to `dist`.
3. Add the environment variable `VITE_API_URL` with the full Render origin, for example `https://your-render-service.onrender.com` (no `/api` suffix).
4. Deploy. The included `frontend/public/_redirects` file routes client-side pages back to `index.html`.
5. Add the Netlify site origin to Render's `FRONTEND_ORIGIN` (no trailing slash; add custom domain origins as comma-separated values if needed), then redeploy the API.

### 4. Verify the live app

1. Open the Netlify URL and create a new account. This saves the account through the API to Atlas; existing browser-only/sample data is not automatically migrated.
2. Sign out and sign back in to verify persistence, and check the API's `/api/health` URL again.
3. Keep `server/.env`, API keys, and all database credentials out of GitHub. If a credential was committed, rotate it; deleting it from the latest commit alone is not enough.

Useful links: [MongoDB Atlas](https://cloud.mongodb.com/), [Render Web Services guide](https://render.com/docs/web-services), [Netlify build configuration](https://docs.netlify.com/configure-builds/overview/), and [MongoDB Atlas IP access list](https://www.mongodb.com/docs/atlas/security/ip-access-list/).
