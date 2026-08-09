from fastapi.testclient import TestClient


def test_setup_status_reports_needs_owner_when_empty(client: TestClient) -> None:
    response = client.get("/api/auth/setup-status")

    assert response.status_code == 200
    assert response.json() == {"needs_owner": True, "user_count": 0}


def test_setup_status_clears_after_registration(
    client: TestClient, registered_user: dict
) -> None:
    response = client.get("/api/auth/setup-status")

    assert response.status_code == 200
    assert response.json()["needs_owner"] is False
    assert response.json()["user_count"] >= 1


def test_user_can_register(client: TestClient, test_user_payload: dict[str, str]) -> None:
    response = client.post("/api/auth/register", json=test_user_payload)

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == test_user_payload["email"]
    assert data["name"] == test_user_payload["name"]
    assert "password_hash" not in data


def test_duplicate_email_registration_fails(
    client: TestClient, test_user_payload: dict[str, str]
) -> None:
    first_response = client.post("/api/auth/register", json=test_user_payload)
    second_response = client.post("/api/auth/register", json=test_user_payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 409


def test_user_can_login(
    client: TestClient,
    registered_user: dict,
    test_user_payload: dict[str, str],
) -> None:
    response = client.post(
        "/api/auth/login",
        json={
            "email": test_user_payload["email"],
            "password": test_user_payload["password"],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]


def test_login_with_wrong_password_fails(
    client: TestClient,
    registered_user: dict,
    test_user_payload: dict[str, str],
) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": test_user_payload["email"], "password": "wrong-password"},
    )

    assert response.status_code == 401


def test_me_works_with_valid_token(
    client: TestClient,
    auth_headers: dict[str, str],
    test_user_payload: dict[str, str],
) -> None:
    response = client.get("/api/auth/me", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["email"] == test_user_payload["email"]


def test_me_fails_without_token(client: TestClient) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 401
