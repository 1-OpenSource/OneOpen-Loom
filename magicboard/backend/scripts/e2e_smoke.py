"""End-to-end smoke test against a running Magicboard API (default :8002)."""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from typing import Any
from uuid import uuid4

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8002"
EMAIL = "akhil@oneopen.dev"
PASSWORD = "password123"
failures: list[str] = []


def req(
    method: str,
    path: str,
    *,
    token: str | None = None,
    body: dict | None = None,
    expect: int | tuple[int, ...] = 200,
    raw_body: bytes | None = None,
    content_type: str | None = None,
) -> Any:
    data = raw_body
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    elif content_type and raw_body is not None:
        headers["Content-Type"] = content_type
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    expected = expect if isinstance(expect, tuple) else (expect,)
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            status = response.status
            raw = response.read()
            response_content_type = response.headers.get("Content-Type", "")
    except urllib.error.HTTPError as exc:
        status = exc.code
        raw = exc.read()
        response_content_type = exc.headers.get("Content-Type", "") if exc.headers else ""
    if status not in expected:
        preview = raw[:300].decode("utf-8", errors="replace") if isinstance(raw, (bytes, bytearray)) else str(raw)[:300]
        failures.append(f"{method} {path} -> {status} (expected {expected}): {preview}")
        print(f"FAIL {method} {path} -> {status}")
        return None
    print(f"OK   {method} {path} -> {status}")
    if not raw:
        return None
    if "application/json" in response_content_type or (raw[:1] in (b"{", b"[")):
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return raw
    return raw


def upload_file(path: str, token: str, filename: str, content: bytes, content_type: str = "text/plain") -> Any:
    boundary = f"----magicboard{uuid4().hex}"
    body = b"".join(
        [
            f"--{boundary}\r\n".encode(),
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode(),
            f"Content-Type: {content_type}\r\n\r\n".encode(),
            content,
            b"\r\n",
            f"--{boundary}--\r\n".encode(),
        ]
    )
    return req(
        "POST",
        path,
        token=token,
        raw_body=body,
        content_type=f"multipart/form-data; boundary={boundary}",
        expect=201,
    )


def main() -> int:
    print(f"Smoke testing Magicboard at {BASE}\n")
    stamp = f"{int(time.time())}-{uuid4().hex[:6]}"
    page_slug = f"smoke-page-{stamp}"
    child_slug = f"smoke-child-{stamp}"

    health = req("GET", "/health")
    assert health and health.get("product") == "magicboard"

    setup = req("GET", "/api/auth/setup-status")
    assert setup is not None

    login = req(
        "POST",
        "/api/auth/login",
        body={"email": EMAIL, "password": PASSWORD},
        expect=200,
    )
    if not login or "access_token" not in login:
        req(
            "POST",
            "/api/auth/register",
            body={"name": "Akhil Tiwari", "email": EMAIL, "password": PASSWORD},
            expect=(201, 409),
        )
        login = req(
            "POST",
            "/api/auth/login",
            body={"email": EMAIL, "password": PASSWORD},
        )
    if not login:
        print("\nABORT: cannot login")
        return 1
    token = login["access_token"]

    me = req("GET", "/api/auth/me", token=token)
    assert me and me.get("email") == EMAIL

    req(
        "POST",
        "/api/auth/login",
        body={"email": EMAIL, "password": "wrong-password"},
        expect=401,
    )

    workspaces = req("GET", "/api/workspaces", token=token)
    assert isinstance(workspaces, list) and len(workspaces) >= 1
    workspace_id = workspaces[0]["id"]

    ws = req("GET", f"/api/workspaces/{workspace_id}", token=token)
    assert ws and ws["id"] == workspace_id

    members = req("GET", f"/api/workspaces/{workspace_id}/members", token=token)
    assert isinstance(members, list) and len(members) >= 1

    spaces = req("GET", f"/api/workspaces/{workspace_id}/spaces", token=token)
    assert isinstance(spaces, list)
    if spaces:
        space_id = spaces[0]["id"]
    else:
        created = req(
            "POST",
            f"/api/workspaces/{workspace_id}/spaces",
            token=token,
            body={"name": "Smoke Space", "key": f"SMK{stamp[:4].upper()}"},
            expect=201,
        )
        space_id = created["id"]

    space = req("GET", f"/api/spaces/{space_id}", token=token)
    assert space

    templates = req("GET", "/api/magicboard/templates", token=token)
    assert isinstance(templates, list) and any(t.get("key") == "meeting_notes" for t in templates)

    page = req(
        "POST",
        f"/api/spaces/{space_id}/pages",
        token=token,
        body={
            "title": "Smoke Page",
            "slug": page_slug,
            "content": "# Smoke\n\nHello {{toc}}\n\n## Section\n\nBody",
            "status": "PUBLISHED",
        },
        expect=201,
    )
    assert page and page.get("slug") == page_slug
    page_id = page["id"]

    child = req(
        "POST",
        f"/api/spaces/{space_id}/pages",
        token=token,
        body={
            "title": "Child",
            "slug": child_slug,
            "content": "Child body",
            "parent_page_id": page_id,
        },
        expect=201,
    )
    assert child

    tree = req("GET", f"/api/spaces/{space_id}/pages/tree", token=token)
    assert isinstance(tree, list)

    flat = req("GET", f"/api/spaces/{space_id}/pages", token=token)
    assert isinstance(flat, list) and len(flat) >= 1

    updated = req(
        "PUT",
        f"/api/pages/{page_id}",
        token=token,
        body={"title": "Smoke Page Updated", "content": "# Updated\n\nVersion two", "status": "DRAFT"},
    )
    assert updated and updated["title"] == "Smoke Page Updated"
    assert updated["status"] == "DRAFT"

    versions = req("GET", f"/api/pages/{page_id}/versions", token=token)
    assert isinstance(versions, list) and len(versions) >= 1

    if versions:
        restored = req(
            "POST",
            f"/api/pages/{page_id}/restore/{versions[-1]['id']}",
            token=token,
        )
        assert restored

    comment = req(
        "POST",
        f"/api/pages/{page_id}/comments",
        token=token,
        body={"body": "Smoke comment"},
        expect=201,
    )
    assert comment
    comments = req("GET", f"/api/pages/{page_id}/comments", token=token)
    assert isinstance(comments, list) and len(comments) >= 1
    req("DELETE", f"/api/page-comments/{comment['id']}", token=token, expect=204)

    req("POST", f"/api/pages/{page_id}/watch", token=token, expect=204)
    req("DELETE", f"/api/pages/{page_id}/watch", token=token, expect=204)
    req("POST", f"/api/pages/{page_id}/favorite", token=token, expect=204)
    req("POST", f"/api/pages/{page_id}/view", token=token, expect=204)

    favorites = req("GET", f"/api/workspaces/{workspace_id}/magicboard/favorites", token=token)
    assert isinstance(favorites, list)
    recent = req("GET", f"/api/workspaces/{workspace_id}/magicboard/recent", token=token)
    assert isinstance(recent, list)

    share = req("POST", f"/api/pages/{page_id}/share-links", token=token, expect=201)
    assert share and share.get("token")
    resolved = req("GET", f"/api/magicboard/share/{share['token']}", token=token)
    assert resolved and resolved.get("page_id") == page_id
    req("DELETE", f"/api/share-links/{share['id']}", token=token, expect=204)
    req("GET", f"/api/magicboard/share/{share['token']}", token=token, expect=404)

    path = req(
        "GET",
        f"/api/workspaces/{workspace_id}/magicboard/resolve?space_key={space['key']}&page_slug={page_slug}",
        token=token,
    )
    assert path and path.get("page_id") == page_id

    search = req(
        "GET",
        f"/api/workspaces/{workspace_id}/suite-search?q=Smoke",
        token=token,
    )
    assert search and "pages" in search and "work_items" in search
    assert search["work_items"] == []

    export = req("GET", f"/api/spaces/{space_id}/export", token=token)
    assert export and "pages" in export

    from_template = req(
        "POST",
        f"/api/spaces/{space_id}/pages/from-template",
        token=token,
        body={"template_key": "meeting_notes", "title": f"Smoke Meeting {stamp}"},
        expect=201,
    )
    assert from_template

    imported = req(
        "POST",
        f"/api/spaces/{space_id}/import",
        token=token,
        body={"pages": [{"title": f"Imported Smoke {stamp}", "content": "# Imported"}]},
    )
    assert isinstance(imported, list) and len(imported) >= 1

    attachment = upload_file(
        f"/api/pages/{page_id}/attachments",
        token,
        "smoke.txt",
        b"magicboard smoke attachment",
    )
    assert attachment and attachment.get("id")
    downloaded = req("GET", f"/api/page-attachments/{attachment['id']}/download", token=token)
    assert downloaded == b"magicboard smoke attachment"
    listed = req("GET", f"/api/pages/{page_id}/attachments", token=token)
    assert isinstance(listed, list) and any(item.get("id") == attachment["id"] for item in listed)
    req("DELETE", f"/api/page-attachments/{attachment['id']}", token=token, expect=204)

    req("DELETE", f"/api/pages/{page_id}", token=token, expect=(204, 404))
    if child:
        req("DELETE", f"/api/pages/{child['id']}", token=token, expect=(204, 404))

    print("\n======== SUMMARY ========")
    if failures:
        print(f"{len(failures)} failure(s):")
        for item in failures:
            print(f" - {item}")
        return 1
    print("All smoke checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
