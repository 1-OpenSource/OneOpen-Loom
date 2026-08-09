import sys
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import models  # noqa: F401 - ensure all models are registered with Base metadata
from app.db.database import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    """Create a fresh in-memory SQLite database for each test."""

    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(dbapi_connection, connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def test_user_payload() -> dict[str, str]:
    return {
        "name": "Akhil Tester",
        "email": "akhil.tester@example.com",
        "password": "password123",
    }


@pytest.fixture()
def registered_user(client: TestClient, test_user_payload: dict[str, str]) -> dict:
    response = client.post("/api/auth/register", json=test_user_payload)
    assert response.status_code == 201
    return response.json()


@pytest.fixture()
def second_user_payload() -> dict[str, str]:
    return {
        "name": "Second User",
        "email": "second.user@example.com",
        "password": "password123",
    }


@pytest.fixture()
def second_registered_user(client: TestClient, second_user_payload: dict[str, str]) -> dict:
    response = client.post("/api/auth/register", json=second_user_payload)
    assert response.status_code == 201
    return response.json()


@pytest.fixture()
def auth_token(
    client: TestClient,
    registered_user: dict,
    test_user_payload: dict[str, str],
) -> str:
    response = client.post(
        "/api/auth/login",
        json={
            "email": test_user_payload["email"],
            "password": test_user_payload["password"],
        },
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture()
def second_auth_token(
    client: TestClient,
    second_registered_user: dict,
    second_user_payload: dict[str, str],
) -> str:
    response = client.post(
        "/api/auth/login",
        json={
            "email": second_user_payload["email"],
            "password": second_user_payload["password"],
        },
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture()
def auth_headers(auth_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture()
def second_auth_headers(second_auth_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {second_auth_token}"}


@pytest.fixture()
def created_workspace(client: TestClient, auth_headers: dict[str, str]) -> dict:
    response = client.post(
        "/api/workspaces",
        json={"name": "OneOpen Workspace", "slug": "oneopen-workspace"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()


@pytest.fixture()
def created_project(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
) -> dict:
    response = client.post(
        f"/api/workspaces/{created_workspace['id']}/projects",
        json={"name": "Workboard Core", "key": "OOW", "description": "Core MVP project"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()


@pytest.fixture()
def created_work_item(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
) -> dict:
    response = client.post(
        f"/api/projects/{created_project['id']}/work-items",
        json={
            "title": "Create the first Work Item",
            "description": "Exercise the core Work Item API.",
            "type": "TASK",
            "priority": "MEDIUM",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()
