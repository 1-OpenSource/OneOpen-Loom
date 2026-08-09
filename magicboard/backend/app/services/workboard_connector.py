"""Optional HTTP client for Workboard when WORKBOARD_API_URL is set."""

from __future__ import annotations

import uuid

import httpx

from app.core.config import get_settings


class WorkboardConnector:
    def __init__(self, authorization: str | None = None):
        settings = get_settings()
        self.base_url = (settings.workboard_api_url or "").rstrip("/")
        self.authorization = authorization

    @property
    def enabled(self) -> bool:
        return bool(self.base_url)

    def _headers(self) -> dict[str, str]:
        headers = {"Accept": "application/json"}
        if self.authorization:
            headers["Authorization"] = self.authorization
        return headers

    def get_work_item_by_key(self, workspace_id: uuid.UUID, key: str) -> dict | None:
        if not self.enabled:
            return None
        url = f"{self.base_url}/api/workspaces/{workspace_id}/work-items/by-key/{key}"
        try:
            response = httpx.get(url, headers=self._headers(), timeout=8.0)
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError:
            return None

    def search_work_items(self, workspace_id: uuid.UUID, query: str) -> list[dict]:
        if not self.enabled or not query.strip():
            return []
        url = f"{self.base_url}/api/workspaces/{workspace_id}/work-items/search"
        try:
            response = httpx.get(
                url,
                headers=self._headers(),
                params={"q": query},
                timeout=8.0,
            )
            if response.status_code >= 400:
                return []
            data = response.json()
            if isinstance(data, list):
                return data
            if isinstance(data, dict):
                return data.get("items") or data.get("work_items") or []
            return []
        except httpx.HTTPError:
            return []
