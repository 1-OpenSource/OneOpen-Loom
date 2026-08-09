"""Smoke tests for admin completeness features."""

from fastapi.testclient import TestClient


def test_admin_completeness_smoke(
    client: TestClient,
    auth_headers: dict[str, str],
    created_workspace: dict,
    created_project: dict,
    registered_user: dict,
) -> None:
    wid = created_workspace["id"]
    pid = created_project["id"]

    smtp = client.put(
        f"/api/workspaces/{wid}/smtp",
        json={
            "host": "smtp.test",
            "port": 587,
            "enabled": True,
            "from_email": "noreply@test.com",
        },
        headers=auth_headers,
    )
    assert smtp.status_code == 200
    assert smtp.json()["enabled"] is True

    templates = client.get(f"/api/workspaces/{wid}/email-templates", headers=auth_headers)
    assert templates.status_code == 200
    assert len(templates.json()) >= 2

    domain = client.post(
        f"/api/workspaces/{wid}/domains",
        json={"domain": "example.com"},
        headers=auth_headers,
    )
    assert domain.status_code == 201
    assert domain.json()["txt_record_name"] == "_oneopen-challenge.example.com"

    verified = client.post(
        f"/api/domains/{domain.json()['id']}/verify",
        headers=auth_headers,
    )
    assert verified.status_code == 200
    assert verified.json()["verified"] is True

    dns = client.put(
        f"/api/workspaces/{wid}/dns-provider",
        json={"provider": "mock", "enabled": True},
        headers=auth_headers,
    )
    assert dns.status_code == 200

    scheme = client.post(
        f"/api/workspaces/{wid}/issue-type-schemes",
        json={"name": "Default", "work_item_types": ["TASK", "BUG"]},
        headers=auth_headers,
    )
    assert scheme.status_code == 201
    assign = client.put(
        f"/api/projects/{pid}/issue-type-scheme",
        json={"issue_type_scheme_id": scheme.json()["id"]},
        headers=auth_headers,
    )
    assert assign.status_code == 200

    blocked = client.post(
        f"/api/projects/{pid}/work-items",
        json={"title": "Epic", "type": "EPIC", "priority": "MEDIUM"},
        headers=auth_headers,
    )
    assert blocked.status_code == 400

    allowed = client.post(
        f"/api/projects/{pid}/work-items",
        json={"title": "Task", "type": "TASK", "priority": "MEDIUM"},
        headers=auth_headers,
    )
    assert allowed.status_code == 201

    catalog = client.get(f"/api/workspaces/{wid}/marketplace/catalog", headers=auth_headers)
    assert catalog.status_code == 200
    assert len(catalog.json()) >= 1

    installed = client.post(
        f"/api/workspaces/{wid}/marketplace/install",
        json={"catalog_id": "slack-notifier"},
        headers=auth_headers,
    )
    assert installed.status_code == 201
    plugin_id = installed.json()["id"]

    disabled = client.put(
        f"/api/plugins/{plugin_id}",
        json={"enabled": False},
        headers=auth_headers,
    )
    assert disabled.status_code == 200
    assert disabled.json()["enabled"] is False

    uninstalled = client.delete(f"/api/plugins/{plugin_id}", headers=auth_headers)
    assert uninstalled.status_code == 204

    group = client.post(
        f"/api/workspaces/{wid}/groups",
        json={"name": "Developers"},
        headers=auth_headers,
    )
    assert group.status_code == 201
    group_id = group.json()["id"]

    added = client.post(
        f"/api/groups/{group_id}/members",
        json={"user_id": registered_user["id"]},
        headers=auth_headers,
    )
    assert added.status_code == 204

    groups = client.get(f"/api/workspaces/{wid}/groups", headers=auth_headers)
    assert registered_user["id"] in groups.json()[0]["member_ids"]

    removed = client.delete(
        f"/api/groups/{group_id}/members/{registered_user['id']}",
        headers=auth_headers,
    )
    assert removed.status_code == 204

    grant = client.post(
        f"/api/projects/{pid}/permission-scheme/grants",
        json={
            "permission": "PROJECT_READ",
            "holder_type": "WORKSPACE_ROLE",
            "holder_role": "MEMBER",
        },
        headers=auth_headers,
    )
    assert grant.status_code == 201

    deleted = client.delete(
        f"/api/projects/{pid}/permission-scheme/grants/{grant.json()['id']}",
        headers=auth_headers,
    )
    assert deleted.status_code == 204

    metadata = client.get(f"/api/workspaces/{wid}/sso/saml/metadata")
    assert metadata.status_code == 200
    assert "EntityDescriptor" in metadata.text

    client.put(
        f"/api/workspaces/{wid}/sso-config",
        json={
            "provider": "saml",
            "enabled": True,
            "idp_entity_id": "idp",
            "idp_sso_url": "https://idp/sso",
            "idp_x509_cert": "CERT",
        },
        headers=auth_headers,
    )
    acs = client.post(
        f"/api/workspaces/{wid}/sso/saml/acs",
        data={"email": registered_user["email"]},
    )
    assert acs.status_code == 200
    assert "access_token" in acs.json()

    overview = client.get(f"/api/projects/{pid}/overview", headers=auth_headers).json()
    statuses = overview["workflow_statuses"]
    status_by_id = {row["id"]: row["key"] for row in statuses}
    transitions = client.get(f"/api/projects/{pid}/transitions", headers=auth_headers).json()
    transition = next(
        row
        for row in transitions
        if status_by_id[row["from_status_id"]] == "TODO"
        and status_by_id[row["to_status_id"]] == "IN_PROGRESS"
    )

    rule = client.post(
        f"/api/transitions/{transition['id']}/rules",
        json={
            "kind": "VALIDATOR",
            "rule_type": "field_required",
            "config": {"field": "description"},
        },
        headers=auth_headers,
    )
    assert rule.status_code == 201

    work_item = client.post(
        f"/api/projects/{pid}/work-items",
        json={"title": "No desc", "type": "TASK", "priority": "MEDIUM", "status": "TODO"},
        headers=auth_headers,
    ).json()

    blocked_transition = client.put(
        f"/api/work-items/{work_item['id']}",
        json={"status": "IN_PROGRESS"},
        headers=auth_headers,
    )
    assert blocked_transition.status_code == 400

    client.put(
        f"/api/work-items/{work_item['id']}",
        json={"description": "filled in"},
        headers=auth_headers,
    )
    allowed_transition = client.put(
        f"/api/work-items/{work_item['id']}",
        json={"status": "IN_PROGRESS"},
        headers=auth_headers,
    )
    assert allowed_transition.status_code == 200
    assert allowed_transition.json()["status"] == "IN_PROGRESS"
