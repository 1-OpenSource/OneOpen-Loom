import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.project import Project, ProjectMember
from app.models.user import User
from app.models.work_item import WorkItem
from app.models.workspace import WorkspaceMember
from app.schemas.search import SearchResultItem
from app.services.access_service import AccessService


class SearchService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def search_workspace(self, workspace_id: uuid.UUID, query: str, user: User) -> list[SearchResultItem]:
        self.access.require_workspace_member(workspace_id, user)
        term = f"%{query.lower()}%"
        results: list[SearchResultItem] = []

        projects = self.db.scalars(
            select(Project)
            .where(
                Project.workspace_id == workspace_id,
                Project.deleted_at.is_(None),
                func.lower(Project.name).like(term) | func.lower(Project.key).like(term),
            )
            .order_by(Project.updated_at.desc())
            .limit(8)
        ).all()
        for project in projects:
            results.append(
                SearchResultItem(
                    entity_type="project",
                    identifier=project.key,
                    title=project.name,
                    context="Project",
                    status="Archived" if project.archived_at else "Active",
                    href=f"/projects/{project.id}",
                    entity_id=project.id,
                )
            )

        work_items = self.db.scalars(
            select(WorkItem)
            .join(Project)
            .where(
                Project.workspace_id == workspace_id,
                Project.deleted_at.is_(None),
                WorkItem.deleted_at.is_(None),
                func.lower(WorkItem.title).like(term) | func.lower(WorkItem.work_item_key).like(term),
            )
            .order_by(WorkItem.updated_at.desc())
            .limit(12)
        ).all()
        for item in work_items:
            results.append(
                SearchResultItem(
                    entity_type="work_item",
                    identifier=item.work_item_key,
                    title=item.title,
                    context="Work item",
                    status=item.status.value,
                    href=f"/work-items/{item.id}",
                    entity_id=item.id,
                )
            )

        members = self.db.execute(
            select(User, WorkspaceMember)
            .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
            .where(
                WorkspaceMember.workspace_id == workspace_id,
                func.lower(User.name).like(term) | func.lower(User.email).like(term),
            )
            .limit(8)
        ).all()
        for member, workspace_member in members:
            results.append(
                SearchResultItem(
                    entity_type="member",
                    identifier=member.email,
                    title=member.name,
                    context=f"Workspace {workspace_member.role.value.title()}",
                    status="Active",
                    href=f"/workspaces/{workspace_id}?tab=members",
                    entity_id=member.id,
                )
            )

        return results[:20]
