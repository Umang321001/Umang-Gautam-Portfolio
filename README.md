# Umang Gautam Portfolio — Full-Stack Edition

This folder contains the portfolio plus three working full-stack demo applications.

## What's included

- **Shared authentication:** register, login, JWT sessions, password hashing with bcrypt.
- **TaskFlow:** create, edit, complete and delete private tasks; priority, due dates, search and filters.
- **ShopEase:** product catalogue from an API, cart, demo checkout and account-specific order history.
- **DevSpace:** Markdown editor, live preview, account-specific drafts and published posts.
- **Backend:** Node.js + Express REST API + SQLite database.
- **Security basics:** hashed passwords, authenticated routes, user-scoped database queries, request validation, Helmet headers.

These are portfolio/demo applications. ShopEase checkout does **not** take real payments and products are sample catalogue data.

## Run on Windows (beginner-friendly)

1. Install **Node.js 20 or newer** from https://nodejs.org/ (LTS is recommended).
2. Extract this ZIP to a normal folder.
3. Open that folder in VS Code (the folder containing `package.json` and `server.js`).
4. In VS Code, open **Terminal → New Terminal**.
5. Run:

   ```bash
   npm install
   ```

6. Copy `.env.example` to `.env`. Open `.env` and replace `JWT_SECRET` with a long random secret (at least 32 characters). Do not share or upload `.env`.
7. Start the server:

   ```bash
   npm start
   ```

8. Open **http://localhost:3000** in Chrome. Do not use Live Server for this full-stack version: Express serves the website and API together.
9. Open TaskFlow, ShopEase and DevSpace from the portfolio. Create one account; the same login works in all three apps.

Alternative: double-click `start-windows.bat` after installing Node.js. It installs packages if needed and starts the server.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Current account |
| GET/POST | `/api/tasks` | List/create private tasks |
| PATCH/DELETE | `/api/tasks/:id` | Update/delete own task |
| GET | `/api/products` | Sample product catalogue |
| POST/GET | `/api/orders` | Place demo order / view own orders |
| GET/POST | `/api/posts` | List/create own posts |
| PATCH/DELETE | `/api/posts/:id` | Update/delete own post |
| GET | `/api/health` | API/database health check |

Protected API calls use `Authorization: Bearer <token>`. User data is scoped by authenticated user ID.

## Database

SQLite is created automatically at `data/app.db` by default. Back up this file to preserve local accounts and records. Do not commit the database file or `.env` to Git.

To change the database location, set `DATABASE_FILE` in `.env`.

## Deployment

The included `render.yaml` describes a Render web service with a persistent disk for SQLite.

1. Push this folder to a **private or public GitHub repository** (never include `.env`, `node_modules`, or `data/app.db`).
2. In Render, choose **New → Blueprint** and connect the repository.
3. Review the service and persistent disk settings, then deploy.
4. The service uses Render's generated `JWT_SECRET` and stores SQLite at `/var/data/app.db`.
5. Open the deployed URL and test registration, tasks, demo checkout and posts.

**Important:** a persistent disk is required for SQLite data to survive redeploys. The included Blueprint uses Render's Starter web-service plan and a 1 GB disk; confirm current pricing before deploying. Do not use ephemeral filesystem storage for real user data.

## Before using this for real customers

This is a learning/portfolio build, not a production commerce platform. Add HTTPS-only cookie sessions or robust token refresh/revocation, rate limiting, email verification/password reset, CSRF protection if using cookies, database backups, monitoring, privacy/terms pages, inventory/order workflows and a real payment provider with server-side verification. Never store card details yourself.
