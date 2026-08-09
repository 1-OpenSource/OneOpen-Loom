import re
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.space import (
    Space,
    SpaceMember,
    SpaceMemberRole,
    SpacePage,
    SpacePageAttachment,
    SpacePageComment,
    SpacePageFavorite,
    SpacePageRecent,
    SpacePageShareLink,
    SpacePageStatus,
    SpacePageVersion,
    SpacePageWatch,
    SpaceWatch,
    WorkItemPage,
)
from app.models.user import User
from app.models.work_item import WorkItem
from app.models.workspace import WorkspaceRole
from app.schemas.space import (
    MarkdownPageImport,
    SpaceCreate,
    SpaceMemberEntry,
    SpacePageCreate,
    SpacePageFromTemplateCreate,
    SpacePageUpdate,
    SpaceUpdate,
)
from app.services.access_service import AccessService
from app.services.storage_service import StorageService

ROLE_RANK = {
    SpaceMemberRole.VIEW: 1,
    SpaceMemberRole.EDIT: 2,
    SpaceMemberRole.ADMIN: 3,
}

MAGICBOARD_TEMPLATES: dict[str, dict[str, str]] = {
    "blank": {
        "title": "Blank page",
        "description": "Start with an empty page.",
        "default_content": "",
    },
    "meeting_notes": {
        "title": "Meeting notes",
        "description": "Capture attendees, agenda, and action items.",
        "default_content": (
            "# Meeting notes\n\n"
            "## Date\n\n"
            "## Attendees\n\n"
            "- \n\n"
            "## Agenda\n\n"
            "1. \n\n"
            "## Notes\n\n"
            "## Action items\n\n"
            "- [ ] \n"
        ),
    },
    "decision_record": {
        "title": "Decision record",
        "description": "Document context, options, and the decision made.",
        "default_content": (
            "# Decision record\n\n"
            "## Status\n\n"
            "Proposed\n\n"
            "## Context\n\n"
            "## Options considered\n\n"
            "1. \n\n"
            "## Decision\n\n"
            "## Consequences\n\n"
        ),
    },
    "runbook": {
        "title": "Runbook",
        "description": "Operational steps for a repeatable procedure.",
        "default_content": (
            "# Runbook\n\n"
            "## Overview\n\n"
            "## Prerequisites\n\n"
            "- \n\n"
            "## Steps\n\n"
            "1. \n\n"
            "## Rollback\n\n"
            "## Contacts\n\n"
        ),
    },
}


def slugify(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return normalized or "page"


class SpaceService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def _slugify_space_key(self, value: str) -> str:
        normalized = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
        return (normalized or "space")[:40]

    def _generate_unique_space_key(self, workspace_id: uuid.UUID, base: str) -> str:
        candidate_base = self._slugify_space_key(base)
        candidate = candidate_base
        suffix = 0
        while self.db.scalar(
            select(Space.id).where(
                Space.workspace_id == workspace_id,
                func.lower(Space.key) == candidate.lower(),
            )
        ):
            suffix += 1
            candidate = f"{candidate_base}-{suffix}"[:40]
        return candidate

    def _generate_unique_page_slug(self, space_id: uuid.UUID, base: str) -> str:
        candidate_base = slugify(base)[:180]
        candidate = candidate_base
        suffix = 0
        while self.db.scalar(
            select(SpacePage.id).where(
                SpacePage.space_id == space_id,
                func.lower(SpacePage.slug) == candidate.lower(),
                SpacePage.archived_at.is_(None),
            )
        ):
            suffix += 1
            candidate = f"{candidate_base}-{suffix}"[:200]
        return candidate

    def _get_space_members(self, space_id: uuid.UUID) -> list[SpaceMember]:
        return list(self.db.scalars(select(SpaceMember).where(SpaceMember.space_id == space_id)).all())

    def _resolve_space_role(self, space: Space, user: User) -> SpaceMemberRole:
        members = self._get_space_members(space.id)
        if members:
            member = next((m for m in members if m.user_id == user.id), None)
            if not member:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have access to this space.",
                )
            return member.role
        workspace_member = self.access.require_workspace_member(space.workspace_id, user)
        if workspace_member.role == WorkspaceRole.VIEWER:
            return SpaceMemberRole.VIEW
        if workspace_member.role in {WorkspaceRole.OWNER, WorkspaceRole.ADMIN}:
            return SpaceMemberRole.ADMIN
        return SpaceMemberRole.EDIT

    def _require_space_role(
        self, space: Space, user: User, minimum: SpaceMemberRole
    ) -> SpaceMemberRole:
        role = self._resolve_space_role(space, user)
        if ROLE_RANK[role] < ROLE_RANK[minimum]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return role

    def _get_space(self, space_id: uuid.UUID) -> Space:
        space = self.db.get(Space, space_id)
        if not space or space.archived_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found.")
        return space

    def _get_page(self, page_id: uuid.UUID, *, include_archived: bool = False) -> SpacePage:
        page = self.db.get(SpacePage, page_id)
        if not page or (not include_archived and page.archived_at is not None):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found.")
        return page

    def create_space(self, workspace_id: uuid.UUID, payload: SpaceCreate, user: User) -> Space:
        self.access.require_workspace_member(workspace_id, user)
        space_key = payload.key.strip() if payload.key else self._generate_unique_space_key(
            workspace_id, payload.name
        )
        if payload.key and self.db.scalar(
            select(Space.id).where(
                Space.workspace_id == workspace_id,
                func.lower(Space.key) == space_key.lower(),
            )
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A space with this key already exists in the workspace.",
            )
        space = Space(
            workspace_id=workspace_id,
            key=space_key,
            name=payload.name,
            description=payload.description,
            created_by_user_id=user.id,
        )
        self.db.add(space)
        self.db.commit()
        self.db.refresh(space)
        return space

    def list_spaces(self, workspace_id: uuid.UUID, user: User) -> list[Space]:
        self.access.require_workspace_member(workspace_id, user)
        statement = (
            select(Space)
            .where(Space.workspace_id == workspace_id, Space.archived_at.is_(None))
            .order_by(Space.name.asc())
        )
        return list(self.db.scalars(statement).all())

    def get_space(self, space_id: uuid.UUID, user: User) -> Space:
        space = self._get_space(space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        return space

    def update_space(self, space_id: uuid.UUID, payload: SpaceUpdate, user: User) -> Space:
        space = self._get_space(space_id)
        self._require_space_role(space, user, SpaceMemberRole.ADMIN)
        values = payload.model_dump(exclude_unset=True)
        if "key" in values and values["key"] is not None:
            new_key = values["key"].strip()
            existing = self.db.scalar(
                select(Space.id).where(
                    Space.workspace_id == space.workspace_id,
                    func.lower(Space.key) == new_key.lower(),
                    Space.id != space.id,
                )
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A space with this key already exists in the workspace.",
                )
            values["key"] = new_key
        for key, value in values.items():
            setattr(space, key, value)
        self.db.commit()
        self.db.refresh(space)
        return space

    def delete_space(self, space_id: uuid.UUID, user: User) -> None:
        space = self._get_space(space_id)
        self._require_space_role(space, user, SpaceMemberRole.ADMIN)
        self.db.delete(space)
        self.db.commit()

    def archive_space(self, space_id: uuid.UUID, user: User) -> Space:
        space = self._get_space(space_id)
        self._require_space_role(space, user, SpaceMemberRole.ADMIN)
        space.archived_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(space)
        return space

    def create_page(self, space_id: uuid.UUID, payload: SpacePageCreate, user: User) -> SpacePage:
        space = self._get_space(space_id)
        self._require_space_role(space, user, SpaceMemberRole.EDIT)
        page_slug = payload.slug.strip() if payload.slug else self._generate_unique_page_slug(
            space_id, payload.title
        )
        if payload.slug and self.db.scalar(
            select(SpacePage.id).where(
                SpacePage.space_id == space_id,
                func.lower(SpacePage.slug) == page_slug.lower(),
                SpacePage.archived_at.is_(None),
            )
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A page with this slug already exists in the space.",
            )
        page = SpacePage(
            space_id=space_id,
            parent_page_id=payload.parent_page_id,
            title=payload.title,
            slug=page_slug,
            content=payload.content,
            status=payload.status,
            icon=payload.icon,
            owner_user_id=payload.owner_user_id or user.id,
            template_key=payload.template_key,
            labels_json=payload.labels,
            position=payload.position,
            created_by_user_id=user.id,
        )
        self.db.add(page)
        self.db.flush()
        self.db.add(SpacePageVersion(page_id=page.id, content=payload.content, edited_by_user_id=user.id))
        self.db.commit()
        self.db.refresh(page)
        return page

    def get_page(self, page_id: uuid.UUID, user: User) -> SpacePage:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        return page

    def update_page(self, page_id: uuid.UUID, payload: SpacePageUpdate, user: User) -> SpacePage:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.EDIT)
        values = payload.model_dump(exclude_unset=True)
        if "labels" in values:
            page.labels_json = values.pop("labels") or []
        if "slug" in values and values["slug"] is not None:
            new_slug = values["slug"].strip()
            existing = self.db.scalar(
                select(SpacePage.id).where(
                    SpacePage.space_id == page.space_id,
                    func.lower(SpacePage.slug) == new_slug.lower(),
                    SpacePage.id != page.id,
                    SpacePage.archived_at.is_(None),
                )
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A page with this slug already exists in the space.",
                )
            values["slug"] = new_slug
        for key, value in values.items():
            setattr(page, key, value)
        if "content" in values:
            self.db.add(SpacePageVersion(page_id=page.id, content=payload.content, edited_by_user_id=user.id))
        self.db.commit()
        self.db.refresh(page)
        return page

    def delete_page(self, page_id: uuid.UUID, user: User) -> None:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.EDIT)
        self.db.delete(page)
        self.db.commit()

    def archive_page(self, page_id: uuid.UUID, user: User) -> SpacePage:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.EDIT)
        page.archived_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(page)
        return page

    def list_pages_flat(self, space_id: uuid.UUID, user: User) -> list[SpacePage]:
        space = self._get_space(space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        statement = (
            select(SpacePage)
            .where(SpacePage.space_id == space_id, SpacePage.archived_at.is_(None))
            .order_by(SpacePage.position.asc(), SpacePage.title.asc())
        )
        return list(self.db.scalars(statement).all())

    def list_page_tree(self, space_id: uuid.UUID, user: User) -> list[dict]:
        space = self._get_space(space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        pages = list(
            self.db.scalars(
                select(SpacePage)
                .where(SpacePage.space_id == space_id, SpacePage.archived_at.is_(None))
                .order_by(SpacePage.position.asc())
            ).all()
        )
        by_parent: dict[uuid.UUID | None, list[SpacePage]] = {}
        for page in pages:
            by_parent.setdefault(page.parent_page_id, []).append(page)

        def build(parent_id: uuid.UUID | None) -> list[dict]:
            return [
                {
                    "id": page.id,
                    "title": page.title,
                    "slug": page.slug,
                    "position": page.position,
                    "children": build(page.id),
                }
                for page in by_parent.get(parent_id, [])
            ]

        return build(None)

    def list_versions(self, page_id: uuid.UUID, user: User) -> list[SpacePageVersion]:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        statement = (
            select(SpacePageVersion)
            .where(SpacePageVersion.page_id == page_id)
            .order_by(SpacePageVersion.created_at.desc(), SpacePageVersion.id.desc())
        )
        return list(self.db.scalars(statement).all())

    def restore_version(self, page_id: uuid.UUID, version_id: uuid.UUID, user: User) -> SpacePage:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.EDIT)
        version = self.db.get(SpacePageVersion, version_id)
        if not version or version.page_id != page_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found.")
        page.content = version.content
        self.db.add(
            SpacePageVersion(page_id=page.id, content=version.content, edited_by_user_id=user.id)
        )
        self.db.commit()
        self.db.refresh(page)
        return page

    def link_page_to_work_item(self, work_item_id: uuid.UUID, page_id: uuid.UUID, user: User) -> None:
        work_item = self.db.get(WorkItem, work_item_id)
        if not work_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
        self.access.require_project_write(work_item.project_id, user)
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        existing = self.db.scalar(
            select(WorkItemPage).where(
                WorkItemPage.work_item_id == work_item_id, WorkItemPage.page_id == page.id
            )
        )
        if not existing:
            self.db.add(WorkItemPage(work_item_id=work_item_id, page_id=page.id))
            self.db.commit()

    def unlink_page_from_work_item(
        self, work_item_id: uuid.UUID, page_id: uuid.UUID, user: User
    ) -> None:
        work_item = self.db.get(WorkItem, work_item_id)
        if not work_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
        self.access.require_project_write(work_item.project_id, user)
        link = self.db.scalar(
            select(WorkItemPage).where(
                WorkItemPage.work_item_id == work_item_id, WorkItemPage.page_id == page_id
            )
        )
        if link:
            self.db.delete(link)
            self.db.commit()

    def list_pages_for_work_item(self, work_item_id: uuid.UUID, user: User) -> list[SpacePage]:
        work_item = self.db.get(WorkItem, work_item_id)
        if not work_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
        self.access.require_project_read(work_item.project_id, user)
        statement = (
            select(SpacePage)
            .join(WorkItemPage, WorkItemPage.page_id == SpacePage.id)
            .where(WorkItemPage.work_item_id == work_item_id, SpacePage.archived_at.is_(None))
        )
        return list(self.db.scalars(statement).all())

    def list_work_items_for_page(self, page_id: uuid.UUID, user: User) -> list[WorkItem]:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        statement = (
            select(WorkItem)
            .join(WorkItemPage, WorkItemPage.work_item_id == WorkItem.id)
            .where(WorkItemPage.page_id == page_id)
        )
        items = list(self.db.scalars(statement).all())
        for item in items:
            self.access.require_project_read(item.project_id, user)
        return items

    def search_pages(self, workspace_id: uuid.UUID, query: str, user: User) -> list[dict]:
        self.access.require_workspace_member(workspace_id, user)
        q = query.strip()
        if not q:
            return []
        pattern = f"%{q.lower()}%"
        statement = (
            select(SpacePage, Space)
            .join(Space, Space.id == SpacePage.space_id)
            .where(
                Space.workspace_id == workspace_id,
                Space.archived_at.is_(None),
                SpacePage.archived_at.is_(None),
                or_(
                    func.lower(SpacePage.title).like(pattern),
                    func.lower(SpacePage.content).like(pattern),
                    func.lower(SpacePage.slug).like(pattern),
                ),
            )
            .order_by(SpacePage.updated_at.desc())
            .limit(50)
        )
        results: list[dict] = []
        for page, space in self.db.execute(statement).all():
            try:
                self._require_space_role(space, user, SpaceMemberRole.VIEW)
            except HTTPException:
                continue
            snippet = None
            if page.content and q.lower() in page.content.lower():
                idx = page.content.lower().index(q.lower())
                start = max(0, idx - 40)
                snippet = page.content[start : start + 120]
            results.append(
                {
                    "page_id": page.id,
                    "space_id": space.id,
                    "space_key": space.key,
                    "title": page.title,
                    "slug": page.slug,
                    "snippet": snippet,
                }
            )
        return results

    def add_comment(self, page_id: uuid.UUID, body: str, user: User) -> SpacePageComment:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.EDIT)
        comment = SpacePageComment(page_id=page_id, user_id=user.id, body=body)
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def list_comments(self, page_id: uuid.UUID, user: User) -> list[SpacePageComment]:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        statement = (
            select(SpacePageComment)
            .where(SpacePageComment.page_id == page_id)
            .order_by(SpacePageComment.created_at.asc())
        )
        return list(self.db.scalars(statement).all())

    def delete_comment(self, comment_id: uuid.UUID, user: User) -> None:
        comment = self.db.get(SpacePageComment, comment_id)
        if not comment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found.")
        page = self._get_page(comment.page_id)
        space = self._get_space(page.space_id)
        role = self._require_space_role(space, user, SpaceMemberRole.VIEW)
        if comment.user_id != user.id and role != SpaceMemberRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this comment.",
            )
        self.db.delete(comment)
        self.db.commit()

    def watch_page(self, page_id: uuid.UUID, user: User) -> None:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        existing = self.db.scalar(
            select(SpacePageWatch).where(
                SpacePageWatch.page_id == page_id, SpacePageWatch.user_id == user.id
            )
        )
        if not existing:
            self.db.add(SpacePageWatch(page_id=page_id, user_id=user.id))
            self.db.commit()

    def unwatch_page(self, page_id: uuid.UUID, user: User) -> None:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        watch = self.db.scalar(
            select(SpacePageWatch).where(
                SpacePageWatch.page_id == page_id, SpacePageWatch.user_id == user.id
            )
        )
        if watch:
            self.db.delete(watch)
            self.db.commit()

    def watch_space(self, space_id: uuid.UUID, user: User) -> None:
        space = self._get_space(space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        existing = self.db.scalar(
            select(SpaceWatch).where(SpaceWatch.space_id == space_id, SpaceWatch.user_id == user.id)
        )
        if not existing:
            self.db.add(SpaceWatch(space_id=space_id, user_id=user.id))
            self.db.commit()

    def unwatch_space(self, space_id: uuid.UUID, user: User) -> None:
        space = self._get_space(space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        watch = self.db.scalar(
            select(SpaceWatch).where(SpaceWatch.space_id == space_id, SpaceWatch.user_id == user.id)
        )
        if watch:
            self.db.delete(watch)
            self.db.commit()

    def favorite_page(self, page_id: uuid.UUID, user: User) -> None:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        existing = self.db.scalar(
            select(SpacePageFavorite).where(
                SpacePageFavorite.page_id == page_id, SpacePageFavorite.user_id == user.id
            )
        )
        if not existing:
            self.db.add(SpacePageFavorite(page_id=page_id, user_id=user.id))
            self.db.commit()

    def unfavorite_page(self, page_id: uuid.UUID, user: User) -> None:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        favorite = self.db.scalar(
            select(SpacePageFavorite).where(
                SpacePageFavorite.page_id == page_id, SpacePageFavorite.user_id == user.id
            )
        )
        if favorite:
            self.db.delete(favorite)
            self.db.commit()

    def record_recent_view(self, page_id: uuid.UUID, user: User) -> None:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        existing = self.db.scalar(
            select(SpacePageRecent).where(
                SpacePageRecent.page_id == page_id, SpacePageRecent.user_id == user.id
            )
        )
        now = datetime.now(timezone.utc)
        if existing:
            existing.viewed_at = now
        else:
            self.db.add(SpacePageRecent(page_id=page_id, user_id=user.id, viewed_at=now))
        self.db.commit()

    def list_favorites(self, workspace_id: uuid.UUID, user: User) -> list[dict]:
        self.access.require_workspace_member(workspace_id, user)
        statement = (
            select(SpacePage, SpacePageFavorite)
            .join(SpacePageFavorite, SpacePageFavorite.page_id == SpacePage.id)
            .join(Space, Space.id == SpacePage.space_id)
            .where(
                Space.workspace_id == workspace_id,
                SpacePageFavorite.user_id == user.id,
                SpacePage.archived_at.is_(None),
                Space.archived_at.is_(None),
            )
            .order_by(SpacePage.title.asc())
        )
        results: list[dict] = []
        for page, _favorite in self.db.execute(statement).all():
            results.append(
                {
                    "page_id": page.id,
                    "space_id": page.space_id,
                    "title": page.title,
                    "slug": page.slug,
                }
            )
        return results

    def list_recent(self, workspace_id: uuid.UUID, user: User) -> list[dict]:
        self.access.require_workspace_member(workspace_id, user)
        statement = (
            select(SpacePage, SpacePageRecent)
            .join(SpacePageRecent, SpacePageRecent.page_id == SpacePage.id)
            .join(Space, Space.id == SpacePage.space_id)
            .where(
                Space.workspace_id == workspace_id,
                SpacePageRecent.user_id == user.id,
                SpacePage.archived_at.is_(None),
                Space.archived_at.is_(None),
            )
            .order_by(SpacePageRecent.viewed_at.desc())
            .limit(30)
        )
        results: list[dict] = []
        for page, recent in self.db.execute(statement).all():
            results.append(
                {
                    "page_id": page.id,
                    "space_id": page.space_id,
                    "title": page.title,
                    "slug": page.slug,
                    "viewed_at": recent.viewed_at,
                }
            )
        return results

    def list_space_members(self, space_id: uuid.UUID, user: User) -> list[SpaceMember]:
        space = self._get_space(space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        return self._get_space_members(space_id)

    def set_space_members(
        self, space_id: uuid.UUID, members: list[SpaceMemberEntry], user: User
    ) -> list[SpaceMember]:
        space = self._get_space(space_id)
        self._require_space_role(space, user, SpaceMemberRole.ADMIN)
        existing = self._get_space_members(space_id)
        for member in existing:
            self.db.delete(member)
        self.db.flush()
        created: list[SpaceMember] = []
        for entry in members:
            member = SpaceMember(space_id=space_id, user_id=entry.user_id, role=entry.role)
            self.db.add(member)
            created.append(member)
        self.db.commit()
        for member in created:
            self.db.refresh(member)
        return created

    def list_templates(self) -> list[dict]:
        return [
            {
                "key": key,
                "title": template["title"],
                "description": template["description"],
                "default_content": template["default_content"],
            }
            for key, template in MAGICBOARD_TEMPLATES.items()
        ]

    def create_page_from_template(
        self, space_id: uuid.UUID, payload: SpacePageFromTemplateCreate, user: User
    ) -> SpacePage:
        template = MAGICBOARD_TEMPLATES.get(payload.template_key)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found.")
        title = payload.title or template["title"]
        return self.create_page(
            space_id,
            SpacePageCreate(
                title=title,
                content=template["default_content"],
                parent_page_id=payload.parent_page_id,
                position=payload.position,
                template_key=payload.template_key,
            ),
            user,
        )

    def export_space_markdown(self, space_id: uuid.UUID, user: User) -> list[dict]:
        space = self._get_space(space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        pages = list(
            self.db.scalars(
                select(SpacePage)
                .where(SpacePage.space_id == space_id, SpacePage.archived_at.is_(None))
                .order_by(SpacePage.position.asc())
            ).all()
        )
        by_id = {page.id: page for page in pages}

        def build_path(page: SpacePage) -> str:
            segments = [page.slug or slugify(page.title)]
            current = page
            while current.parent_page_id and current.parent_page_id in by_id:
                current = by_id[current.parent_page_id]
                segments.insert(0, current.slug or slugify(current.title))
            return "/".join(segments) + ".md"

        return [
            {"path": build_path(page), "content": page.content or ""}
            for page in pages
        ]

    def import_markdown_pages(
        self, space_id: uuid.UUID, pages: list[MarkdownPageImport], user: User
    ) -> list[SpacePage]:
        space = self._get_space(space_id)
        self._require_space_role(space, user, SpaceMemberRole.EDIT)
        path_to_page: dict[str, SpacePage] = {}
        created: list[SpacePage] = []

        for entry in pages:
            parent_page_id = None
            if entry.parent_path:
                parent_page = path_to_page.get(entry.parent_path.rstrip("/"))
                if not parent_page:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Parent path not found: {entry.parent_path}",
                    )
                parent_page_id = parent_page.id
            page = self.create_page(
                space_id,
                SpacePageCreate(
                    title=entry.title,
                    content=entry.content,
                    parent_page_id=parent_page_id,
                ),
                user,
            )
            path_key = entry.parent_path.rstrip("/") + "/" + page.slug if entry.parent_path else page.slug
            path_to_page[path_key] = page
            created.append(page)
        return created

    def get_work_item_summary_by_key(self, workspace_id: uuid.UUID, key: str, user: User) -> WorkItem:
        self.access.require_workspace_member(workspace_id, user)
        match = re.match(r"^([A-Za-z][A-Za-z0-9_]*)-(\d+)$", key.strip())
        if not match:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Work item key must match PROJECT_KEY-NUMBER format.",
            )
        project_key, number_str = match.group(1), match.group(2)
        project = self.db.scalar(
            select(Project).where(
                Project.workspace_id == workspace_id,
                func.upper(Project.key) == project_key.upper(),
                Project.deleted_at.is_(None),
            )
        )
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        work_item = self.db.scalar(
            select(WorkItem).where(
                WorkItem.project_id == project.id,
                WorkItem.sequence_number == int(number_str),
            )
        )
        if not work_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
        self.access.require_project_read(project.id, user)
        return work_item

    def list_page_attachments(self, page_id: uuid.UUID, user: User) -> list[SpacePageAttachment]:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        return list(
            self.db.scalars(
                select(SpacePageAttachment)
                .where(SpacePageAttachment.page_id == page_id)
                .order_by(SpacePageAttachment.created_at.desc())
            ).all()
        )

    def upload_page_attachment(
        self, page_id: uuid.UUID, upload: UploadFile, user: User
    ) -> SpacePageAttachment:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.EDIT)
        storage = StorageService()
        relative_path, size = storage.save_attachment(f"magicboard/{space.key}/{page.slug}", upload)
        attachment = SpacePageAttachment(
            page_id=page_id,
            filename=upload.filename or "attachment",
            content_type=upload.content_type,
            size_bytes=size,
            storage_path=relative_path,
            uploaded_by_user_id=user.id,
        )
        self.db.add(attachment)
        self.db.commit()
        self.db.refresh(attachment)
        return attachment

    def delete_page_attachment(self, attachment_id: uuid.UUID, user: User) -> None:
        attachment = self.db.get(SpacePageAttachment, attachment_id)
        if not attachment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found.")
        page = self._get_page(attachment.page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.EDIT)
        StorageService().delete_attachment(attachment.storage_path)
        self.db.delete(attachment)
        self.db.commit()

    def suite_search(self, workspace_id: uuid.UUID, query: str, user: User) -> dict:
        """Federated search: Magicboard pages + Workboard items in one workspace."""
        self.access.require_workspace_member(workspace_id, user)
        pages = self.search_pages(workspace_id, query, user)
        project_ids = [
            row.id
            for row in self.db.scalars(select(Project).where(Project.workspace_id == workspace_id)).all()
        ]
        work_items: list[WorkItem] = []
        if project_ids and query.strip():
            pattern = f"%{query.strip()}%"
            work_items = list(
                self.db.scalars(
                    select(WorkItem)
                    .where(
                        WorkItem.project_id.in_(project_ids),
                        or_(WorkItem.title.ilike(pattern), WorkItem.work_item_key.ilike(pattern)),
                    )
                    .limit(25)
                ).all()
            )
        return {
            "pages": pages,
            "work_items": [
                {
                    "id": item.id,
                    "work_item_key": item.work_item_key,
                    "title": item.title,
                    "status": item.status.value if hasattr(item.status, "value") else str(item.status),
                    "type": item.type.value if hasattr(item.type, "value") else str(item.type),
                    "project_id": item.project_id,
                }
                for item in work_items
            ],
        }

    def resolve_page_path(
        self, workspace_id: uuid.UUID, space_key: str, page_slug: str, user: User
    ) -> dict:
        self.access.require_workspace_member(workspace_id, user)
        space = self.db.scalar(
            select(Space).where(
                Space.workspace_id == workspace_id,
                func.lower(Space.key) == space_key.strip().lower(),
            )
        )
        if not space:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found.")
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        page = self.db.scalar(
            select(SpacePage).where(
                SpacePage.space_id == space.id,
                func.lower(SpacePage.slug) == page_slug.strip().lower(),
                SpacePage.archived_at.is_(None),
            )
        )
        if not page:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found.")
        return {
            "space_id": space.id,
            "space_key": space.key,
            "page_id": page.id,
            "page_slug": page.slug,
            "title": page.title,
        }

    def create_share_link(self, page_id: uuid.UUID, user: User) -> SpacePageShareLink:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.EDIT)
        link = SpacePageShareLink(
            page_id=page_id,
            token=secrets.token_urlsafe(24),
            created_by_user_id=user.id,
        )
        self.db.add(link)
        self.db.commit()
        self.db.refresh(link)
        return link

    def list_share_links(self, page_id: uuid.UUID, user: User) -> list[SpacePageShareLink]:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.VIEW)
        return list(
            self.db.scalars(
                select(SpacePageShareLink)
                .where(
                    SpacePageShareLink.page_id == page_id,
                    SpacePageShareLink.revoked_at.is_(None),
                )
                .order_by(SpacePageShareLink.created_at.desc())
            ).all()
        )

    def revoke_share_link(self, link_id: uuid.UUID, user: User) -> None:
        link = self.db.get(SpacePageShareLink, link_id)
        if not link or link.revoked_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share link not found.")
        page = self._get_page(link.page_id)
        space = self._get_space(page.space_id)
        self._require_space_role(space, user, SpaceMemberRole.EDIT)
        link.revoked_at = datetime.now(timezone.utc)
        self.db.commit()

    def resolve_share_link(self, token: str, user: User) -> dict:
        link = self.db.scalar(
            select(SpacePageShareLink).where(
                SpacePageShareLink.token == token,
                SpacePageShareLink.revoked_at.is_(None),
            )
        )
        if not link:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share link not found.")
        page = self._get_page(link.page_id)
        space = self._get_space(page.space_id)
        self.access.require_workspace_member(space.workspace_id, user)
        return {
            "space_id": space.id,
            "space_key": space.key,
            "page_id": page.id,
            "page_slug": page.slug,
            "title": page.title,
        }

    @staticmethod
    def share_link_read(link: SpacePageShareLink) -> dict:
        return {
            "id": link.id,
            "page_id": link.page_id,
            "token": link.token,
            "created_by_user_id": link.created_by_user_id,
            "revoked_at": link.revoked_at,
            "created_at": link.created_at,
            "share_path": f"/magicboard/share/{link.token}",
        }
