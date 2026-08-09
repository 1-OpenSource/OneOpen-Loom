"""Smoke tests for product parity phases 2-15 backend foundations."""

from fastapi.testclient import TestClient


def test_work_item_rank_update(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
    created_work_item: dict,
) -> None:
    second_response = client.post(
        f"/api/projects/{created_project['id']}/work-items",
        json={"title": "Second work item", "type": "TASK", "priority": "MEDIUM"},
        headers=auth_headers,
    )
    assert second_response.status_code == 201
    second_item = second_response.json()

    assert created_work_item["rank"]
    assert second_item["rank"]
    assert second_item["rank"] > created_work_item["rank"]

    rank_response = client.put(
        f"/api/work-items/{second_item['id']}/rank",
        json={"before_id": created_work_item["id"]},
        headers=auth_headers,
    )
    assert rank_response.status_code == 200
    reranked_item = rank_response.json()
    assert reranked_item["rank"] < created_work_item["rank"]

    list_response = client.get(
        f"/api/projects/{created_project['id']}/work-items",
        headers=auth_headers,
    )
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    assert items[0]["id"] == second_item["id"]


def test_epic_assignment(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
    created_work_item: dict,
) -> None:
    epic_response = client.post(
        f"/api/projects/{created_project['id']}/work-items",
        json={"title": "Parity Epic", "type": "EPIC", "priority": "MEDIUM"},
        headers=auth_headers,
    )
    assert epic_response.status_code == 201
    epic = epic_response.json()

    update_response = client.put(
        f"/api/work-items/{created_work_item['id']}",
        json={"epic_id": epic["id"]},
        headers=auth_headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["epic_id"] == epic["id"]

    filtered_response = client.get(
        f"/api/projects/{created_project['id']}/work-items",
        params={"epic_id": epic["id"]},
        headers=auth_headers,
    )
    assert filtered_response.status_code == 200
    filtered_items = filtered_response.json()["items"]
    assert any(item["id"] == created_work_item["id"] for item in filtered_items)


def test_sprint_create_start_and_add_item(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
    created_work_item: dict,
) -> None:
    sprint_response = client.post(
        f"/api/projects/{created_project['id']}/sprints",
        json={"name": "Sprint 1", "goal": "Ship the parity roadmap"},
        headers=auth_headers,
    )
    assert sprint_response.status_code == 201
    sprint = sprint_response.json()
    assert sprint["state"] == "FUTURE"

    start_response = client.post(f"/api/sprints/{sprint['id']}/start", headers=auth_headers)
    assert start_response.status_code == 200
    assert start_response.json()["state"] == "ACTIVE"

    item_response = client.post(
        f"/api/sprints/{sprint['id']}/items",
        json={"work_item_id": created_work_item["id"], "committed_points": 3},
        headers=auth_headers,
    )
    assert item_response.status_code == 201

    board_response = client.get(
        f"/api/projects/{created_project['id']}/workboard",
        params={"sprint_id": sprint["id"]},
        headers=auth_headers,
    )
    assert board_response.status_code == 200


def test_oql_search(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
    created_work_item: dict,
) -> None:
    response = client.post(
        "/api/oql/search",
        json={"oql": f"project = {created_project['key']} AND type = TASK", "page": 1, "page_size": 20},
        headers=auth_headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["total"] >= 1
    assert any(item["id"] == created_work_item["id"] for item in payload["items"])


def test_notification_list_empty(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get("/api/notifications", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_bulk_update_work_items(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
    created_work_item: dict,
) -> None:
    response = client.post(
        "/api/work-items/bulk",
        json={
            "ids": [created_work_item["id"]],
            "action": "update_priority",
            "payload": {"priority": "HIGH"},
        },
        headers=auth_headers,
    )
    assert response.status_code == 200

    fetch_response = client.get(f"/api/work-items/{created_work_item['id']}", headers=auth_headers)
    assert fetch_response.status_code == 200
    assert fetch_response.json()["priority"] == "HIGH"


def test_pwa_manifest(client: TestClient) -> None:
    response = client.get("/api/manifest")
    assert response.status_code == 200
    assert response.json()["name"] == "OneOpen Workboard"
