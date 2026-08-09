import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.notification import (
    NotificationPreferenceRead,
    NotificationPreferenceUpdate,
    NotificationRead,
    WebhookDeliveryRead,
    WebhookEndpointCreate,
    WebhookEndpointRead,
    WebhookEndpointUpdate,
)
from app.services.notification_service import NotificationService
from app.services.webhook_service import WebhookService

router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=list[NotificationRead])
def list_notifications(
    unread_only: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return NotificationService(db).list_for_user(current_user, unread_only=unread_only)


@router.get("/notifications/unread-count")
def get_unread_notification_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {"count": NotificationService(db).unread_count(current_user)}


@router.put("/notifications/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return NotificationService(db).mark_read(notification_id, current_user)


@router.put("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    NotificationService(db).mark_all_read(current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/notifications/preferences", response_model=NotificationPreferenceRead)
def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return NotificationService(db).get_preferences(current_user)


@router.put("/notifications/preferences", response_model=NotificationPreferenceRead)
def update_notification_preferences(
    payload: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return NotificationService(db).update_preferences(current_user, payload)


@router.get("/workspaces/{workspace_id}/webhooks", response_model=list[WebhookEndpointRead])
def list_webhooks(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WebhookService(db).list_endpoints(workspace_id, current_user)


@router.post(
    "/workspaces/{workspace_id}/webhooks", response_model=WebhookEndpointRead, status_code=status.HTTP_201_CREATED
)
def create_webhook(
    workspace_id: uuid.UUID,
    payload: WebhookEndpointCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WebhookService(db).create_endpoint(workspace_id, payload, current_user)


@router.put("/webhooks/{webhook_id}", response_model=WebhookEndpointRead)
def update_webhook(
    webhook_id: uuid.UUID,
    payload: WebhookEndpointUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WebhookService(db).update_endpoint(webhook_id, payload, current_user)


@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_webhook(
    webhook_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    WebhookService(db).delete_endpoint(webhook_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/webhooks/{webhook_id}/deliveries", response_model=list[WebhookDeliveryRead])
def list_webhook_deliveries(
    webhook_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WebhookService(db).list_deliveries(webhook_id, current_user)
