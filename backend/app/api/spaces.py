import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.space import (
    SpaceCreate,
    SpacePageCreate,
    SpacePageRead,
    SpacePageTreeNode,
    SpacePageUpdate,
    SpacePageVersionRead,
    SpaceRead,
    SpaceUpdate,
    WorkItemPageLink,
)
from app.services.space_service import SpaceService

router = APIRouter(tags=["spaces"])


@router.post("/workspaces/{workspace_id}/spaces", response_model=SpaceRead, status_code=status.HTTP_201_CREATED)
def create_space(
    workspace_id: uuid.UUID,
    payload: SpaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).create_space(workspace_id, payload, current_user)


@router.get("/workspaces/{workspace_id}/spaces", response_model=list[SpaceRead])
def list_spaces(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).list_spaces(workspace_id, current_user)


@router.get("/spaces/{space_id}", response_model=SpaceRead)
def get_space(
    space_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).get_space(space_id, current_user)


@router.put("/spaces/{space_id}", response_model=SpaceRead)
def update_space(
    space_id: uuid.UUID,
    payload: SpaceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).update_space(space_id, payload, current_user)


@router.delete("/spaces/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_space(
    space_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).delete_space(space_id, current_user)


@router.post("/spaces/{space_id}/pages", response_model=SpacePageRead, status_code=status.HTTP_201_CREATED)
def create_page(
    space_id: uuid.UUID,
    payload: SpacePageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).create_page(space_id, payload, current_user)


@router.get("/spaces/{space_id}/pages/tree", response_model=list[SpacePageTreeNode])
def get_page_tree(
    space_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).list_page_tree(space_id, current_user)


@router.get("/pages/{page_id}", response_model=SpacePageRead)
def get_page(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).get_page(page_id, current_user)


@router.put("/pages/{page_id}", response_model=SpacePageRead)
def update_page(
    page_id: uuid.UUID,
    payload: SpacePageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).update_page(page_id, payload, current_user)


@router.delete("/pages/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_page(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).delete_page(page_id, current_user)


@router.get("/pages/{page_id}/versions", response_model=list[SpacePageVersionRead])
def list_page_versions(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).list_versions(page_id, current_user)


@router.post("/work-items/{work_item_id}/pages", status_code=status.HTTP_204_NO_CONTENT)
def link_page_to_work_item(
    work_item_id: uuid.UUID,
    payload: WorkItemPageLink,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).link_page_to_work_item(work_item_id, payload.page_id, current_user)


@router.get("/work-items/{work_item_id}/pages", response_model=list[SpacePageRead])
def list_pages_for_work_item(
    work_item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).list_pages_for_work_item(work_item_id, current_user)
