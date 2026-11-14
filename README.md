# AI Life Scheduler

Personal learning, tasks, health, fitness, and screen-time planner. The weekly timetable is generated from your goals and saved progress, and it stays a proposal until you approve it.

The site works in the browser with no server. MongoDB, email, and an AI API are optional and stay off until you fill them in.

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
| MongoDB | `backend/application-local.yml` → `spring.data.mongodb.uri` | Use browser storage only |
| JWT secret | same file → `app.jwt-secret` | Local dev secret in `application.yml` |
| AI (free Groq or local Ollama) | same file → `app.llm-url`, `app.llm-key`, `app.llm-model` | Use the built-in rule-based planner |
| Email (SMTP) | same file → `app.mail-host`, `mail-username`, `mail-password`, `mail-from` | Skip email |
| WhatsApp or SMS | same file → `app.sms-webhook-url` | Skip phone messages |
| Frontend API address | Settings → **API address**, or `frontend/.env` `VITE_API_URL` | Vite proxy to `http://localhost:8080` |

Copy the example, then edit the copy. The copy is gitignored.

```powershell
cd backend
copy application-local.yml.example application-local.yml
```

### MongoDB on this PC

Install Docker, then from the project folder:

```powershell
docker compose up -d
```

In `backend/application-local.yml`:

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/myorbit
```

### MongoDB Atlas free tier

1. Create a free cluster at https://www.mongodb.com/atlas
2. Database Access → add a database user
3. Network Access → add your IP, or `0.0.0.0/0` only while testing
4. Connect → Drivers → copy the SRV string
5. Paste it in `backend/application-local.yml` and replace `<password>`:

```yaml
spring:
  data:
    mongodb:
      uri: mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/myorbit?retryWrites=true&w=majority
```

The database name in that string is `myorbit`. Collections are created when you register and save data.

### AI without a paid plan

Groq has a free key: https://console.groq.com

```yaml
app:
  llm-url: https://api.groq.com/openai/v1/chat/completions
  llm-key: gsk_your_key
  llm-model: llama-3.1-8b-instant
```

Or run Ollama locally and set:

```yaml
app:
  llm-url: http://localhost:11434/v1/chat/completions
  llm-key: ollama
  llm-model: llama3.1
```

If those lines are empty, the assistant still answers from your saved skills, tasks, and hours.

### Email

Gmail: turn on 2-step verification, then create an App Password. Put the app password in `mail-password`, not your normal Gmail password.

```yaml
app:
  mail-host: smtp.gmail.com
  mail-port: 587
  mail-username: you@gmail.com
  mail-password: the-app-password
  mail-from: you@gmail.com
  mail-start-tls: true
```

Then in the app: Settings → enable **Email when a week is approved**.

### Phone messages

Set `sms-webhook-url` to any URL you control. When you approve a week, the API sends JSON `{ "text", "email", "phone" }`. A free provider such as CallMeBot can sit behind that URL. The app does not call WhatsApp by itself.

## Start the API

You need Java 17 and Maven.

```powershell
cd backend
mvn spring-boot:run
```

API: http://localhost:8080  
Health: http://localhost:8080/api/health

Health JSON shows whether mail, AI, and the phone webhook are configured. It does not show secrets.

In the website, sign in and open **Settings → Connect server**. Leave the API address blank while `npm run dev` is running. The Vite dev server forwards `/api` to port 8080. Create the account again after connecting so the user is stored in MongoDB.

For a production build, set the API origin before building:

```powershell
cd frontend
# frontend/.env
# VITE_API_URL=https://your-api.example.com
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

## Deploy without a paid host requirement

- Frontend: any static host (GitHub Pages, Cloudflare Pages, Netlify). Set `VITE_API_URL` to the API origin.
- API: a free Java host that can run Spring Boot, or your own PC.
- Database: MongoDB Atlas free cluster, using the URI above.
- Keep `application-local.yml` and API keys off GitHub. `.gitignore` already excludes that file.
