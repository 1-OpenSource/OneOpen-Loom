import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.version import ProjectVersion, WorkItemAffectedVersion, WorkItemFixVersion, WorkLog
from app.models.work_item import WorkItem
from app.schemas.version import ProjectVersionCreate, ProjectVersionUpdate, WorkLogCreate
from app.services.access_service import AccessService


class VersionService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def create_version(self, project_id: uuid.UUID, payload: ProjectVersionCreate, user: User) -> ProjectVersion:
        self.access.require_project_write(project_id, user)
        existing = self.db.scalar(
            select(ProjectVersion).where(
                ProjectVersion.project_id == project_id, ProjectVersion.name == payload.name
            )
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Version already exists.")
        version = ProjectVersion(
            project_id=project_id,
            name=payload.name,
            description=payload.description,
            start_date=payload.start_date,
            release_date=payload.release_date,
        )
        self.db.add(version)
        self.db.commit()
        return version

    def list_versions(self, project_id: uuid.UUID, user: User) -> list[ProjectVersion]:
        self.access.require_project_read(project_id, user)
        return list(
            self.db.scalars(select(ProjectVersion).where(ProjectVersion.project_id == project_id)).all()
        )

    def update_version(
        self, version_id: uuid.UUID, payload: ProjectVersionUpdate, user: User
    ) -> ProjectVersion:
        version = self.db.get(ProjectVersion, version_id)
        if not version:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found.")
        self.access.require_project_write(version.project_id, user)
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            setattr(version, key, value)
        self.db.commit()
        return version

    def delete_version(self, version_id: uuid.UUID, user: User) -> None:
        version = self.db.get(ProjectVersion, version_id)
        if not version:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found.")
        self.access.require_project_write(version.project_id, user)
        self.db.delete(version)
        self.db.commit()

    def _get_work_item(self, work_item_id: uuid.UUID) -> WorkItem:
        work_item = self.db.get(WorkItem, work_item_id)
        if not work_item or work_item.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
        return work_item

    def _validate_version(self, project_id: uuid.UUID, version_id: uuid.UUID) -> ProjectVersion:
        version = self.db.get(ProjectVersion, version_id)
        if not version or version.project_id != project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Version must belong to the same project."
            )
        return version

    def add_fix_version(self, work_item_id: uuid.UUID, version_id: uuid.UUID, user: User) -> None:
        work_item = self._get_work_item(work_item_id)
        self.access.require_project_write(work_item.project_id, user)
        self._validate_version(work_item.project_id, version_id)
        existing = self.db.scalar(
            select(WorkItemFixVersion).where(
                WorkItemFixVersion.work_item_id == work_item_id, WorkItemFixVersion.version_id == version_id
            )
        )
        if not existing:
            self.db.add(WorkItemFixVersion(work_item_id=work_item_id, version_id=version_id))
            self.db.commit()

    def remove_fix_version(self, work_item_id: uuid.UUID, version_id: uuid.UUID, user: User) -> None:
        work_item = self._get_work_item(work_item_id)
        self.access.require_project_write(work_item.project_id, user)
        link = self.db.scalar(
            select(WorkItemFixVersion).where(
                WorkItemFixVersion.work_item_id == work_item_id, WorkItemFixVersion.version_id == version_id
            )
        )
        if link:
            self.db.delete(link)
            self.db.commit()

    def add_affected_version(self, work_item_id: uuid.UUID, version_id: uuid.UUID, user: User) -> None:
        work_item = self._get_work_item(work_item_id)
        self.access.require_project_write(work_item.project_id, user)
        self._validate_version(work_item.project_id, version_id)
        existing = self.db.scalar(
            select(WorkItemAffectedVersion).where(
                WorkItemAffectedVersion.work_item_id == work_item_id,
                WorkItemAffectedVersion.version_id == version_id,
            )
        )
        if not existing:
            self.db.add(WorkItemAffectedVersion(work_item_id=work_item_id, version_id=version_id))
            self.db.commit()

    def remove_affected_version(self, work_item_id: uuid.UUID, version_id: uuid.UUID, user: User) -> None:
        work_item = self._get_work_item(work_item_id)
        self.access.require_project_write(work_item.project_id, user)
        link = self.db.scalar(
            select(WorkItemAffectedVersion).where(
                WorkItemAffectedVersion.work_item_id == work_item_id,
                WorkItemAffectedVersion.version_id == version_id,
            )
        )
        if link:
            self.db.delete(link)
            self.db.commit()

    def add_worklog(self, work_item_id: uuid.UUID, payload: WorkLogCreate, user: User) -> WorkLog:
        work_item = self._get_work_item(work_item_id)
        self.access.require_project_write(work_item.project_id, user)
        worklog = WorkLog(
            work_item_id=work_item_id,
            user_id=user.id,
            time_spent_seconds=payload.time_spent_seconds,
            description=payload.description,
            logged_at=payload.logged_at or date.today(),
        )
        self.db.add(worklog)
        if work_item.remaining_estimate_seconds is not None:
            work_item.remaining_estimate_seconds = max(
                work_item.remaining_estimate_seconds - payload.time_spent_seconds, 0
            )
        self.db.commit()
        return worklog

    def list_worklogs(self, work_item_id: uuid.UUID, user: User) -> list[WorkLog]:
        work_item = self._get_work_item(work_item_id)
        self.access.require_project_read(work_item.project_id, user)
        return list(self.db.scalars(select(WorkLog).where(WorkLog.work_item_id == work_item_id)).all())
