import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.space import Space, SpacePage, SpacePageVersion, WorkItemPage
from app.models.user import User
from app.models.work_item import WorkItem
from app.schemas.space import SpaceCreate, SpacePageCreate, SpacePageUpdate, SpaceUpdate
from app.services.access_service import AccessService


class SpaceService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def create_space(self, workspace_id: uuid.UUID, payload: SpaceCreate, user: User) -> Space:
        self.access.require_workspace_member(workspace_id, user)
        space = Space(
            workspace_id=workspace_id,
            name=payload.name,
            description=payload.description,
            created_by_user_id=user.id,
        )
        self.db.add(space)
        self.db.commit()
        return space

    def list_spaces(self, workspace_id: uuid.UUID, user: User) -> list[Space]:
        self.access.require_workspace_member(workspace_id, user)
        return list(self.db.scalars(select(Space).where(Space.workspace_id == workspace_id)).all())

    def _get_space(self, space_id: uuid.UUID) -> Space:
        space = self.db.get(Space, space_id)
        if not space:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found.")
        return space

    def get_space(self, space_id: uuid.UUID, user: User) -> Space:
        space = self._get_space(space_id)
        self.access.require_workspace_member(space.workspace_id, user)
        return space

    def update_space(self, space_id: uuid.UUID, payload: SpaceUpdate, user: User) -> Space:
        space = self._get_space(space_id)
        self.access.require_workspace_member(space.workspace_id, user)
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            setattr(space, key, value)
        self.db.commit()
        return space

    def delete_space(self, space_id: uuid.UUID, user: User) -> None:
        space = self._get_space(space_id)
        self.access.require_workspace_member(space.workspace_id, user)
        self.db.delete(space)
        self.db.commit()

    def create_page(self, space_id: uuid.UUID, payload: SpacePageCreate, user: User) -> SpacePage:
        space = self._get_space(space_id)
        self.access.require_workspace_member(space.workspace_id, user)
        page = SpacePage(
            space_id=space_id,
            parent_page_id=payload.parent_page_id,
            title=payload.title,
            content=payload.content,
            position=payload.position,
            created_by_user_id=user.id,
        )
        self.db.add(page)
        self.db.flush()
        self.db.add(SpacePageVersion(page_id=page.id, content=payload.content, edited_by_user_id=user.id))
        self.db.commit()
        return page

    def _get_page(self, page_id: uuid.UUID) -> SpacePage:
        page = self.db.get(SpacePage, page_id)
        if not page:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found.")
        return page

    def get_page(self, page_id: uuid.UUID, user: User) -> SpacePage:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self.access.require_workspace_member(space.workspace_id, user)
        return page

    def update_page(self, page_id: uuid.UUID, payload: SpacePageUpdate, user: User) -> SpacePage:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self.access.require_workspace_member(space.workspace_id, user)
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            setattr(page, key, value)
        if "content" in values:
            self.db.add(SpacePageVersion(page_id=page.id, content=payload.content, edited_by_user_id=user.id))
        self.db.commit()
        return page

    def delete_page(self, page_id: uuid.UUID, user: User) -> None:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self.access.require_workspace_member(space.workspace_id, user)
        self.db.delete(page)
        self.db.commit()

    def list_page_tree(self, space_id: uuid.UUID, user: User) -> list[dict]:
        space = self._get_space(space_id)
        self.access.require_workspace_member(space.workspace_id, user)
        pages = list(
            self.db.scalars(
                select(SpacePage).where(SpacePage.space_id == space_id).order_by(SpacePage.position.asc())
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
                    "position": page.position,
                    "children": build(page.id),
                }
                for page in by_parent.get(parent_id, [])
            ]

        return build(None)

    def list_versions(self, page_id: uuid.UUID, user: User) -> list[SpacePageVersion]:
        page = self._get_page(page_id)
        space = self._get_space(page.space_id)
        self.access.require_workspace_member(space.workspace_id, user)
        statement = (
            select(SpacePageVersion)
            .where(SpacePageVersion.page_id == page_id)
            .order_by(SpacePageVersion.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def link_page_to_work_item(self, work_item_id: uuid.UUID, page_id: uuid.UUID, user: User) -> None:
        work_item = self.db.get(WorkItem, work_item_id)
        if not work_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
        self.access.require_project_write(work_item.project_id, user)
        page = self._get_page(page_id)
        existing = self.db.scalar(
            select(WorkItemPage).where(WorkItemPage.work_item_id == work_item_id, WorkItemPage.page_id == page.id)
        )
        if not existing:
            self.db.add(WorkItemPage(work_item_id=work_item_id, page_id=page.id))
            self.db.commit()

    def list_pages_for_work_item(self, work_item_id: uuid.UUID, user: User) -> list[SpacePage]:
        work_item = self.db.get(WorkItem, work_item_id)
        if not work_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
        self.access.require_project_read(work_item.project_id, user)
        statement = (
            select(SpacePage)
            .join(WorkItemPage, WorkItemPage.page_id == SpacePage.id)
            .where(WorkItemPage.work_item_id == work_item_id)
        )
        return list(self.db.scalars(statement).all())
