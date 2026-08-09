from fastapi.testclient import TestClient


def test_authenticated_user_can_create_project_inside_workspace(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
) -> None:
    response = client.post(
        f"/api/workspaces/{created_workspace['id']}/projects",
        json={"name": "Open Work", "key": "ow", "description": "Project API"},
        headers=auth_headers,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Open Work"
    assert data["key"] == "OW"
    assert data["workspace_id"] == created_workspace["id"]


def test_authenticated_user_can_list_projects_inside_workspace(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
    created_project: dict,
) -> None:
    response = client.get(
        f"/api/workspaces/{created_workspace['id']}/projects",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["items"][0]["id"] == created_project["id"]


def test_authenticated_user_can_fetch_project_by_id(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
) -> None:
    response = client.get(f"/api/projects/{created_project['id']}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["id"] == created_project["id"]


def test_authenticated_user_can_update_project(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
) -> None:
    response = client.put(
        f"/api/projects/{created_project['id']}",
        json={"name": "Updated Project", "key": "oow"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Updated Project"
    assert response.json()["key"] == "OOW"


def test_private_project_blocks_non_member_access(
    client: TestClient,
    auth_headers: dict[str, str],
    second_registered_user: dict,
    second_auth_headers: dict[str, str],
    created_project: dict,
) -> None:
    update_response = client.put(
        f"/api/projects/{created_project['id']}",
        json={"visibility": "PRIVATE"},
        headers=auth_headers,
    )
    assert update_response.status_code == 200

    access_response = client.get(f"/api/projects/{created_project['id']}", headers=second_auth_headers)
    assert access_response.status_code == 403


def test_project_members_can_be_added(
    client: TestClient,
    auth_headers: dict[str, str],
    second_registered_user: dict,
    created_workspace: dict,
    created_project: dict,
) -> None:
    workspace_member_response = client.post(
        f"/api/workspaces/{created_workspace['id']}/members",
        json={"user_id": second_registered_user["id"], "role": "MEMBER"},
        headers=auth_headers,
    )
    assert workspace_member_response.status_code == 201

    member_response = client.post(
        f"/api/projects/{created_project['id']}/members",
        json={"user_id": second_registered_user["id"], "role": "DEVELOPER"},
        headers=auth_headers,
    )

    assert member_response.status_code == 201
    assert member_response.json()["role"] == "DEVELOPER"


def test_unauthenticated_project_request_fails(
    client: TestClient, created_workspace: dict
) -> None:
    response = client.get(f"/api/workspaces/{created_workspace['id']}/projects")

    assert response.status_code == 401
