import json
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification import WebhookDelivery, WebhookEndpoint
from app.models.user import User
from app.schemas.notification import WebhookEndpointCreate, WebhookEndpointUpdate
from app.services.access_service import WORKSPACE_ADMIN_ROLES, AccessService


class WebhookService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def list_endpoints(self, workspace_id: uuid.UUID, user: User) -> list[WebhookEndpoint]:
        self.access.require_workspace_member(workspace_id, user)
        statement = select(WebhookEndpoint).where(WebhookEndpoint.workspace_id == workspace_id)
        return list(self.db.scalars(statement).all())

    def create_endpoint(
        self, workspace_id: uuid.UUID, payload: WebhookEndpointCreate, user: User
    ) -> WebhookEndpoint:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        endpoint = WebhookEndpoint(
            workspace_id=workspace_id,
            project_id=payload.project_id,
            url=payload.url,
            secret=payload.secret,
            events=payload.events,
            is_active=payload.is_active,
        )
        self.db.add(endpoint)
        self.db.commit()
        return endpoint

    def update_endpoint(
        self, endpoint_id: uuid.UUID, payload: WebhookEndpointUpdate, user: User
    ) -> WebhookEndpoint:
        endpoint = self.db.get(WebhookEndpoint, endpoint_id)
        if not endpoint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found.")
        self.access.require_workspace_roles(endpoint.workspace_id, user, WORKSPACE_ADMIN_ROLES)
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            setattr(endpoint, key, value)
        self.db.commit()
        return endpoint

    def delete_endpoint(self, endpoint_id: uuid.UUID, user: User) -> None:
        endpoint = self.db.get(WebhookEndpoint, endpoint_id)
        if not endpoint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found.")
        self.access.require_workspace_roles(endpoint.workspace_id, user, WORKSPACE_ADMIN_ROLES)
        self.db.delete(endpoint)
        self.db.commit()

    def list_deliveries(self, endpoint_id: uuid.UUID, user: User) -> list[WebhookDelivery]:
        endpoint = self.db.get(WebhookEndpoint, endpoint_id)
        if not endpoint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found.")
        self.access.require_workspace_member(endpoint.workspace_id, user)
        statement = select(WebhookDelivery).where(WebhookDelivery.webhook_id == endpoint_id)
        return list(self.db.scalars(statement).all())

    def dispatch(
        self, workspace_id: uuid.UUID, project_id: uuid.UUID | None, event: str, payload: dict
    ) -> None:
        statement = select(WebhookEndpoint).where(
            WebhookEndpoint.workspace_id == workspace_id, WebhookEndpoint.is_active.is_(True)
        )
        endpoints = list(self.db.scalars(statement).all())
        if not endpoints:
            return
        for endpoint in endpoints:
            if endpoint.project_id and project_id and endpoint.project_id != project_id:
                continue
            if endpoint.events and event not in endpoint.events:
                continue
            delivery = WebhookDelivery(webhook_id=endpoint.id, event=event, payload_json=payload)
            try:
                data = json.dumps(payload, default=str).encode("utf-8")
                request = urllib.request.Request(
                    endpoint.url, data=data, headers={"Content-Type": "application/json"}, method="POST"
                )
                with urllib.request.urlopen(request, timeout=2) as response:  # noqa: S310
                    delivery.response_status = response.status
            except Exception:
                delivery.response_status = None
            delivery.delivered_at = datetime.now(timezone.utc)
            self.db.add(delivery)
        self.db.commit()
