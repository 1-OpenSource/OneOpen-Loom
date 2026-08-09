import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.integration import DevLink, PluginInstall, SlackConfig
from app.models.user import User
from app.models.work_item import WorkItem
from app.schemas.admin import MarketplaceCatalogItem
from app.schemas.integration import (
    DevLinkCreate,
    PluginInstallCreate,
    PluginInstallUpdate,
    SlackConfigUpsert,
)
from app.services.access_service import WORKSPACE_ADMIN_ROLES, AccessService

MARKETPLACE_CATALOG: list[dict] = [
    {
        "id": "time-tracking-plus",
        "name": "Time Tracking Plus",
        "description": "Enhanced worklog summaries and estimate burn-down gadgets.",
        "version": "1.0.0",
        "manifest": {"permissions": ["worklog:read", "worklog:write"], "entry": "time-tracking"},
    },
    {
        "id": "slack-notifier",
        "name": "Slack Notifier",
        "description": "Push work item and sprint events into Slack channels.",
        "version": "1.1.0",
        "manifest": {"permissions": ["notifications:write"], "entry": "slack"},
    },
    {
        "id": "csv-importer",
        "name": "CSV Importer",
        "description": "Bulk-import work items from CSV templates.",
        "version": "0.9.0",
        "manifest": {"permissions": ["work_items:write"], "entry": "csv-import"},
    },
]


class IntegrationService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def create_dev_link(self, work_item_id: uuid.UUID, payload: DevLinkCreate, user: User) -> DevLink:
        work_item = self.db.get(WorkItem, work_item_id)
        if not work_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
        self.access.require_project_write(work_item.project_id, user)
        link = DevLink(
            work_item_id=work_item_id,
            provider=payload.provider,
            link_type=payload.link_type,
            url=payload.url,
            title=payload.title,
            status=payload.status,
        )
        self.db.add(link)
        self.db.commit()
        return link

    def list_dev_links(self, work_item_id: uuid.UUID, user: User) -> list[DevLink]:
        work_item = self.db.get(WorkItem, work_item_id)
        if not work_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
        self.access.require_project_read(work_item.project_id, user)
        return list(self.db.scalars(select(DevLink).where(DevLink.work_item_id == work_item_id)).all())

    def delete_dev_link(self, link_id: uuid.UUID, user: User) -> None:
        link = self.db.get(DevLink, link_id)
        if not link:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dev link not found.")
        work_item = self.db.get(WorkItem, link.work_item_id)
        self.access.require_project_write(work_item.project_id, user)
        self.db.delete(link)
        self.db.commit()

    def get_slack_config(self, workspace_id: uuid.UUID, user: User) -> SlackConfig | None:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        return self.db.scalar(select(SlackConfig).where(SlackConfig.workspace_id == workspace_id))

    def upsert_slack_config(
        self, workspace_id: uuid.UUID, payload: SlackConfigUpsert, user: User
    ) -> SlackConfig:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        config = self.db.scalar(select(SlackConfig).where(SlackConfig.workspace_id == workspace_id))
        if not config:
            config = SlackConfig(workspace_id=workspace_id)
            self.db.add(config)
        config.webhook_url = payload.webhook_url
        config.default_channel = payload.default_channel
        config.enabled = payload.enabled
        self.db.commit()
        return config

    def install_plugin(
        self, workspace_id: uuid.UUID, payload: PluginInstallCreate, user: User
    ) -> PluginInstall:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        plugin = PluginInstall(
            workspace_id=workspace_id, name=payload.name, manifest_json=payload.manifest_json
        )
        self.db.add(plugin)
        self.db.commit()
        return plugin

    def list_plugins(self, workspace_id: uuid.UUID, user: User) -> list[PluginInstall]:
        self.access.require_workspace_member(workspace_id, user)
        return list(
            self.db.scalars(select(PluginInstall).where(PluginInstall.workspace_id == workspace_id)).all()
        )

    def update_plugin(
        self, plugin_id: uuid.UUID, payload: PluginInstallUpdate, user: User
    ) -> PluginInstall:
        plugin = self.db.get(PluginInstall, plugin_id)
        if not plugin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plugin not found.")
        self.access.require_workspace_roles(plugin.workspace_id, user, WORKSPACE_ADMIN_ROLES)
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            setattr(plugin, key, value)
        self.db.commit()
        return plugin

    def uninstall_plugin(self, plugin_id: uuid.UUID, user: User) -> None:
        plugin = self.db.get(PluginInstall, plugin_id)
        if not plugin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plugin not found.")
        self.access.require_workspace_roles(plugin.workspace_id, user, WORKSPACE_ADMIN_ROLES)
        self.db.delete(plugin)
        self.db.commit()

    def marketplace_catalog(
        self, workspace_id: uuid.UUID, user: User
    ) -> list[MarketplaceCatalogItem]:
        self.access.require_workspace_member(workspace_id, user)
        return [MarketplaceCatalogItem.model_validate(item) for item in MARKETPLACE_CATALOG]

    def install_from_catalog(
        self, workspace_id: uuid.UUID, catalog_id: str, user: User
    ) -> PluginInstall:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_ADMIN_ROLES)
        item = next((entry for entry in MARKETPLACE_CATALOG if entry["id"] == catalog_id), None)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catalog item not found.")
        existing = self.db.scalar(
            select(PluginInstall).where(
                PluginInstall.workspace_id == workspace_id, PluginInstall.name == item["name"]
            )
        )
        if existing:
            existing.manifest_json = {
                **(existing.manifest_json or {}),
                **item["manifest"],
                "catalog_id": item["id"],
                "version": item["version"],
            }
            existing.enabled = True
            self.db.commit()
            return existing
        plugin = PluginInstall(
            workspace_id=workspace_id,
            name=item["name"],
            manifest_json={**item["manifest"], "catalog_id": item["id"], "version": item["version"]},
            enabled=True,
        )
        self.db.add(plugin)
        self.db.commit()
        return plugin
