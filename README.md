# BullyShield — Bullying Incident Reporting & Management System

A secure, full-stack web application for reporting, tracking, and managing
bullying incidents in a school setting, built from the Chapter 4 system
design (Student / Administrator / Counsellor roles).

- **Backend:** Node.js, Express, Node's built-in `node:sqlite` module (no
  native compilation, no external DB server)
- **Frontend:** React, Vite, Tailwind CSS, React Router, Recharts
- **Auth:** JWT in an httpOnly cookie, bcrypt password hashing, RBAC,
  double-submit-cookie CSRF protection
- **Security:** AES-256-GCM encryption at rest for report descriptions and
  evidence files, Helmet security headers, rate limiting, input validation

---

## 1. Prerequisites

- **Node.js 22.5 or newer** (required — the backend uses Node's built-in
  `node:sqlite` module, which needs Node ≥ 22.5). Check with `node -v`.
- npm (comes with Node)

No separate database server, Docker, or native build tools are required.

---

## 2. Project structure

```
bullyshield/
├── backend/      Express API (port 5000)
│   ├── src/
│   │   ├── db/            schema.sql, migrate.js, seed.js, connection
│   │   ├── middleware/     auth, RBAC, CSRF, file upload
│   │   ├── routes/         auth, reports, evidence, cases, users, audit, dashboard
│   │   ├── utils/          encryption, ID generation, audit logging, JWT
│   │   ├── app.js
│   │   └── server.js
│   ├── uploads/            encrypted evidence files (created at runtime)
│   └── data/               SQLite database file (created at runtime)
└── frontend/     React SPA (port 5173 in development)
    └── src/
        ├── pages/           public pages + student/admin/counsellor dashboards
        ├── components/      shared UI (layout, modals, badges, status timeline)
        ├── context/         auth state
        └── api/             API client
```

---

## 3. Backend setup

```bash
cd backend
npm install
cp .env.example .env       # already present with working dev defaults — edit as needed
npm run migrate            # creates the SQLite database and tables
npm run seed                # creates a default Administrator and Counsellor account
npm run dev                  # starts the API on http://localhost:5000
```

Default seeded accounts (**change these passwords immediately in any real
deployment**):

| Role          | Email                          | Password         |
|---------------|---------------------------------|-------------------|
| Administrator | admin@bullyshield.local         | Admin@12345       |
| Counsellor    | counsellor@bullyshield.local    | Counsellor@123    |

Student accounts are created by students themselves via the "Create student
account" page in the app.

### Environment variables (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_FILE` | Optional override for the SQLite file path (defaults to `backend/data/bullyshield.db`) |
| `JWT_SECRET` | Secret used to sign session tokens — **replace with a long random string in production** |
| `JWT_EXPIRES_IN` | Session length, e.g. `8h` |
| `ENCRYPTION_KEY` | Key used to derive the AES-256-GCM encryption key — **replace in production** |
| `PORT` | API port (default `5000`) |
| `CLIENT_URL` | Frontend origin, used for CORS (default `http://localhost:5173`) |
| `NODE_ENV` | `development` or `production` |

---

## 4. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev       # starts the app on http://localhost:5173
```

Open `http://localhost:5173`. In development, Vite proxies `/api` requests
to the backend on port 5000 (see `vite.config.js`), so both servers share
the same effective origin for cookies — no extra CORS configuration needed.

### Production build

```bash
npm run build      # outputs static files to frontend/dist
npm run preview    # serve the production build locally for a smoke test
```

For a real deployment, serve `frontend/dist` behind a static file host or
reverse proxy (e.g. Nginx), and either:
- set `VITE_API_URL` (in `frontend/.env`, copy from `.env.example`) to your
  backend's public URL before building, **or**
- configure your reverse proxy to forward `/api/*` to the backend so the
  frontend and backend share an origin (recommended, avoids CORS entirely).

Also set `NODE_ENV=production` on the backend so cookies are marked
`Secure` (requires HTTPS) and run the whole stack behind TLS.

---

## 5. Using the app

- **Students** can report an incident anonymously with no account, or log
  in to submit a named report and get updates. Every submission returns a
  tracking code — save it, since it's the only way to look up an anonymous
  report later.
- **Administrators** see all reports and cases, assign cases to a
  Counsellor or keep them for disciplinary handling, manage staff accounts,
  and review the audit log. Physical and sexual-harassment reports are
  automatically flagged "Priority" and suggested for disciplinary handling;
  psychological/relational reports are suggested for a Counsellor.
- **Counsellors** see only the cases assigned to them, add investigation
  notes, and update status through to resolution.

---

## 6. Notes on implementation decisions

- **Database:** Chapter 4 specifies a relational schema; this build uses
  SQLite via Node's built-in `node:sqlite` module rather than Prisma or
  `better-sqlite3`, so the project installs and runs with zero native
  compilation and no extra binary downloads — just `npm install`. The five
  Chapter 4 tables (Users, IncidentReports, Evidence, Cases, AuditLogs) are
  implemented as-is in `backend/src/db/schema.sql`, plus a small
  `CaseNotes` table to support investigation notes.
- **Disciplinary Committee role:** merged into the Administrator role, as
  permitted by the brief, to keep the RBAC model simple. Cases suggested
  for disciplinary handling still show up in the Administrator's case
  queue with a "Priority" flag.
- **Anonymity:** anonymous reports never have a reporter linked in the
  database at all (not just hidden in the UI), so there is nothing to leak
  even if the database were inspected directly.
- **Encryption:** report descriptions and evidence files are encrypted at
  rest with AES-256-GCM, decrypted only when an authorised Administrator or
  assigned Counsellor views them. This is separate from TLS/HTTPS
  (encryption "in transit"), which is a deployment concern — terminate TLS
  at your reverse proxy or hosting platform in production.
- **CSRF:** since auth uses an httpOnly session cookie, a double-submit
  CSRF cookie/header pair protects all state-changing requests.

---

## 7. Validation performed

- `npm install` succeeds cleanly on both backend and frontend with zero
  vulnerabilities reported (`npm audit`) on the backend, and only a
  dev-server-only, non-shipping advisory on the frontend (esbuild ≤0.24,
  Vite 5's bundled dev server — does not affect the production build).
- `npm run build` completes successfully for the frontend.
- End-to-end tested: registration, login/logout (Student, Administrator,
  Counsellor), anonymous and identified report submission, evidence
  encryption/decryption, automatic case creation and handler suggestion,
  case assignment, investigation notes, status updates through to
  resolution, public tracking-code lookup, dashboard analytics, audit
  logging, and role-based access enforcement (e.g. a Student cannot list
  all reports; a Counsellor cannot view another Counsellor's case).
