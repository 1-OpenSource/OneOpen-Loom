from fastapi.testclient import TestClient


def test_magicboard_create_space_with_key(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
) -> None:
    response = client.post(
        f"/api/workspaces/{created_workspace['id']}/spaces",
        json={"name": "Engineering Docs", "key": "eng-docs", "description": "Team wiki"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["key"] == "eng-docs"
    assert data["name"] == "Engineering Docs"


def test_magicboard_create_page_with_slug_and_tree(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
) -> None:
    space_resp = client.post(
        f"/api/workspaces/{created_workspace['id']}/spaces",
        json={"name": "Docs", "key": "docs"},
        headers=auth_headers,
    )
    space_id = space_resp.json()["id"]

    parent_resp = client.post(
        f"/api/spaces/{space_id}/pages",
        json={"title": "Getting Started", "slug": "getting-started", "content": "# Welcome"},
        headers=auth_headers,
    )
    assert parent_resp.status_code == 201
    parent_id = parent_resp.json()["id"]
    assert parent_resp.json()["slug"] == "getting-started"

    child_resp = client.post(
        f"/api/spaces/{space_id}/pages",
        json={
            "title": "Install",
            "slug": "install",
            "content": "# Install",
            "parent_page_id": parent_id,
        },
        headers=auth_headers,
    )
    assert child_resp.status_code == 201

    tree_resp = client.get(f"/api/spaces/{space_id}/pages/tree", headers=auth_headers)
    assert tree_resp.status_code == 200
    tree = tree_resp.json()
    assert len(tree) == 1
    assert tree[0]["slug"] == "getting-started"
    assert len(tree[0]["children"]) == 1
    assert tree[0]["children"][0]["slug"] == "install"

    flat_resp = client.get(f"/api/spaces/{space_id}/pages", headers=auth_headers)
    assert flat_resp.status_code == 200
    assert len(flat_resp.json()) == 2


def test_magicboard_version_restore(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
) -> None:
    space_id = client.post(
        f"/api/workspaces/{created_workspace['id']}/spaces",
        json={"name": "Versions", "key": "versions"},
        headers=auth_headers,
    ).json()["id"]

    page = client.post(
        f"/api/spaces/{space_id}/pages",
        json={"title": "Draft", "content": "Version one"},
        headers=auth_headers,
    ).json()
    page_id = page["id"]

    client.put(
        f"/api/pages/{page_id}",
        json={"content": "Version two"},
        headers=auth_headers,
    )
    versions = client.get(f"/api/pages/{page_id}/versions", headers=auth_headers).json()
    assert len(versions) >= 2
    original = next(v for v in versions if v["content"] == "Version one")

    restore_resp = client.post(
        f"/api/pages/{page_id}/restore/{original['id']}",
        headers=auth_headers,
    )
    assert restore_resp.status_code == 200
    assert restore_resp.json()["content"] == "Version one"


def test_magicboard_work_item_link_unlink_and_lookup(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
    created_project: dict,
    created_work_item: dict,
) -> None:
    space_id = client.post(
        f"/api/workspaces/{created_workspace['id']}/spaces",
        json={"name": "Links", "key": "links"},
        headers=auth_headers,
    ).json()["id"]

    page_id = client.post(
        f"/api/spaces/{space_id}/pages",
        json={"title": "Spec", "content": "Linked spec"},
        headers=auth_headers,
    ).json()["id"]

    link_resp = client.post(
        f"/api/work-items/{created_work_item['id']}/pages",
        json={"page_id": page_id},
        headers=auth_headers,
    )
    assert link_resp.status_code == 204

    page_items = client.get(f"/api/pages/{page_id}/work-items", headers=auth_headers)
    assert page_items.status_code == 200
    assert len(page_items.json()) == 1
    assert page_items.json()[0]["id"] == created_work_item["id"]

    wi_pages = client.get(
        f"/api/work-items/{created_work_item['id']}/pages",
        headers=auth_headers,
    )
    assert wi_pages.status_code == 200
    assert len(wi_pages.json()) == 1

    unlink_resp = client.delete(
        f"/api/work-items/{created_work_item['id']}/pages/{page_id}",
        headers=auth_headers,
    )
    assert unlink_resp.status_code == 204

    key = created_work_item["work_item_key"]
    lookup_resp = client.get(
        f"/api/workspaces/{created_workspace['id']}/work-items/by-key/{key}",
        headers=auth_headers,
    )
    assert lookup_resp.status_code == 200
    assert lookup_resp.json()["work_item_key"] == key


def test_magicboard_search(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
) -> None:
    space_id = client.post(
        f"/api/workspaces/{created_workspace['id']}/spaces",
        json={"name": "Search Space", "key": "search"},
        headers=auth_headers,
    ).json()["id"]

    client.post(
        f"/api/spaces/{space_id}/pages",
        json={"title": "Runbook", "content": "restart the magicboard service"},
        headers=auth_headers,
    )

    search_resp = client.get(
        f"/api/workspaces/{created_workspace['id']}/magicboard/search",
        params={"q": "magicboard"},
        headers=auth_headers,
    )
    assert search_resp.status_code == 200
    results = search_resp.json()
    assert len(results) >= 1
    assert results[0]["title"] == "Runbook"


def test_magicboard_comment_watch_favorite(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
) -> None:
    space_id = client.post(
        f"/api/workspaces/{created_workspace['id']}/spaces",
        json={"name": "Social", "key": "social"},
        headers=auth_headers,
    ).json()["id"]

    page_id = client.post(
        f"/api/spaces/{space_id}/pages",
        json={"title": "Discuss", "content": "Notes"},
        headers=auth_headers,
    ).json()["id"]

    comment_resp = client.post(
        f"/api/pages/{page_id}/comments",
        json={"body": "Looks good"},
        headers=auth_headers,
    )
    assert comment_resp.status_code == 201
    comment_id = comment_resp.json()["id"]

    comments = client.get(f"/api/pages/{page_id}/comments", headers=auth_headers)
    assert comments.status_code == 200
    assert len(comments.json()) == 1

    assert client.post(f"/api/pages/{page_id}/watch", headers=auth_headers).status_code == 204
    assert client.post(f"/api/pages/{page_id}/favorite", headers=auth_headers).status_code == 204
    assert client.post(f"/api/pages/{page_id}/view", headers=auth_headers).status_code == 204

    favorites = client.get(
        f"/api/workspaces/{created_workspace['id']}/magicboard/favorites",
        headers=auth_headers,
    )
    assert favorites.status_code == 200
    assert any(item["page_id"] == page_id for item in favorites.json())

    recent = client.get(
        f"/api/workspaces/{created_workspace['id']}/magicboard/recent",
        headers=auth_headers,
    )
    assert recent.status_code == 200
    assert recent.json()[0]["page_id"] == page_id

    delete_comment = client.delete(f"/api/page-comments/{comment_id}", headers=auth_headers)
    assert delete_comment.status_code == 204


def test_magicboard_share_link_and_resolve(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
) -> None:
    space_id = client.post(
        f"/api/workspaces/{created_workspace['id']}/spaces",
        json={"name": "Share Space", "key": "share"},
        headers=auth_headers,
    ).json()["id"]
    page = client.post(
        f"/api/spaces/{space_id}/pages",
        json={"title": "Shared Page", "slug": "shared-page", "content": "Hello"},
        headers=auth_headers,
    ).json()
    page_id = page["id"]

    create_link = client.post(f"/api/pages/{page_id}/share-links", headers=auth_headers)
    assert create_link.status_code == 201
    token = create_link.json()["token"]
    assert create_link.json()["share_path"].endswith(token)

    resolve_share = client.get(f"/api/magicboard/share/{token}", headers=auth_headers)
    assert resolve_share.status_code == 200
    assert resolve_share.json()["page_id"] == page_id

    resolve_path = client.get(
        f"/api/workspaces/{created_workspace['id']}/magicboard/resolve",
        params={"space_key": "share", "page_slug": "shared-page"},
        headers=auth_headers,
    )
    assert resolve_path.status_code == 200
    assert resolve_path.json()["page_id"] == page_id

    link_id = create_link.json()["id"]
    assert client.delete(f"/api/share-links/{link_id}", headers=auth_headers).status_code == 204
    assert client.get(f"/api/magicboard/share/{token}", headers=auth_headers).status_code == 404


def test_magicboard_suite_search(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
) -> None:
    space_id = client.post(
        f"/api/workspaces/{created_workspace['id']}/spaces",
        json={"name": "Search Space", "key": "search"},
        headers=auth_headers,
    ).json()["id"]
    client.post(
        f"/api/spaces/{space_id}/pages",
        json={"title": "UniqueAlphaDoc", "content": "suite search marker"},
        headers=auth_headers,
    )
    response = client.get(
        f"/api/workspaces/{created_workspace['id']}/suite-search",
        params={"q": "UniqueAlphaDoc"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert any(page["title"] == "UniqueAlphaDoc" for page in data["pages"])
    assert "work_items" in data


def test_magicboard_template_and_export(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
) -> None:
    templates_resp = client.get("/api/magicboard/templates", headers=auth_headers)
    assert templates_resp.status_code == 200
    templates = templates_resp.json()
    assert any(t["key"] == "meeting_notes" for t in templates)

    space_id = client.post(
        f"/api/workspaces/{created_workspace['id']}/spaces",
        json={"name": "Export Space", "key": "export"},
        headers=auth_headers,
    ).json()["id"]

    from_template = client.post(
        f"/api/spaces/{space_id}/pages/from-template",
        json={"template_key": "meeting_notes", "title": "Sprint Retro"},
        headers=auth_headers,
    )
    assert from_template.status_code == 201
    assert "Meeting notes" in from_template.json()["content"] or "# Meeting notes" in from_template.json()["content"]

    export_resp = client.get(f"/api/spaces/{space_id}/export", headers=auth_headers)
    assert export_resp.status_code == 200
    export_data = export_resp.json()
    assert export_data["space_key"] == "export"
    assert len(export_data["pages"]) >= 1

    import_resp = client.post(
        f"/api/spaces/{space_id}/import",
        json={
            "pages": [
                {"title": "Imported Page", "content": "# Imported\n\nBody text"},
            ]
        },
        headers=auth_headers,
    )
    assert import_resp.status_code == 200
    assert len(import_resp.json()) == 1
