import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.version import (
    ProjectVersionCreate,
    ProjectVersionRead,
    ProjectVersionUpdate,
    WorkItemVersionLink,
    WorkLogCreate,
    WorkLogRead,
)
from app.services.version_service import VersionService

router = APIRouter(tags=["versions"])


@router.post(
    "/projects/{project_id}/versions", response_model=ProjectVersionRead, status_code=status.HTTP_201_CREATED
)
def create_version(
    project_id: uuid.UUID,
    payload: ProjectVersionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return VersionService(db).create_version(project_id, payload, current_user)


@router.get("/projects/{project_id}/versions", response_model=list[ProjectVersionRead])
def list_versions(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return VersionService(db).list_versions(project_id, current_user)


@router.put("/versions/{version_id}", response_model=ProjectVersionRead)
def update_version(
    version_id: uuid.UUID,
    payload: ProjectVersionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return VersionService(db).update_version(version_id, payload, current_user)


@router.delete("/versions/{version_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_version(
    version_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    VersionService(db).delete_version(version_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/work-items/{work_item_id}/fix-versions", status_code=status.HTTP_204_NO_CONTENT)
def add_fix_version(
    work_item_id: uuid.UUID,
    payload: WorkItemVersionLink,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    VersionService(db).add_fix_version(work_item_id, payload.version_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/work-items/{work_item_id}/fix-versions/{version_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_fix_version(
    work_item_id: uuid.UUID,
    version_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    VersionService(db).remove_fix_version(work_item_id, version_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/work-items/{work_item_id}/affected-versions", status_code=status.HTTP_204_NO_CONTENT)
def add_affected_version(
    work_item_id: uuid.UUID,
    payload: WorkItemVersionLink,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    VersionService(db).add_affected_version(work_item_id, payload.version_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete(
    "/work-items/{work_item_id}/affected-versions/{version_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_affected_version(
    work_item_id: uuid.UUID,
    version_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    VersionService(db).remove_affected_version(work_item_id, version_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/work-items/{work_item_id}/worklogs", response_model=WorkLogRead, status_code=status.HTTP_201_CREATED
)
def add_worklog(
    work_item_id: uuid.UUID,
    payload: WorkLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return VersionService(db).add_worklog(work_item_id, payload, current_user)


@router.get("/work-items/{work_item_id}/worklogs", response_model=list[WorkLogRead])
def list_worklogs(
    work_item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return VersionService(db).list_worklogs(work_item_id, current_user)
