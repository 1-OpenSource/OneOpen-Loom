import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.comment import Comment


class CommentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, *, work_item_id: uuid.UUID, user_id: uuid.UUID, comment_text: str) -> Comment:
        comment = Comment(work_item_id=work_item_id, user_id=user_id, comment_text=comment_text)
        self.db.add(comment)
        self.db.flush()
        return comment

    def get(self, comment_id: uuid.UUID) -> Comment | None:
        statement = select(Comment).options(joinedload(Comment.user)).where(Comment.id == comment_id)
        return self.db.scalar(statement)

    def list_by_work_item(self, work_item_id: uuid.UUID) -> list[Comment]:
        statement = (
            select(Comment)
            .options(joinedload(Comment.user))
            .where(Comment.work_item_id == work_item_id)
            .order_by(Comment.created_at.asc())
        )
        return list(self.db.scalars(statement).all())

    def update(self, comment: Comment, comment_text: str) -> Comment:
        comment.comment_text = comment_text
        self.db.flush()
        return comment

    def delete(self, comment: Comment) -> None:
        self.db.delete(comment)
        self.db.flush()
