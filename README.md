
## Live Demo

**[Launch CivicFlow](https://civicflow-xi.vercel.app)**

CivicFlow is a full-stack community issue reporting and service workflow application. It demonstrates issue creation, categorisation, priority tracking, status management and a REST API backed by a relational database.

### Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, DaisyUI
- **Backend:** Python, FastAPI
- **Database:** PostgreSQL in the deployed environment; SQLite for local development
- **Testing:** pytest and automated frontend production-build checks
- **Deployment:** Vercel (frontend), Render (API), Neon (PostgreSQL)

### Key Features

- Create and browse community issues
- Search and filter by category or status
- Track priority and resolution workflow
- Update issue status through the REST API
- Validate requests and persist records in a relational database

### Architecture

Browser → React frontend on Vercel → FastAPI REST API on Render → PostgreSQL database on Neon.

### Demo Notes

This is a portfolio MVP using demonstration data. It is not a production-ready council service and should not be used to submit real personal information.
