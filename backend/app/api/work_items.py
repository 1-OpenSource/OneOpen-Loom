import uuid

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import Page
from app.schemas.work_item import (
    WorkItemAttachmentRead,
    WorkItemBlockedUpdate,
    WorkItemCreate,
    WorkItemLinkCreate,
    WorkItemLinkRead,
    WorkItemOwnerUpdate,
    WorkItemPriorityUpdate,
    WorkItemRankUpdate,
    WorkItemRead,
    WorkItemStatusUpdate,
    WorkItemSummary,
    WorkItemUpdate,
)
from app.services.work_item_service import WorkItemService

router = APIRouter(tags=["work-items"])


@router.post("/projects/{project_id}/work-items", response_model=WorkItemRead, status_code=status.HTTP_201_CREATED)
def create_work_item(
    project_id: uuid.UUID,
    payload: WorkItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkItemService(db).create_work_item(project_id, payload, current_user)


@router.get("/projects/{project_id}/work-items", response_model=Page[WorkItemSummary])
def list_work_items(
    project_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    priority_filter: str | None = Query(default=None, alias="priority"),
    type_filter: str | None = Query(default=None, alias="type"),
    assignee_user_id: uuid.UUID | None = Query(default=None),
    reporter_id: uuid.UUID | None = Query(default=None),
    label: str | None = Query(default=None),
    archived: bool | None = Query(default=False),
    blocked: bool | None = Query(default=None),
    epic_id: uuid.UUID | None = Query(default=None),
    sprint_id: uuid.UUID | None = Query(default=None),
    sort_by: str = Query(default="rank"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkItemService(db).list_work_items(
        project_id,
        current_user,
        page=page,
        page_size=page_size,
        search=search,
        status_filter=status_filter,
        priority_filter=priority_filter,
        type_filter=type_filter,
        assignee_user_id=assignee_user_id,
        reporter_id=reporter_id,
        label=label,
        archived=archived,
        blocked=blocked,
        epic_id=epic_id,
        sprint_id=sprint_id,
        sort_by=sort_by,
    )


@router.get("/work-items/{work_item_id}", response_model=WorkItemRead)
def get_work_item(
    work_item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkItemService(db).get_work_item(work_item_id, current_user)


@router.put("/work-items/{work_item_id}", response_model=WorkItemRead)
def update_work_item(
    work_item_id: uuid.UUID,
    payload: WorkItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkItemService(db).update_work_item(work_item_id, payload, current_user)


@router.delete("/work-items/{work_item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work_item(
    work_item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    WorkItemService(db).delete_work_item(work_item_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/work-items/{work_item_id}/status", response_model=WorkItemRead)
def update_work_item_status(
    work_item_id: uuid.UUID,
    payload: WorkItemStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkItemService(db).update_status(work_item_id, payload, current_user)


@router.put("/work-items/{work_item_id}/blocked", response_model=WorkItemRead)
def update_work_item_blocked(
    work_item_id: uuid.UUID,
    payload: WorkItemBlockedUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkItemService(db).update_blocked(work_item_id, payload, current_user)


@router.put("/work-items/{work_item_id}/owner", response_model=WorkItemRead)
def update_work_item_owner(
    work_item_id: uuid.UUID,
    payload: WorkItemOwnerUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkItemService(db).update_owner(work_item_id, payload, current_user)


@router.put("/work-items/{work_item_id}/priority", response_model=WorkItemRead)
def update_work_item_priority(
    work_item_id: uuid.UUID,
    payload: WorkItemPriorityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkItemService(db).update_priority(work_item_id, payload, current_user)


@router.put("/work-items/{work_item_id}/rank", response_model=WorkItemRead)
def update_work_item_rank(
    work_item_id: uuid.UUID,
    payload: WorkItemRankUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkItemService(db).update_rank(work_item_id, payload, current_user)


@router.post(
    "/work-items/{work_item_id}/attachments",
    response_model=WorkItemAttachmentRead,
    status_code=status.HTTP_201_CREATED,
)
def upload_attachment(
    work_item_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkItemService(db).create_attachment(work_item_id, file, current_user)


@router.get("/attachments/{attachment_id}/download")
def download_attachment(
    attachment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = WorkItemService(db)
    attachment = service.get_attachment(attachment_id, current_user)
    absolute_path = service.storage.absolute_path(attachment.stored_path)
    return FileResponse(absolute_path, media_type=attachment.content_type, filename=attachment.filename)


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(
    attachment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    WorkItemService(db).delete_attachment(attachment_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/work-items/{work_item_id}/links", response_model=WorkItemLinkRead, status_code=status.HTTP_201_CREATED)
def create_work_item_link(
    work_item_id: uuid.UUID,
    payload: WorkItemLinkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkItemService(db).create_link(work_item_id, payload, current_user)


@router.delete("/work-item-links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work_item_link(
    link_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    WorkItemService(db).delete_link(link_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
