from fastapi.testclient import TestClient


EXPECTED_STATUS_KEYS = {"TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"}


def test_workboard_returns_work_items_grouped_by_status(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
    created_work_item: dict,
) -> None:
    response = client.get(
        f"/api/projects/{created_project['id']}/workboard",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert set(column["key"] for column in data["columns"]) == EXPECTED_STATUS_KEYS
    assert "BLOCKED" not in {column["key"] for column in data["columns"]}
    todo_column = next(column for column in data["columns"] if column["key"] == "TODO")
    assert todo_column["items"][0]["id"] == created_work_item["id"]


def test_workboard_moves_item_after_status_change(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
    created_work_item: dict,
) -> None:
    update_response = client.put(
        f"/api/work-items/{created_work_item['id']}/status",
        json={"status": "IN_PROGRESS"},
        headers=auth_headers,
    )
    board_response = client.get(
        f"/api/projects/{created_project['id']}/workboard",
        headers=auth_headers,
    )

    assert update_response.status_code == 200
    assert board_response.status_code == 200
    data = board_response.json()
    todo_column = next(column for column in data["columns"] if column["key"] == "TODO")
    in_progress_column = next(column for column in data["columns"] if column["key"] == "IN_PROGRESS")
    assert todo_column["items"] == []
    assert in_progress_column["items"][0]["id"] == created_work_item["id"]


def test_workboard_keeps_blocked_items_in_stage_column(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
    created_work_item: dict,
) -> None:
    client.put(
        f"/api/work-items/{created_work_item['id']}/status",
        json={"status": "IN_PROGRESS"},
        headers=auth_headers,
    )
    blocked = client.put(
        f"/api/work-items/{created_work_item['id']}/blocked",
        json={"is_blocked": True},
        headers=auth_headers,
    )
    board = client.get(
        f"/api/projects/{created_project['id']}/workboard",
        headers=auth_headers,
    )

    assert blocked.status_code == 200
    assert blocked.json()["is_blocked"] is True
    assert blocked.json()["status"] == "IN_PROGRESS"
    in_progress_column = next(column for column in board.json()["columns"] if column["key"] == "IN_PROGRESS")
    assert in_progress_column["items"][0]["id"] == created_work_item["id"]
    assert in_progress_column["items"][0]["is_blocked"] is True


def test_workboard_filters_blocked_only(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
    created_work_item: dict,
) -> None:
    client.put(
        f"/api/work-items/{created_work_item['id']}/status",
        json={"status": "IN_PROGRESS"},
        headers=auth_headers,
    )
    client.put(
        f"/api/work-items/{created_work_item['id']}/blocked",
        json={"is_blocked": True},
        headers=auth_headers,
    )
    board = client.get(
        f"/api/projects/{created_project['id']}/workboard",
        params={"blocked": True},
        headers=auth_headers,
    )
    assert board.status_code == 200
    items = [item for column in board.json()["columns"] for item in column["items"]]
    assert len(items) == 1
    assert items[0]["is_blocked"] is True
