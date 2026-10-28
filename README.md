# CivicFlow

A full-stack community issue reporting and resolution platform. Residents submit issues; service teams triage, assign, track and resolve them.

## MVP scope

- React 19 + TypeScript frontend
- Tailwind CSS 4 + DaisyUI
- FastAPI REST backend
- SQLAlchemy data model, SQLite by default for a quick local start; PostgreSQL via `DATABASE_URL` for deployment
- Issue create/list/detail/status workflow
- Server-side validation and status transition rules
- API tests with pytest
- Seeded demo data on first start
- No AI-generated triage, no external API keys, no MongoDB duplication in the MVP

## Run locally

### 1. Backend

Requirements: Python 3.11+

```bash
cd backend
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell:
# .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API: http://127.0.0.1:8000  
Interactive API docs: http://127.0.0.1:8000/docs  
Health: http://127.0.0.1:8000/health

The default database is `sqlite:///./civicflow.db`. To use PostgreSQL, set `DATABASE_URL` to a SQLAlchemy URL, for example:
`postgresql+psycopg://civicflow:civicflow@localhost:5432/civicflow`

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally http://localhost:5173.

The Vite development server proxies `/api` and `/health` to the FastAPI server on port 8000.

## Tests

```bash
cd backend
pip install -r requirements.txt
pytest -q
```

## API endpoints

- `GET /health`
- `GET /api/issues?status=&category=&q=`
- `POST /api/issues`
- `GET /api/issues/{issue_id}`
- `PATCH /api/issues/{issue_id}/status`

Allowed statuses: `Submitted`, `Under review`, `Assigned`, `In progress`, `Resolved`, `Closed`.

## Data model

The MVP uses a relational database because issues, statuses and assignment workflow are structured and transactional. PostgreSQL is the intended production database. SQLite makes local setup fast. MongoDB is intentionally not included yet: adding a second database before a concrete flexible-document requirement would increase operational complexity without improving the MVP.

## Security and production limitations

This is a portfolio MVP, not a production council system. It currently has no login/role-based access, file uploads, email notifications, rate limiting, audit identity, or production deployment configuration. Do not submit real personal information. Before public deployment, add authentication/authorisation, request limits, secure configuration, migrations, observability, privacy controls, and deployment hardening.

## Suggested next milestones

1. Add authentication and role-based permissions.
2. Add PostgreSQL migrations with Alembic and Docker Compose.
3. Add optional photo uploads using object storage.
4. Add a separate SvelteKit resident portal only if it serves a distinct purpose.
5. Add end-to-end browser tests.
