import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.activity import AuditEntityType, AuditEvent
from app.models.board import BoardColumn, BoardColumnStatus, WorkflowTransition
from app.models.project import Project, ProjectMember, ProjectRole, WorkflowStatus
from app.models.user import User
from app.models.work_item import ALLOWED_STATUS_TRANSITIONS, WorkItem, WorkItemStatus
from app.models.workspace import WorkspaceMember, WorkspaceRole
from app.schemas.project import ProjectCreate, ProjectMemberAdd, ProjectUpdate
from app.services.access_service import WORKSPACE_WRITE_ROLES, AccessService
from app.services.audit_service import AuditService

DEFAULT_WORKFLOW_STATUSES = [
    {"key": "TODO", "name": "To Do", "color": "#94a3b8", "category": "todo"},
    {"key": "IN_PROGRESS", "name": "In Progress", "color": "#e86a17", "category": "in_progress"},
    {"key": "IN_REVIEW", "name": "In Review", "color": "#b45309", "category": "in_progress"},
    {"key": "DONE", "name": "Done", "color": "#16a34a", "category": "done"},
]

DEFAULT_AVAILABLE_TYPES = [
    "EPIC",
    "STORY",
    "TASK",
    "BUG",
    "SPIKE",
    "SUBTASK",
    "IMPROVEMENT",
    "FEATURE_REQUEST",
    "RESEARCH",
]


class ProjectService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)
        self.audit = AuditService(db)

    def _query_project(self, project_id: uuid.UUID) -> Project:
        statement = (
            select(Project)
            .options(
                joinedload(Project.lead),
                selectinload(Project.members).joinedload(ProjectMember.user),
                selectinload(Project.workflow_statuses),
            )
            .where(Project.id == project_id, Project.deleted_at.is_(None))
        )
        project = self.db.scalar(statement)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        return project

    def _require_workspace_user(self, workspace_id: uuid.UUID, user_id: uuid.UUID | None) -> None:
        if user_id is None:
            return
        member = self.access.get_workspace_member(workspace_id, user_id)
        if not member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected user is not a member of this workspace.",
            )

    def _create_default_workflow_statuses(self, project: Project) -> list[WorkflowStatus]:
        statuses = []
        for index, status_data in enumerate(DEFAULT_WORKFLOW_STATUSES):
            workflow_status = WorkflowStatus(
                project=project,
                key=status_data["key"],
                name=status_data["name"],
                color=status_data["color"],
                category=status_data["category"],
                position=index,
                is_default=index == 0,
            )
            self.db.add(workflow_status)
            statuses.append(workflow_status)
        return statuses

    def _create_default_board(self, project: Project, statuses: list[WorkflowStatus]) -> None:
        self.db.flush()
        status_by_key = {row.key: row for row in statuses}
        for index, workflow_status in enumerate(statuses):
            column = BoardColumn(project_id=project.id, name=workflow_status.name, position=index)
            self.db.add(column)
            self.db.flush()
            self.db.add(BoardColumnStatus(column_id=column.id, status_id=workflow_status.id))
        for from_key, to_keys in ALLOWED_STATUS_TRANSITIONS.items():
            from_status = status_by_key.get(from_key.value)
            if not from_status:
                continue
            for to_key in to_keys:
                to_status = status_by_key.get(to_key.value)
                if not to_status:
                    continue
                self.db.add(
                    WorkflowTransition(
                        project_id=project.id,
                        from_status_id=from_status.id,
                        to_status_id=to_status.id,
                        name=f"{from_key.value} -> {to_key.value}",
                    )
                )

    def create_project(self, workspace_id: uuid.UUID, payload: ProjectCreate, user: User) -> Project:
        self.access.require_workspace_roles(workspace_id, user, WORKSPACE_WRITE_ROLES)
        key = payload.key.upper()
        existing = self.db.scalar(
            select(Project).where(
                Project.workspace_id == workspace_id,
                func.lower(Project.key) == key.lower(),
                Project.deleted_at.is_(None),
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A project with this key already exists in the workspace.",
            )
        self._require_workspace_user(workspace_id, payload.lead_user_id)
        if payload.issue_type_scheme_id is not None:
            from app.models.admin import IssueTypeScheme

            scheme = self.db.get(IssueTypeScheme, payload.issue_type_scheme_id)
            if not scheme or scheme.workspace_id != workspace_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Issue type scheme must belong to the same workspace.",
                )
        project = Project(
            workspace_id=workspace_id,
            name=payload.name,
            key=key,
            description=payload.description,
            icon=payload.icon,
            color=payload.color,
            visibility=payload.visibility,
            lead_user_id=payload.lead_user_id,
            product_type=payload.product_type,
            default_workflow=payload.default_workflow,
            available_work_item_types=payload.available_work_item_types or DEFAULT_AVAILABLE_TYPES,
            issue_type_scheme_id=payload.issue_type_scheme_id,
        )
        self.db.add(project)
        self.db.flush()
        statuses = self._create_default_workflow_statuses(project)
        self._create_default_board(project, statuses)
        self.db.add(ProjectMember(project_id=project.id, user_id=user.id, role=ProjectRole.ADMIN))
        if payload.lead_user_id and payload.lead_user_id != user.id:
            self.db.add(
                ProjectMember(project_id=project.id, user_id=payload.lead_user_id, role=ProjectRole.ADMIN)
            )
        self.audit.record(
            actor_user_id=user.id,
            action="project.created",
            entity_type=AuditEntityType.PROJECT,
            entity_id=str(project.id),
            entity_label=project.name,
            project_id=project.id,
            workspace_id=workspace_id,
        )
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A project with this key already exists in the workspace.",
            ) from exc
        return self._query_project(project.id)

    def list_projects(
        self,
        workspace_id: uuid.UUID,
        user: User,
        *,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        sort_by: str = "updated_at",
        archived: bool | None = None,
    ) -> dict:
        self.access.require_workspace_member(workspace_id, user)
        statement = (
            select(Project)
            .options(joinedload(Project.lead))
            .where(Project.workspace_id == workspace_id, Project.deleted_at.is_(None))
        )
        if archived is True:
            statement = statement.where(Project.archived_at.is_not(None))
        elif archived is False:
            statement = statement.where(Project.archived_at.is_(None))
        if search:
            like = f"%{search.lower()}%"
            statement = statement.where(
                func.lower(Project.name).like(like) | func.lower(Project.key).like(like)
            )

        total = int(
            self.db.scalar(select(func.count()).select_from(statement.subquery())) or 0
        )
        sort_column = {
            "name": Project.name,
            "created_at": Project.created_at,
            "updated_at": Project.updated_at,
        }.get(sort_by, Project.updated_at)
        statement = statement.order_by(sort_column.desc()).offset((page - 1) * page_size).limit(page_size)
        items = list(self.db.scalars(statement).all())
        return {"items": items, "meta": {"page": page, "page_size": page_size, "total": total}}

    def get_project(self, project_id: uuid.UUID, user: User) -> Project:
        self.access.require_project_read(project_id, user)
        return self._query_project(project_id)

    def update_project(self, project_id: uuid.UUID, payload: ProjectUpdate, user: User) -> Project:
        context = self.access.require_project_manage(project_id, user)
        project = context.project
        values = payload.model_dump(exclude_unset=True)
        if "key" in values and values["key"] is not None:
            values["key"] = values["key"].upper()
            existing = self.db.scalar(
                select(Project).where(
                    Project.workspace_id == project.workspace_id,
                    func.lower(Project.key) == values["key"].lower(),
                    Project.id != project.id,
                    Project.deleted_at.is_(None),
                )
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A project with this key already exists in the workspace.",
                )
        if "lead_user_id" in values:
            self._require_workspace_user(project.workspace_id, values["lead_user_id"])
        if values.get("available_work_item_types") is None and "available_work_item_types" in values:
            values["available_work_item_types"] = DEFAULT_AVAILABLE_TYPES
        if "issue_type_scheme_id" in values and values["issue_type_scheme_id"] is not None:
            from app.models.admin import IssueTypeScheme

            scheme = self.db.get(IssueTypeScheme, values["issue_type_scheme_id"])
            if not scheme or scheme.workspace_id != project.workspace_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Issue type scheme must belong to the same workspace.",
                )
        for key, value in values.items():
            setattr(project, key, value)
        self.audit.record(
            actor_user_id=user.id,
            action="project.updated",
            entity_type=AuditEntityType.PROJECT,
            entity_id=str(project.id),
            entity_label=project.name,
            project_id=project.id,
            workspace_id=project.workspace_id,
        )
        self.db.commit()
        return self._query_project(project.id)

    def set_archive_state(self, project_id: uuid.UUID, archived: bool, user: User) -> Project:
        context = self.access.require_project_manage(project_id, user)
        project = context.project
        project.archived_at = datetime.now(timezone.utc) if archived else None
        self.audit.record(
            actor_user_id=user.id,
            action="project.archived" if archived else "project.restored",
            entity_type=AuditEntityType.PROJECT,
            entity_id=str(project.id),
            entity_label=project.name,
            project_id=project.id,
            workspace_id=project.workspace_id,
        )
        self.db.commit()
        return self._query_project(project.id)

    def delete_project(self, project_id: uuid.UUID, user: User) -> None:
        context = self.access.require_project_manage(project_id, user)
        project = context.project
        project.deleted_at = datetime.now(timezone.utc)
        self.audit.record(
            actor_user_id=user.id,
            action="project.deleted",
            entity_type=AuditEntityType.PROJECT,
            entity_id=str(project.id),
            entity_label=project.name,
            project_id=project.id,
            workspace_id=project.workspace_id,
        )
        self.db.commit()

    def get_overview(self, project_id: uuid.UUID, user: User) -> dict:
        self.access.require_project_read(project_id, user)
        project = self._query_project(project_id)
        total_work_items = int(
            self.db.scalar(
                select(func.count()).select_from(WorkItem).where(
                    WorkItem.project_id == project_id,
                    WorkItem.deleted_at.is_(None),
                )
            )
            or 0
        )
        member_count = int(
            self.db.scalar(
                select(func.count()).select_from(ProjectMember).where(ProjectMember.project_id == project_id)
            )
            or 0
        )
        status_rows = self.db.execute(
            select(WorkItem.status, func.count())
            .where(WorkItem.project_id == project_id, WorkItem.deleted_at.is_(None))
            .group_by(WorkItem.status)
        ).all()
        priority_rows = self.db.execute(
            select(WorkItem.priority, func.count())
            .where(WorkItem.project_id == project_id, WorkItem.deleted_at.is_(None))
            .group_by(WorkItem.priority)
        ).all()
        recent_work_item_ids = [
            work_item_id
            for work_item_id in self.db.scalars(
                select(WorkItem.id)
                .where(WorkItem.project_id == project_id, WorkItem.deleted_at.is_(None))
                .order_by(WorkItem.updated_at.desc())
                .limit(6)
            ).all()
        ]
        return {
            "project": project,
            "total_work_items": total_work_items,
            "member_count": member_count,
            "status_breakdown": {
                str(status_value.value if hasattr(status_value, "value") else status_value): count
                for status_value, count in status_rows
            },
            "priority_breakdown": {
                str(priority_value.value if hasattr(priority_value, "value") else priority_value): count
                for priority_value, count in priority_rows
            },
            "recent_work_item_ids": recent_work_item_ids,
            "workflow_statuses": project.workflow_statuses,
        }

    def list_members(self, project_id: uuid.UUID, user: User) -> list[ProjectMember]:
        self.access.require_project_read(project_id, user)
        statement = (
            select(ProjectMember)
            .options(joinedload(ProjectMember.user))
            .where(ProjectMember.project_id == project_id)
            .order_by(ProjectMember.created_at.asc())
        )
        return list(self.db.scalars(statement).all())

    def add_member(self, project_id: uuid.UUID, payload: ProjectMemberAdd, user: User) -> ProjectMember:
        context = self.access.require_project_manage(project_id, user)
        self._require_workspace_user(context.project.workspace_id, payload.user_id)
        existing = self.access.get_project_member(project_id, payload.user_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User is already a member of this project.",
            )
        member = ProjectMember(project_id=project_id, user_id=payload.user_id, role=payload.role)
        self.db.add(member)
        self.db.flush()
        self.audit.record(
            actor_user_id=user.id,
            action="project.member_added",
            entity_type=AuditEntityType.MEMBERSHIP,
            entity_id=str(member.id),
            entity_label=str(payload.user_id),
            project_id=project_id,
            workspace_id=context.project.workspace_id,
            field_name="role",
            new_value=payload.role,
        )
        self.db.commit()
        statement = (
            select(ProjectMember)
            .options(joinedload(ProjectMember.user))
            .where(ProjectMember.id == member.id)
        )
        return self.db.scalar(statement)

    def update_member_role(
        self, project_id: uuid.UUID, target_user_id: uuid.UUID, role: ProjectRole, user: User
    ) -> ProjectMember:
        context = self.access.require_project_manage(project_id, user)
        member = self.access.get_project_member(project_id, target_user_id)
        if not member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project member not found.")
        old_role = member.role
        member.role = role
        self.audit.record(
            actor_user_id=user.id,
            action="project.member_role_updated",
            entity_type=AuditEntityType.MEMBERSHIP,
            entity_id=str(member.id),
            entity_label=str(target_user_id),
            project_id=project_id,
            workspace_id=context.project.workspace_id,
            field_name="role",
            old_value=old_role,
            new_value=role,
        )
        self.db.commit()
        statement = (
            select(ProjectMember)
            .options(joinedload(ProjectMember.user))
            .where(ProjectMember.id == member.id)
        )
        return self.db.scalar(statement)

    def remove_member(self, project_id: uuid.UUID, target_user_id: uuid.UUID, user: User) -> None:
        context = self.access.require_project_manage(project_id, user)
        member = self.access.get_project_member(project_id, target_user_id)
        if not member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project member not found.")
        self.audit.record(
            actor_user_id=user.id,
            action="project.member_removed",
            entity_type=AuditEntityType.MEMBERSHIP,
            entity_id=str(member.id),
            entity_label=str(target_user_id),
            project_id=project_id,
            workspace_id=context.project.workspace_id,
        )
        self.db.delete(member)
        self.db.commit()
