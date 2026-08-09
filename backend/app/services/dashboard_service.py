import secrets
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.dashboard import Dashboard, DashboardGadget, IntakeForm, IssueTemplate, ProjectTemplate
from app.models.project import ProjectMember, ProjectRole
from app.models.user import User
from app.models.work_item import WorkItem, WorkItemType
from app.schemas.dashboard import (
    DashboardCreate,
    DashboardGadgetCreate,
    DashboardUpdate,
    IntakeFormCreate,
    IntakeFormUpdate,
    IntakeSubmission,
    IssueTemplateCreate,
    ProjectTemplateCreate,
)
from app.schemas.work_item import WorkItemCreate
from app.services.access_service import AccessService
from app.services.work_item_service import WorkItemService


class DashboardService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def _query_dashboard(self, dashboard_id: uuid.UUID) -> Dashboard:
        statement = (
            select(Dashboard).options(selectinload(Dashboard.gadgets)).where(Dashboard.id == dashboard_id)
        )
        dashboard = self.db.scalar(statement)
        if not dashboard:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found.")
        return dashboard

    def create_dashboard(self, workspace_id: uuid.UUID, payload: DashboardCreate, user: User) -> Dashboard:
        self.access.require_workspace_member(workspace_id, user)
        dashboard = Dashboard(
            workspace_id=workspace_id, name=payload.name, owner_user_id=user.id, is_shared=payload.is_shared
        )
        self.db.add(dashboard)
        self.db.commit()
        return self._query_dashboard(dashboard.id)

    def list_dashboards(self, workspace_id: uuid.UUID, user: User) -> list[Dashboard]:
        self.access.require_workspace_member(workspace_id, user)
        statement = (
            select(Dashboard)
            .options(selectinload(Dashboard.gadgets))
            .where(Dashboard.workspace_id == workspace_id)
        )
        return list(self.db.scalars(statement).all())

    def update_dashboard(self, dashboard_id: uuid.UUID, payload: DashboardUpdate, user: User) -> Dashboard:
        dashboard = self._query_dashboard(dashboard_id)
        self.access.require_workspace_member(dashboard.workspace_id, user)
        if dashboard.owner_user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can edit this dashboard.")
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            setattr(dashboard, key, value)
        self.db.commit()
        return self._query_dashboard(dashboard.id)

    def delete_dashboard(self, dashboard_id: uuid.UUID, user: User) -> None:
        dashboard = self._query_dashboard(dashboard_id)
        self.access.require_workspace_member(dashboard.workspace_id, user)
        if dashboard.owner_user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can delete this dashboard."
            )
        self.db.delete(dashboard)
        self.db.commit()

    def add_gadget(self, dashboard_id: uuid.UUID, payload: DashboardGadgetCreate, user: User) -> DashboardGadget:
        dashboard = self._query_dashboard(dashboard_id)
        self.access.require_workspace_member(dashboard.workspace_id, user)
        gadget = DashboardGadget(
            dashboard_id=dashboard.id,
            gadget_type=payload.gadget_type,
            config_json=payload.config_json,
            position=payload.position,
        )
        self.db.add(gadget)
        self.db.commit()
        return gadget

    def remove_gadget(self, gadget_id: uuid.UUID, user: User) -> None:
        gadget = self.db.get(DashboardGadget, gadget_id)
        if not gadget:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gadget not found.")
        dashboard = self._query_dashboard(gadget.dashboard_id)
        self.access.require_workspace_member(dashboard.workspace_id, user)
        self.db.delete(gadget)
        self.db.commit()

    def create_project_template(
        self, workspace_id: uuid.UUID | None, payload: ProjectTemplateCreate, user: User
    ) -> ProjectTemplate:
        if workspace_id:
            self.access.require_workspace_member(workspace_id, user)
        template = ProjectTemplate(workspace_id=workspace_id, name=payload.name, config_json=payload.config_json)
        self.db.add(template)
        self.db.commit()
        return template

    def list_project_templates(self, workspace_id: uuid.UUID | None, user: User) -> list[ProjectTemplate]:
        statement = select(ProjectTemplate)
        if workspace_id:
            self.access.require_workspace_member(workspace_id, user)
            statement = statement.where(ProjectTemplate.workspace_id == workspace_id)
        return list(self.db.scalars(statement).all())

    def create_issue_template(
        self, project_id: uuid.UUID, payload: IssueTemplateCreate, user: User
    ) -> IssueTemplate:
        self.access.require_project_write(project_id, user)
        template = IssueTemplate(
            project_id=project_id,
            name=payload.name,
            work_item_type=payload.work_item_type,
            fields_json=payload.fields_json,
        )
        self.db.add(template)
        self.db.commit()
        return template

    def list_issue_templates(self, project_id: uuid.UUID, user: User) -> list[IssueTemplate]:
        self.access.require_project_read(project_id, user)
        return list(self.db.scalars(select(IssueTemplate).where(IssueTemplate.project_id == project_id)).all())

    def delete_issue_template(self, template_id: uuid.UUID, user: User) -> None:
        template = self.db.get(IssueTemplate, template_id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue template not found.")
        self.access.require_project_write(template.project_id, user)
        self.db.delete(template)
        self.db.commit()

    def create_intake_form(self, project_id: uuid.UUID, payload: IntakeFormCreate, user: User) -> IntakeForm:
        self.access.require_project_write(project_id, user)
        form = IntakeForm(
            project_id=project_id,
            name=payload.name,
            token=secrets.token_urlsafe(24),
            fields_json=payload.fields_json,
            default_work_item_type=payload.default_work_item_type,
        )
        self.db.add(form)
        self.db.commit()
        return form

    def list_intake_forms(self, project_id: uuid.UUID, user: User) -> list[IntakeForm]:
        self.access.require_project_read(project_id, user)
        return list(self.db.scalars(select(IntakeForm).where(IntakeForm.project_id == project_id)).all())

    def update_intake_form(self, form_id: uuid.UUID, payload: IntakeFormUpdate, user: User) -> IntakeForm:
        form = self.db.get(IntakeForm, form_id)
        if not form:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intake form not found.")
        self.access.require_project_write(form.project_id, user)
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            setattr(form, key, value)
        self.db.commit()
        return form

    def submit_intake_form(self, token: str, payload: IntakeSubmission) -> WorkItem:
        form = self.db.scalar(select(IntakeForm).where(IntakeForm.token == token, IntakeForm.is_active.is_(True)))
        if not form:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intake form not found.")
        admin_member = self.db.scalar(
            select(ProjectMember).where(
                ProjectMember.project_id == form.project_id, ProjectMember.role == ProjectRole.ADMIN
            )
        )
        if not admin_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Project has no admin to receive submissions."
            )
        creator = self.db.get(User, admin_member.user_id)
        try:
            work_item_type = WorkItemType(form.default_work_item_type)
        except ValueError:
            work_item_type = WorkItemType.TASK
        description = payload.description or ""
        if payload.reporter_email:
            description = f"{description}\n\nSubmitted by: {payload.reporter_email}".strip()
        create_payload = WorkItemCreate(title=payload.title, description=description, type=work_item_type)
        return WorkItemService(self.db).create_work_item(form.project_id, create_payload, creator)
