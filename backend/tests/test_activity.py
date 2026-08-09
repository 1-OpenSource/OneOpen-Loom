from fastapi.testclient import TestClient


def test_activity_created_when_work_item_status_changes(
    client: TestClient,
    auth_headers: dict[str, str],
    created_work_item: dict,
) -> None:
    update_response = client.put(
        f"/api/work-items/{created_work_item['id']}/status",
        json={"status": "IN_PROGRESS"},
        headers=auth_headers,
    )
    activity_response = client.get(
        f"/api/work-items/{created_work_item['id']}/activity",
        headers=auth_headers,
    )

    assert update_response.status_code == 200
    assert activity_response.status_code == 200
    activities = activity_response.json()
    assert any(
        activity["field_name"] == "status"
        and activity["old_value"] == "TODO"
        and activity["new_value"] == "IN_PROGRESS"
        for activity in activities
    )


def test_activity_created_when_priority_changes(
    client: TestClient,
    auth_headers: dict[str, str],
    created_work_item: dict,
) -> None:
    update_response = client.put(
        f"/api/work-items/{created_work_item['id']}/priority",
        json={"priority": "HIGH"},
        headers=auth_headers,
    )
    activity_response = client.get(
        f"/api/work-items/{created_work_item['id']}/activity",
        headers=auth_headers,
    )

    assert update_response.status_code == 200
    assert activity_response.status_code == 200
    assert any(
        activity["field_name"] == "priority"
        and activity["old_value"] == "MEDIUM"
        and activity["new_value"] == "HIGH"
        for activity in activity_response.json()
    )


def test_project_activity_is_returned(
    client: TestClient,
    auth_headers: dict[str, str],
    created_project: dict,
    created_work_item: dict,
) -> None:
    client.put(
        f"/api/work-items/{created_work_item['id']}/status",
        json={"status": "DONE"},
        headers=auth_headers,
    )

    response = client.get(f"/api/projects/{created_project['id']}/activity", headers=auth_headers)

    assert response.status_code == 200
    assert any(activity["work_item_id"] == created_work_item["id"] for activity in response.json())
