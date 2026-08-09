from io import BytesIO

from fastapi.testclient import TestClient


def test_magicboard_standalone_space_and_page(client: TestClient, auth_headers: dict[str, str]) -> None:
    workspace = client.post(
        "/api/workspaces",
        json={"name": "Docs WS", "slug": "docs-ws"},
        headers=auth_headers,
    ).json()
    assert workspace["slug"] == "docs-ws"

    space = client.post(
        f"/api/workspaces/{workspace['id']}/spaces",
        json={"name": "Engineering", "key": "eng"},
        headers=auth_headers,
    ).json()
    assert space["key"] == "eng"

    page = client.post(
        f"/api/spaces/{space['id']}/pages",
        json={"title": "Home", "slug": "home", "content": "# Hello"},
        headers=auth_headers,
    ).json()
    assert page["slug"] == "home"

    tree = client.get(f"/api/spaces/{space['id']}/pages/tree", headers=auth_headers)
    assert tree.status_code == 200
    assert tree.json()[0]["slug"] == "home"

    search = client.get(
        f"/api/workspaces/{workspace['id']}/suite-search",
        params={"q": "Hello"},
        headers=auth_headers,
    )
    assert search.status_code == 200
    body = search.json()
    assert body["work_items"] == []
    assert any(hit["title"] == "Home" for hit in body["pages"])

    upload = client.post(
        f"/api/pages/{page['id']}/attachments",
        headers=auth_headers,
        files={"file": ("note.txt", BytesIO(b"hello magicboard"), "text/plain")},
    )
    assert upload.status_code == 201
    attachment = upload.json()
    download = client.get(
        f"/api/page-attachments/{attachment['id']}/download",
        headers=auth_headers,
    )
    assert download.status_code == 200
    assert download.content == b"hello magicboard"


def test_health_reports_standalone(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["product"] == "magicboard"
    assert response.json()["workboard_connector"] is False
