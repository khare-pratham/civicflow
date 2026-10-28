from contextlib import asynccontextmanager
from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from .database import Base, engine, get_db
from .models import Issue, utc_now
from .schemas import IssueCreate, IssueRead, IssueStatusUpdate
from .seed import seed_demo_data

ALLOWED_TRANSITIONS = {
    "Submitted": {"Under review", "Assigned", "Closed"},
    "Under review": {"Assigned", "In progress", "Closed"},
    "Assigned": {"In progress", "Closed"},
    "In progress": {"Resolved", "Assigned", "Closed"},
    "Resolved": {"Closed", "In progress"},
    "Closed": set(),
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_demo_data()
    yield


app = FastAPI(title="CivicFlow API", version="0.1.0", description="Community issue reporting and resolution API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://civicflow-xi.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "civicflow-api"}


@app.get("/api/issues", response_model=list[IssueRead])
def list_issues(
    db: Annotated[Session, Depends(get_db)],
    status_filter: Annotated[str | None, Query(alias="status", max_length=30)] = None,
    category: Annotated[str | None, Query(max_length=40)] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
):
    stmt = select(Issue)
    if status_filter:
        stmt = stmt.where(Issue.status == status_filter)
    if category:
        stmt = stmt.where(Issue.category == category)
    if q:
        needle = f"%{q.strip()}%"
        stmt = stmt.where(or_(Issue.title.ilike(needle), Issue.description.ilike(needle), Issue.location.ilike(needle)))
    return list(db.scalars(stmt.order_by(Issue.created_at.desc(), Issue.id.desc())).all())


@app.post("/api/issues", response_model=IssueRead, status_code=status.HTTP_201_CREATED)
def create_issue(payload: IssueCreate, db: Annotated[Session, Depends(get_db)]):
    issue = Issue(**payload.model_dump(), status="Submitted")
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


@app.get("/api/issues/{issue_id}", response_model=IssueRead)
def get_issue(issue_id: int, db: Annotated[Session, Depends(get_db)]):
    issue = db.get(Issue, issue_id)
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found.")
    return issue


@app.patch("/api/issues/{issue_id}/status", response_model=IssueRead)
def update_issue_status(issue_id: int, payload: IssueStatusUpdate, db: Annotated[Session, Depends(get_db)]):
    issue = db.get(Issue, issue_id)
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found.")
    if payload.status != issue.status and payload.status not in ALLOWED_TRANSITIONS[issue.status]:
        raise HTTPException(status_code=409, detail=f"Cannot move an issue from '{issue.status}' to '{payload.status}'.")
    if payload.status in {"Assigned", "In progress"} and payload.assigned_team is not None:
        team = payload.assigned_team.strip()
        if not team:
            raise HTTPException(status_code=422, detail="Assigned team cannot be blank.")
        issue.assigned_team = team
    elif payload.assigned_team is not None:
        issue.assigned_team = payload.assigned_team.strip() or None
    issue.status = payload.status
    issue.updated_at = utc_now()
    db.commit()
    db.refresh(issue)
    return issue
