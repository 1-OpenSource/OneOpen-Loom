import re
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationPreference, NotificationType
from app.models.user import User
from app.models.work_item import WorkItem
from app.models.workspace import WorkspaceMember
from app.schemas.notification import NotificationPreferenceUpdate

MENTION_PATTERN = re.compile(r'@([\w.+-]+@[\w.-]+\.\w+|"[^"]+"|[\w.-]+)')


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        *,
        user_id: uuid.UUID,
        type: NotificationType,
        title: str,
        body: str | None = None,
        work_item_id: uuid.UUID | None = None,
        project_id: uuid.UUID | None = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            work_item_id=work_item_id,
            project_id=project_id,
        )
        self.db.add(notification)
        self.db.flush()
        return notification

    def list_for_user(self, user: User, *, unread_only: bool = False) -> list[Notification]:
        statement = select(Notification).where(Notification.user_id == user.id)
        if unread_only:
            statement = statement.where(Notification.is_read.is_(False))
        statement = statement.order_by(Notification.created_at.desc())
        return list(self.db.scalars(statement).all())

    def unread_count(self, user: User) -> int:
        return int(
            self.db.scalar(
                select(func.count())
                .select_from(Notification)
                .where(Notification.user_id == user.id, Notification.is_read.is_(False))
            )
            or 0
        )

    def mark_read(self, notification_id: uuid.UUID, user: User) -> Notification:
        notification = self.db.get(Notification, notification_id)
        if not notification or notification.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
        notification.is_read = True
        self.db.commit()
        return notification

    def mark_all_read(self, user: User) -> None:
        statement = select(Notification).where(
            Notification.user_id == user.id, Notification.is_read.is_(False)
        )
        for notification in self.db.scalars(statement).all():
            notification.is_read = True
        self.db.commit()

    def get_preferences(self, user: User) -> NotificationPreference:
        pref = self.db.scalar(select(NotificationPreference).where(NotificationPreference.user_id == user.id))
        if not pref:
            pref = NotificationPreference(user_id=user.id)
            self.db.add(pref)
            self.db.commit()
        return pref

    def update_preferences(self, user: User, payload: NotificationPreferenceUpdate) -> NotificationPreference:
        pref = self.get_preferences(user)
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            setattr(pref, key, value)
        self.db.commit()
        return pref

    def parse_mentions(self, workspace_id: uuid.UUID, text: str) -> list[User]:
        matches = MENTION_PATTERN.findall(text or "")
        if not matches:
            return []
        users: list[User] = []
        seen: set[uuid.UUID] = set()
        for raw in matches:
            candidate = raw.strip('"')
            member_query = (
                select(User)
                .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
                .where(WorkspaceMember.workspace_id == workspace_id)
            )
            if "@" in candidate:
                user = self.db.scalar(member_query.where(func.lower(User.email) == candidate.lower()))
            else:
                user = self.db.scalar(member_query.where(func.lower(User.name) == candidate.lower()))
            if user and user.id not in seen:
                seen.add(user.id)
                users.append(user)
        return users

    def notify_mentions(self, workspace_id: uuid.UUID, text: str, *, work_item: WorkItem, actor: User) -> None:
        mentioned_users = self.parse_mentions(workspace_id, text)
        for user in mentioned_users:
            if user.id == actor.id:
                continue
            self.create(
                user_id=user.id,
                type=NotificationType.MENTION,
                title=f"You were mentioned in {work_item.work_item_key}",
                body=text,
                work_item_id=work_item.id,
                project_id=work_item.project_id,
            )
        if mentioned_users:
            self.db.commit()
