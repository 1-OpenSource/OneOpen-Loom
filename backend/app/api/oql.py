import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import Page
from app.schemas.filter import (
    BulkWorkItemRequest,
    OqlSearchRequest,
    SavedFilterCreate,
    SavedFilterRead,
    SavedFilterUpdate,
)
from app.schemas.work_item import WorkItemSummary
from app.services.access_service import AccessService
from app.services.filter_service import FilterService
from app.services.oql_service import OqlService
from app.services.work_item_service import WorkItemService

router = APIRouter(tags=["oql"])


@router.post("/oql/search", response_model=Page[WorkItemSummary])
def search_oql(
    payload: OqlSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    access = AccessService(db)
    if payload.project_id:
        access.require_project_read(payload.project_id, current_user)
    elif payload.workspace_id:
        access.require_workspace_member(payload.workspace_id, current_user)
    return OqlService(db).search(
        payload.oql,
        project_id=payload.project_id,
        workspace_id=payload.workspace_id,
        page=payload.page,
        page_size=payload.page_size,
    )


@router.post("/work-items/bulk")
def bulk_update_work_items(
    payload: BulkWorkItemRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkItemService(db).bulk_update(payload.ids, payload.action, payload.payload, current_user)


@router.post(
    "/workspaces/{workspace_id}/filters", response_model=SavedFilterRead, status_code=status.HTTP_201_CREATED
)
def create_saved_filter(
    workspace_id: uuid.UUID,
    payload: SavedFilterCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FilterService(db).create_filter(workspace_id, payload, current_user)


@router.get("/workspaces/{workspace_id}/filters", response_model=list[SavedFilterRead])
def list_saved_filters(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FilterService(db).list_filters(workspace_id, current_user)


@router.get("/filters/{filter_id}", response_model=SavedFilterRead)
def get_saved_filter(
    filter_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FilterService(db).get_filter(filter_id, current_user)


@router.put("/filters/{filter_id}", response_model=SavedFilterRead)
def update_saved_filter(
    filter_id: uuid.UUID,
    payload: SavedFilterUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FilterService(db).update_filter(filter_id, payload, current_user)


@router.delete("/filters/{filter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_filter(
    filter_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    FilterService(db).delete_filter(filter_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
