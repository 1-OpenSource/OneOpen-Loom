from fastapi.testclient import TestClient


def test_authenticated_user_can_add_comment_to_work_item(
    client: TestClient,
    auth_headers: dict[str, str],
    created_work_item: dict,
) -> None:
    response = client.post(
        f"/api/work-items/{created_work_item['id']}/comments",
        json={"comment_text": "This is ready for review."},
        headers=auth_headers,
    )

    assert response.status_code == 201
    assert response.json()["comment_text"] == "This is ready for review."
    assert response.json()["work_item_id"] == created_work_item["id"]


def test_authenticated_user_can_list_comments_for_work_item(
    client: TestClient,
    auth_headers: dict[str, str],
    created_work_item: dict,
) -> None:
    created = client.post(
        f"/api/work-items/{created_work_item['id']}/comments",
        json={"comment_text": "Comment to list."},
        headers=auth_headers,
    )

    response = client.get(
        f"/api/work-items/{created_work_item['id']}/comments",
        headers=auth_headers,
    )

    assert created.status_code == 201
    assert response.status_code == 200
    assert response.json()[0]["id"] == created.json()["id"]


def test_authenticated_user_can_update_own_comment(
    client: TestClient,
    auth_headers: dict[str, str],
    created_work_item: dict,
) -> None:
    created = client.post(
        f"/api/work-items/{created_work_item['id']}/comments",
        json={"comment_text": "Original comment."},
        headers=auth_headers,
    )

    response = client.put(
        f"/api/comments/{created.json()['id']}",
        json={"comment_text": "Updated comment."},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["comment_text"] == "Updated comment."


def test_authenticated_user_can_delete_own_comment(
    client: TestClient,
    auth_headers: dict[str, str],
    created_work_item: dict,
) -> None:
    created = client.post(
        f"/api/work-items/{created_work_item['id']}/comments",
        json={"comment_text": "Delete me."},
        headers=auth_headers,
    )

    response = client.delete(f"/api/comments/{created.json()['id']}", headers=auth_headers)

    assert response.status_code == 204


def test_non_owner_cannot_delete_comment_without_admin_access(
    client: TestClient,
    auth_headers: dict[str, str],
    second_auth_headers: dict[str, str],
    second_registered_user: dict,
    created_workspace: dict,
    created_work_item: dict,
) -> None:
    member_response = client.post(
        f"/api/workspaces/{created_workspace['id']}/members",
        json={"user_id": second_registered_user["id"], "role": "MEMBER"},
        headers=auth_headers,
    )
    assert member_response.status_code == 201

    created = client.post(
        f"/api/work-items/{created_work_item['id']}/comments",
        json={"comment_text": "Original owner comment."},
        headers=auth_headers,
    )

    response = client.delete(f"/api/comments/{created.json()['id']}", headers=second_auth_headers)

    assert response.status_code == 403


def test_unauthenticated_comment_request_fails(
    client: TestClient, created_work_item: dict
) -> None:
    response = client.get(f"/api/work-items/{created_work_item['id']}/comments")

    assert response.status_code == 401
