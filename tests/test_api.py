import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

os.environ["JWT_SECRET_KEY"] = "test-secret"

from app.database import Base, DATABASE_URL, SessionLocal, get_db  # noqa: E402
from app.main import app  # noqa: E402


TestingSessionLocal = SessionLocal
TEST_DB_PATH = Path(DATABASE_URL.removeprefix("sqlite:///./")) if DATABASE_URL.startswith("sqlite:///./") else None


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_database():
    db = TestingSessionLocal()
    engine = db.get_bind()
    db.close()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if TEST_DB_PATH and TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


def register_and_login(email: str, username: str, password: str) -> str:
    register_response = client.post(
        "/register",
        json={"email": email, "username": username, "password": password},
    )
    assert register_response.status_code == 201

    login_response = client.post("/login", json={"email": email, "password": password})
    assert login_response.status_code == 200
    return login_response.json()["access_token"]


def test_task_lifecycle():
    token = register_and_login("user1@example.com", "user1", "password123")
    headers = {"Authorization": f"Bearer {token}"}

    create_response = client.post(
        "/tasks",
        json={"title": "Write tests", "description": "Use pytest"},
        headers=headers,
    )
    assert create_response.status_code == 201
    task_id = create_response.json()["id"]

    list_response = client.get("/tasks?page=1&limit=10", headers=headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    update_response = client.put(f"/tasks/{task_id}", json={"completed": True}, headers=headers)
    assert update_response.status_code == 200
    assert update_response.json()["completed"] is True

    filtered_response = client.get("/tasks?completed=true", headers=headers)
    assert filtered_response.status_code == 200
    assert len(filtered_response.json()) == 1

    delete_response = client.delete(f"/tasks/{task_id}", headers=headers)
    assert delete_response.status_code == 204


def test_user_cannot_access_other_user_task():
    token_user_1 = register_and_login("usera@example.com", "usera", "password123")
    token_user_2 = register_and_login("userb@example.com", "userb", "password123")
    headers_user_1 = {"Authorization": f"Bearer {token_user_1}"}
    headers_user_2 = {"Authorization": f"Bearer {token_user_2}"}

    create_response = client.post("/tasks", json={"title": "Private task"}, headers=headers_user_1)
    assert create_response.status_code == 201
    task_id = create_response.json()["id"]

    forbidden_read = client.get(f"/tasks/{task_id}", headers=headers_user_2)
    assert forbidden_read.status_code == 404

    forbidden_update = client.put(f"/tasks/{task_id}", json={"completed": True}, headers=headers_user_2)
    assert forbidden_update.status_code == 404

    forbidden_delete = client.delete(f"/tasks/{task_id}", headers=headers_user_2)
    assert forbidden_delete.status_code == 404
