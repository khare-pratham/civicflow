import os
from pathlib import Path
from fastapi.testclient import TestClient

# Keep tests isolated from any developer database.
TEST_DB = Path(__file__).parent / "test_civicflow.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"

from app import database
from app.main import app
from app.seed import DEMO_ISSUES


def setup_module():
    database.Base.metadata.drop_all(bind=database.engine)
    database.Base.metadata.create_all(bind=database.engine)


def teardown_module():
    database.Base.metadata.drop_all(bind=database.engine)
    TEST_DB.unlink(missing_ok=True)


def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"



def test_readiness_endpoint_checks_database():
    with TestClient(app) as client:
        response = client.get("/ready")
        assert response.status_code == 200
        assert response.json()["status"] == "ready"
        assert response.json()["checks"]["database"] == "ok"


def test_readiness_returns_503_when_database_is_unavailable(monkeypatch):
    with TestClient(app) as client:
        def unavailable_connection():
            raise RuntimeError("database connection failed")

        monkeypatch.setattr(database.engine, "connect", unavailable_connection)
        response = client.get("/ready")
        assert response.status_code == 503
        assert response.json()["detail"] == "Service temporarily unavailable."


def test_create_and_fetch_issue():
    with TestClient(app) as client:
        payload = {
            "title": "Damaged playground swing",
            "description": "The swing chain appears damaged and the equipment should be inspected.",
            "category": "Parks",
            "location": "West playground",
            "priority": "High",
        }
        created = client.post("/api/issues", json=payload)
        assert created.status_code == 201
        body = created.json()
        assert body["title"] == payload["title"]
        assert body["status"] == "Submitted"
        fetched = client.get(f"/api/issues/{body['id']}")
        assert fetched.status_code == 200
        assert fetched.json()["id"] == body["id"]


def test_rejects_blank_or_too_short_fields():
    with TestClient(app) as client:
        response = client.post("/api/issues", json={
            "title": "  ", "description": "too short", "category": "Roads", "location": "  "
        })
        assert response.status_code == 422


def test_rejects_unknown_category():
    with TestClient(app) as client:
        response = client.post("/api/issues", json={
            "title": "Damaged road sign", "description": "The road sign has been damaged and needs replacing.",
            "category": "Spaceport", "location": "Hill Road"
        })
        assert response.status_code == 422


def test_filters_issues_by_status():
    with TestClient(app) as client:
        created = client.post("/api/issues", json={
            "title": "Blocked stormwater drain", "description": "The drain is blocked and water is pooling after rain.",
            "category": "Other", "location": "Lower car park"
        }).json()
        response = client.get("/api/issues", params={"status": "Submitted"})
        assert response.status_code == 200
        assert all(item["status"] == "Submitted" for item in response.json())
        assert any(item["id"] == created["id"] for item in response.json())


def test_status_transition_rules():
    with TestClient(app) as client:
        created = client.post("/api/issues", json={
            "title": "Damaged park bench", "description": "The bench has a broken support and is unstable.",
            "category": "Parks", "location": "East park"
        }).json()
        allowed = client.patch(f"/api/issues/{created['id']}/status", json={"status": "Under review"})
        assert allowed.status_code == 200
        rejected = client.patch(f"/api/issues/{created['id']}/status", json={"status": "Resolved"})
        assert rejected.status_code == 409


def test_unknown_issue_returns_404():
    with TestClient(app) as client:
        response = client.get("/api/issues/999999")
        assert response.status_code == 404
