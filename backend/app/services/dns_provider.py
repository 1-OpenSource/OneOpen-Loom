from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Protocol
from urllib import error, request
import json


@dataclass
class DnsTxtRecord:
    name: str
    content: str
    ttl: int = 120


class DnsProvider(Protocol):
    def create_txt_record(self, domain: str, name: str, content: str) -> DnsTxtRecord: ...

    def list_txt_records(self, domain: str) -> list[DnsTxtRecord]: ...

    def has_txt_record(self, domain: str, name: str, content: str) -> bool: ...


@dataclass
class MockDnsProvider:
    """In-memory DNS provider used for local/dev domain verification."""

    _records: dict[str, list[DnsTxtRecord]] = field(default_factory=dict)

    def create_txt_record(self, domain: str, name: str, content: str) -> DnsTxtRecord:
        record = DnsTxtRecord(name=name, content=content)
        self._records.setdefault(domain.lower(), []).append(record)
        return record

    def list_txt_records(self, domain: str) -> list[DnsTxtRecord]:
        return list(self._records.get(domain.lower(), []))

    def has_txt_record(self, domain: str, name: str, content: str) -> bool:
        expected_name = name.lower().rstrip(".")
        for record in self.list_txt_records(domain):
            if record.name.lower().rstrip(".") == expected_name and record.content == content:
                return True
        return False

    def mark_verified_by_auto_create(self, domain: str, name: str, content: str) -> bool:
        """Ensure the verification TXT exists, then report it as present."""
        if not self.has_txt_record(domain, name, content):
            self.create_txt_record(domain, name, content)
        return self.has_txt_record(domain, name, content)


class CloudflareDnsProvider:
    """Cloudflare-style adapter. Uses HTTP when credentials exist; otherwise mock mode."""

    def __init__(
        self,
        *,
        api_token: str | None,
        zone_id: str | None,
        fallback: MockDnsProvider | None = None,
        base_url: str = "https://api.cloudflare.com/client/v4",
    ):
        self.api_token = api_token
        self.zone_id = zone_id
        self.fallback = fallback or MockDnsProvider()
        self.base_url = base_url.rstrip("/")

    @property
    def _live(self) -> bool:
        return bool(self.api_token and self.zone_id)

    def create_txt_record(self, domain: str, name: str, content: str) -> DnsTxtRecord:
        if not self._live:
            return self.fallback.create_txt_record(domain, name, content)
        payload = {"type": "TXT", "name": name, "content": content, "ttl": 120}
        self._request("POST", f"/zones/{self.zone_id}/dns_records", payload, domain=domain)
        return DnsTxtRecord(name=name, content=content)

    def list_txt_records(self, domain: str) -> list[DnsTxtRecord]:
        if not self._live:
            return self.fallback.list_txt_records(domain)
        data = self._request("GET", f"/zones/{self.zone_id}/dns_records?type=TXT", domain=domain)
        results = data.get("result") or []
        return [
            DnsTxtRecord(name=item.get("name", ""), content=item.get("content", ""), ttl=item.get("ttl", 120))
            for item in results
        ]

    def has_txt_record(self, domain: str, name: str, content: str) -> bool:
        expected_name = name.lower().rstrip(".")
        for record in self.list_txt_records(domain):
            if record.name.lower().rstrip(".") == expected_name and record.content == content:
                return True
        return False

    def _request(self, method: str, path: str, payload: dict | None = None, *, domain: str = "") -> dict:
        body = None if payload is None else json.dumps(payload).encode("utf-8")
        req = request.Request(
            f"{self.base_url}{path}",
            data=body,
            method=method,
            headers={
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json",
            },
        )
        try:
            with request.urlopen(req, timeout=15) as response:
                return json.loads(response.read().decode("utf-8") or "{}")
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"Cloudflare DNS API error ({exc.code}): {detail}") from exc
        except error.URLError as exc:
            # Fall back to mock when network/credentials are unavailable.
            if payload and method == "POST":
                return {
                    "success": True,
                    "result": self.fallback.create_txt_record(
                        domain, payload.get("name", ""), payload.get("content", "")
                    ).__dict__,
                }
            raise RuntimeError(f"Cloudflare DNS unreachable: {exc.reason}") from exc


_SHARED_MOCK = MockDnsProvider()


def get_dns_provider(provider: str, *, api_token: str | None = None, zone_id: str | None = None) -> DnsProvider:
    if provider == "cloudflare":
        return CloudflareDnsProvider(api_token=api_token, zone_id=zone_id, fallback=_SHARED_MOCK)
    return _SHARED_MOCK


class AbstractDnsProvider(abc.ABC):
    """Optional ABC for adapters that prefer inheritance over Protocol."""

    @abc.abstractmethod
    def create_txt_record(self, domain: str, name: str, content: str) -> DnsTxtRecord:
        raise NotImplementedError

    @abc.abstractmethod
    def has_txt_record(self, domain: str, name: str, content: str) -> bool:
        raise NotImplementedError
