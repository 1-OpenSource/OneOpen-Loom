import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.integration import (
    DevLinkCreate,
    DevLinkRead,
    PluginInstallCreate,
    PluginInstallRead,
    PluginInstallUpdate,
    SlackConfigRead,
    SlackConfigUpsert,
)
from app.services.integration_service import IntegrationService

router = APIRouter(tags=["integrations"])


@router.post(
    "/work-items/{work_item_id}/dev-links", response_model=DevLinkRead, status_code=status.HTTP_201_CREATED
)
def create_dev_link(
    work_item_id: uuid.UUID,
    payload: DevLinkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return IntegrationService(db).create_dev_link(work_item_id, payload, current_user)


@router.get("/work-items/{work_item_id}/dev-links", response_model=list[DevLinkRead])
def list_dev_links(
    work_item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return IntegrationService(db).list_dev_links(work_item_id, current_user)


@router.delete("/dev-links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dev_link(
    link_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    IntegrationService(db).delete_dev_link(link_id, current_user)


@router.get("/workspaces/{workspace_id}/slack-config", response_model=SlackConfigRead | None)
def get_slack_config(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return IntegrationService(db).get_slack_config(workspace_id, current_user)


@router.put("/workspaces/{workspace_id}/slack-config", response_model=SlackConfigRead)
def upsert_slack_config(
    workspace_id: uuid.UUID,
    payload: SlackConfigUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return IntegrationService(db).upsert_slack_config(workspace_id, payload, current_user)


@router.post(
    "/workspaces/{workspace_id}/plugins", response_model=PluginInstallRead, status_code=status.HTTP_201_CREATED
)
def install_plugin(
    workspace_id: uuid.UUID,
    payload: PluginInstallCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return IntegrationService(db).install_plugin(workspace_id, payload, current_user)


@router.get("/workspaces/{workspace_id}/plugins", response_model=list[PluginInstallRead])
def list_plugins(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return IntegrationService(db).list_plugins(workspace_id, current_user)


@router.put("/plugins/{plugin_id}", response_model=PluginInstallRead)
def update_plugin(
    plugin_id: uuid.UUID,
    payload: PluginInstallUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return IntegrationService(db).update_plugin(plugin_id, payload, current_user)


@router.delete("/plugins/{plugin_id}", status_code=status.HTTP_204_NO_CONTENT)
def uninstall_plugin(
    plugin_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    IntegrationService(db).uninstall_plugin(plugin_id, current_user)


@router.get("/manifest")
def get_pwa_manifest():
    return {
        "name": "OneOpen Workboard",
        "short_name": "OneOpen",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#0f172a",
        "theme_color": "#0f172a",
        "icons": [],
    }
