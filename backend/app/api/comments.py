import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentRead, CommentUpdate
from app.services.comment_service import CommentService

router = APIRouter(tags=["comments"])


@router.post(
    "/work-items/{work_item_id}/comments",
    response_model=CommentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    work_item_id: uuid.UUID,
    payload: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CommentService(db).create_comment(work_item_id, payload, current_user)


@router.get("/work-items/{work_item_id}/comments", response_model=list[CommentRead])
def list_comments(
    work_item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CommentService(db).list_comments(work_item_id, current_user)


@router.put("/comments/{comment_id}", response_model=CommentRead)
def update_comment(
    comment_id: uuid.UUID,
    payload: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CommentService(db).update_comment(comment_id, payload, current_user)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    CommentService(db).delete_comment(comment_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
