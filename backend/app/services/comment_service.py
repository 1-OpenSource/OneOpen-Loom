import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.activity import AuditEntityType
from app.models.comment import Comment
from app.models.project import ProjectRole
from app.models.user import User
from app.models.workspace import WorkspaceRole
from app.schemas.comment import CommentCreate, CommentUpdate
from app.services.access_service import AccessService
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.services.work_item_service import WorkItemService


class CommentService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)
        self.audit = AuditService(db)
        self.work_items = WorkItemService(db)

    def _query_comment(self, comment_id: uuid.UUID) -> Comment:
        statement = select(Comment).options(joinedload(Comment.user)).where(Comment.id == comment_id)
        comment = self.db.scalar(statement)
        if not comment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found.")
        return comment

    def create_comment(self, work_item_id: uuid.UUID, payload: CommentCreate, user: User) -> Comment:
        work_item = self.work_items.get_work_item(work_item_id, user)
        context = self.access.require_project_write(work_item.project_id, user)
        comment = Comment(work_item_id=work_item.id, user_id=user.id, comment_text=payload.comment_text)
        self.db.add(comment)
        self.db.flush()
        self.audit.record(
            actor_user_id=user.id,
            action="comment.created",
            entity_type=AuditEntityType.COMMENT,
            entity_id=str(comment.id),
            entity_label=work_item.work_item_key,
            work_item_id=work_item.id,
            project_id=work_item.project_id,
            workspace_id=context.project.workspace_id,
        )
        self.db.commit()
        NotificationService(self.db).notify_mentions(
            context.project.workspace_id, payload.comment_text, work_item=work_item, actor=user
        )
        self._run_comment_automation(work_item.project_id, work_item, user)
        return self._query_comment(comment.id)

    def _run_comment_automation(self, project_id, work_item, user) -> None:
        from app.models.automation import AutomationTriggerType
        from app.services.automation_service import AutomationService

        try:
            AutomationService(self.db).evaluate(project_id, AutomationTriggerType.COMMENT_ADDED, work_item, user)
        except Exception:
            self.db.rollback()

    def list_comments(self, work_item_id: uuid.UUID, user: User) -> list[Comment]:
        work_item = self.work_items.get_work_item(work_item_id, user)
        self.access.require_project_read(work_item.project_id, user)
        statement = (
            select(Comment)
            .options(joinedload(Comment.user))
            .where(Comment.work_item_id == work_item_id)
            .order_by(Comment.created_at.asc())
        )
        return list(self.db.scalars(statement).all())

    def update_comment(self, comment_id: uuid.UUID, payload: CommentUpdate, user: User) -> Comment:
        comment = self._query_comment(comment_id)
        work_item = self.work_items.get_work_item(comment.work_item_id, user)
        context = self.access.require_project_read(work_item.project_id, user)
        project_member = context.project_member
        can_manage = (
            comment.user_id == user.id
            or context.workspace_member.role in {WorkspaceRole.OWNER, WorkspaceRole.ADMIN}
            or context.project.lead_user_id == user.id
            or (project_member and project_member.role == ProjectRole.ADMIN)
        )
        if not can_manage:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to edit this comment.",
            )
        old_text = comment.comment_text
        comment.comment_text = payload.comment_text
        self.audit.record(
            actor_user_id=user.id,
            action="comment.updated",
            entity_type=AuditEntityType.COMMENT,
            entity_id=str(comment.id),
            entity_label=work_item.work_item_key,
            work_item_id=work_item.id,
            project_id=work_item.project_id,
            workspace_id=context.project.workspace_id,
            field_name="comment_text",
            old_value=old_text,
            new_value=payload.comment_text,
        )
        self.db.commit()
        return self._query_comment(comment.id)

    def delete_comment(self, comment_id: uuid.UUID, user: User) -> None:
        comment = self._query_comment(comment_id)
        work_item = self.work_items.get_work_item(comment.work_item_id, user)
        context = self.access.require_project_read(work_item.project_id, user)
        project_member = context.project_member
        can_manage = (
            comment.user_id == user.id
            or context.workspace_member.role in {WorkspaceRole.OWNER, WorkspaceRole.ADMIN}
            or context.project.lead_user_id == user.id
            or (project_member and project_member.role == ProjectRole.ADMIN)
        )
        if not can_manage:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this comment.",
            )
        self.audit.record(
            actor_user_id=user.id,
            action="comment.deleted",
            entity_type=AuditEntityType.COMMENT,
            entity_id=str(comment.id),
            entity_label=work_item.work_item_key,
            work_item_id=work_item.id,
            project_id=work_item.project_id,
            workspace_id=context.project.workspace_id,
        )
        self.db.delete(comment)
        self.db.commit()
