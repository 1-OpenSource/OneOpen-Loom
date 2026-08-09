from fastapi.testclient import TestClient


def test_authenticated_user_can_create_work_item_inside_project(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
) -> None:
    response = client.post(
        f"/api/projects/{created_project['id']}/work-items",
        json={"title": "Write API tests", "type": "TASK", "priority": "HIGH"},
        headers=auth_headers,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Write API tests"
    assert data["work_item_key"] == "OOW-1"
    assert data["status"] == "TODO"
    assert data["priority"] == "HIGH"


def test_work_item_key_sequence_uses_project_key(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
) -> None:
    first = client.post(
        f"/api/projects/{created_project['id']}/work-items",
        json={"title": "First Work Item"},
        headers=auth_headers,
    )
    second = client.post(
        f"/api/projects/{created_project['id']}/work-items",
        json={"title": "Second Work Item"},
        headers=auth_headers,
    )

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["work_item_key"] == "OOW-1"
    assert second.json()["work_item_key"] == "OOW-2"


def test_authenticated_user_can_list_work_items_inside_project(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
    created_work_item: dict,
) -> None:
    response = client.get(
        f"/api/projects/{created_project['id']}/work-items",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["items"][0]["id"] == created_work_item["id"]


def test_authenticated_user_can_fetch_work_item_by_id(
    client: TestClient,
    auth_headers: dict[str, str],
    created_work_item: dict,
) -> None:
    response = client.get(
        f"/api/work-items/{created_work_item['id']}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["id"] == created_work_item["id"]


def test_authenticated_user_can_update_work_item(
    client: TestClient,
    auth_headers: dict[str, str],
    created_work_item: dict,
) -> None:
    response = client.put(
        f"/api/work-items/{created_work_item['id']}",
        json={"title": "Updated Work Item", "description": "Updated description"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Updated Work Item"
    assert response.json()["description"] == "Updated description"


def test_authenticated_user_can_update_status(
    client: TestClient,
    auth_headers: dict[str, str],
    created_work_item: dict,
) -> None:
    response = client.put(
        f"/api/work-items/{created_work_item['id']}/status",
        json={"status": "IN_PROGRESS"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "IN_PROGRESS"


def test_illegal_status_transition_is_rejected(
    client: TestClient,
    auth_headers: dict[str, str],
    created_work_item: dict,
) -> None:
    response = client.put(
        f"/api/work-items/{created_work_item['id']}/status",
        json={"status": "DONE"},
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert "Cannot move" in response.json()["detail"]


def test_blocked_is_flag_not_status(
    client: TestClient,
    auth_headers: dict[str, str],
    created_work_item: dict,
) -> None:
    as_status = client.put(
        f"/api/work-items/{created_work_item['id']}/status",
        json={"status": "BLOCKED"},
        headers=auth_headers,
    )
    assert as_status.status_code == 400

    progress = client.put(
        f"/api/work-items/{created_work_item['id']}/status",
        json={"status": "IN_PROGRESS"},
        headers=auth_headers,
    )
    blocked = client.put(
        f"/api/work-items/{created_work_item['id']}/blocked",
        json={"is_blocked": True},
        headers=auth_headers,
    )

    assert progress.status_code == 200
    assert blocked.status_code == 200
    assert blocked.json()["is_blocked"] is True
    assert blocked.json()["status"] == "IN_PROGRESS"


def test_done_item_cannot_be_blocked(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
) -> None:
    created = client.post(
        f"/api/projects/{created_project['id']}/work-items",
        json={"title": "Already done", "status": "DONE"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    response = client.put(
        f"/api/work-items/{created.json()['id']}/blocked",
        json={"is_blocked": True},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "cannot be marked blocked" in response.json()["detail"].lower()


def test_authenticated_user_can_update_priority(
    client: TestClient,
    auth_headers: dict[str, str],
    created_work_item: dict,
) -> None:
    response = client.put(
        f"/api/work-items/{created_work_item['id']}/priority",
        json={"priority": "CRITICAL"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["priority"] == "CRITICAL"


def test_authenticated_user_can_update_owner(
    client: TestClient,
    auth_headers: dict[str, str],
    created_work_item: dict,
    registered_user: dict,
) -> None:
    response = client.put(
        f"/api/work-items/{created_work_item['id']}/owner",
        json={"assignee_user_id": registered_user["id"]},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["assignee_user_id"] == registered_user["id"]


def test_work_item_filters_and_pagination(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
) -> None:
    first = client.post(
        f"/api/projects/{created_project['id']}/work-items",
        json={"title": "First", "status": "DONE", "priority": "HIGH"},
        headers=auth_headers,
    )
    second = client.post(
        f"/api/projects/{created_project['id']}/work-items",
        json={"title": "Second", "status": "TODO", "priority": "LOW"},
        headers=auth_headers,
    )
    assert first.status_code == 201
    assert second.status_code == 201

    response = client.get(
        f"/api/projects/{created_project['id']}/work-items",
        params={"status": "DONE", "page_size": 1},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["meta"]["total"] == 1
    assert response.json()["items"][0]["status"] == "DONE"


def test_viewer_cannot_create_work_item(
    client: TestClient,
    auth_headers: dict[str, str],
    second_registered_user: dict,
    second_auth_headers: dict[str, str],
    created_workspace: dict,
    created_project: dict,
) -> None:
    add_member = client.post(
        f"/api/workspaces/{created_workspace['id']}/members",
        json={"user_id": second_registered_user["id"], "role": "VIEWER"},
        headers=auth_headers,
    )
    assert add_member.status_code == 201

    response = client.post(
        f"/api/projects/{created_project['id']}/work-items",
        json={"title": "Viewer cannot do this"},
        headers=second_auth_headers,
    )

    assert response.status_code == 403


def test_unauthenticated_work_item_request_fails(
    client: TestClient, created_project: dict
) -> None:
    response = client.get(f"/api/projects/{created_project['id']}/work-items")

    assert response.status_code == 401
