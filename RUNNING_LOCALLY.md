# Running Toto Locally

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org (choose LTS) |
| npm | comes with Node | — |
| PostgreSQL | 16+ | see step 2 below |

---

## Step 1 — Install Node.js

Download and run the LTS installer from https://nodejs.org.
After install, verify in a new terminal:

```
node --version
npm --version
```

---

## Step 2 — Install PostgreSQL (local database)

### Windows

1. Download the installer from https://www.postgresql.org/download/windows/
2. Run it. During setup:
   - Set a password for the `postgres` user (remember it!)
   - Keep the default port **5432**
   - Keep the default locale
3. After install, open **pgAdmin** (installed alongside) or use **psql** from the Start Menu.

### Create the database

Open **SQL Shell (psql)** from the Start Menu, press Enter through the prompts (host/port/user), enter your password, then:

```sql
CREATE DATABASE toto;
\q
```

Your connection string will be:
```
postgresql://postgres:YOURPASSWORD@localhost:5432/toto
```

---

## Step 3 — Set up environment variables

```
cp .env.example .env
```

Open `.env` and at minimum set:

```
DATABASE_URL=postgresql://postgres:YOURPASSWORD@localhost:5432/toto
APP_MODE=debug
```

Leave everything else as-is for local debug. The `SESSION_SECRET` gets a safe default in debug mode, and emails are printed to the console rather than sent.

---

## Step 4 — Install dependencies

```
npm install
```

This installs everything into `node_modules/`. No virtualenv needed — Node isolates dependencies per project folder.

---

## Step 5 — Push the database schema

This creates all the tables in your local database (run once, or after schema changes):

```
npm run db:push
```

If it asks about dropping columns, review carefully and confirm only if you intend to.

---

## Step 6 — Run the app

```
npm run dev
```

`APP_MODE` is read from `.env` (you set it to `debug` in step 3). Open <http://localhost:5000> in your browser. Hot-reload is active — changes to client code reflect immediately, server changes restart the process.

---

## Debug mode vs Production mode

Controlled by `APP_MODE` in your `.env`:

| Feature | `debug` | `production` |
|---------|---------|--------------|
| `SESSION_SECRET` | auto-filled default | **required** |
| `APP_URL` | `http://localhost:5000` | **required** |
| `RESEND_API_KEY` | not needed | **required** |
| `ADMIN_USER_ID` | optional | **required** |
| Password reset email | reset link printed to **console** | real email sent via Resend |
| Error responses | full stack traces | generic messages only |

To switch to production mode locally (e.g., to test emails), change `APP_MODE=production` in `.env` and fill in all the required vars.

---

## Useful commands

```bash
# Type-check the codebase
npm run check

# Push schema changes after editing shared/schema.ts
npm run db:push

# Build for production
npm run build

# Run the production build
npm run start
```

---

## First run checklist

- [ ] PostgreSQL is running (check Services on Windows or `pg_isready` in terminal)
- [ ] `toto` database exists
- [ ] `.env` has `DATABASE_URL` and `APP_MODE=debug`
- [ ] `npm install` completed without errors
- [ ] `npm run db:push` ran successfully (tables created)
- [ ] `npm run dev` starts without errors
- [ ] http://localhost:5000 loads the app
- [ ] Register an account using any VIP code (check the `vip_codes` table, or insert one manually)

### Insert a test VIP code

In psql or pgAdmin:

```sql
INSERT INTO vip_codes (code, used) VALUES ('LOCAL123', false);
```

Use `LOCAL123` when registering your first account.

