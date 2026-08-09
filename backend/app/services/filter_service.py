import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.filter import SavedFilter
from app.models.user import User
from app.schemas.filter import SavedFilterCreate, SavedFilterUpdate
from app.services.access_service import AccessService


class FilterService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def create_filter(self, workspace_id: uuid.UUID, payload: SavedFilterCreate, user: User) -> SavedFilter:
        self.access.require_workspace_member(workspace_id, user)
        if payload.project_id:
            self.access.require_project_read(payload.project_id, user)
        saved_filter = SavedFilter(
            workspace_id=workspace_id,
            project_id=payload.project_id,
            owner_user_id=user.id,
            name=payload.name,
            oql=payload.oql,
            is_shared=payload.is_shared,
        )
        self.db.add(saved_filter)
        self.db.commit()
        return saved_filter

    def list_filters(self, workspace_id: uuid.UUID, user: User) -> list[SavedFilter]:
        self.access.require_workspace_member(workspace_id, user)
        statement = select(SavedFilter).where(
            SavedFilter.workspace_id == workspace_id,
            or_(SavedFilter.owner_user_id == user.id, SavedFilter.is_shared.is_(True)),
        )
        return list(self.db.scalars(statement).all())

    def _query_filter(self, filter_id: uuid.UUID) -> SavedFilter:
        saved_filter = self.db.get(SavedFilter, filter_id)
        if not saved_filter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved filter not found.")
        return saved_filter

    def get_filter(self, filter_id: uuid.UUID, user: User) -> SavedFilter:
        saved_filter = self._query_filter(filter_id)
        self.access.require_workspace_member(saved_filter.workspace_id, user)
        if saved_filter.owner_user_id != user.id and not saved_filter.is_shared:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Filter is private.")
        return saved_filter

    def update_filter(self, filter_id: uuid.UUID, payload: SavedFilterUpdate, user: User) -> SavedFilter:
        saved_filter = self._query_filter(filter_id)
        self.access.require_workspace_member(saved_filter.workspace_id, user)
        if saved_filter.owner_user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can edit this filter.")
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            setattr(saved_filter, key, value)
        self.db.commit()
        return saved_filter

    def delete_filter(self, filter_id: uuid.UUID, user: User) -> None:
        saved_filter = self._query_filter(filter_id)
        self.access.require_workspace_member(saved_filter.workspace_id, user)
        if saved_filter.owner_user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can delete this filter."
            )
        self.db.delete(saved_filter)
        self.db.commit()
