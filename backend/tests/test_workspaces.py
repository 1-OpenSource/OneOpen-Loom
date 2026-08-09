from fastapi.testclient import TestClient


def test_authenticated_user_can_create_workspace(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/workspaces",
        json={"name": "Community Work", "slug": "community-work"},
        headers=auth_headers,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Community Work"
    assert data["slug"] == "community-work"


def test_authenticated_user_can_list_own_workspaces(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
) -> None:
    response = client.get("/api/workspaces", headers=auth_headers)

    assert response.status_code == 200
    assert [workspace["id"] for workspace in response.json()] == [created_workspace["id"]]


def test_authenticated_user_can_fetch_workspace_by_id(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
) -> None:
    response = client.get(f"/api/workspaces/{created_workspace['id']}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["id"] == created_workspace["id"]


def test_workspace_overview_returns_summary(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
) -> None:
    response = client.get(f"/api/workspaces/{created_workspace['id']}/overview", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["total_projects"] == 0
    assert data["total_members"] == 1


def test_authenticated_user_can_update_workspace(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
) -> None:
    response = client.put(
        f"/api/workspaces/{created_workspace['id']}",
        json={"name": "Updated Workspace"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Updated Workspace"


def test_viewer_cannot_update_workspace(
    client: TestClient,
    auth_headers: dict[str, str],
    second_registered_user: dict,
    second_auth_headers: dict[str, str],
    created_workspace: dict,
) -> None:
    add_response = client.post(
        f"/api/workspaces/{created_workspace['id']}/members",
        json={"user_id": second_registered_user["id"], "role": "VIEWER"},
        headers=auth_headers,
    )
    assert add_response.status_code == 201

    response = client.put(
        f"/api/workspaces/{created_workspace['id']}",
        json={"name": "Viewer Update Attempt"},
        headers=second_auth_headers,
    )

    assert response.status_code == 403


def test_unauthenticated_workspace_request_fails(client: TestClient) -> None:
    response = client.get("/api/workspaces")

    assert response.status_code == 401
