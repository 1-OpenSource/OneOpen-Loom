import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import (
    DashboardCreate,
    DashboardGadgetCreate,
    DashboardGadgetRead,
    DashboardRead,
    DashboardUpdate,
    IntakeFormCreate,
    IntakeFormRead,
    IntakeFormUpdate,
    IntakeSubmission,
    IssueTemplateCreate,
    IssueTemplateRead,
    ProjectTemplateCreate,
    ProjectTemplateRead,
)
from app.schemas.work_item import WorkItemRead
from app.services.dashboard_service import DashboardService

router = APIRouter(tags=["dashboards"])


@router.post("/workspaces/{workspace_id}/dashboards", response_model=DashboardRead, status_code=status.HTTP_201_CREATED)
def create_dashboard(
    workspace_id: uuid.UUID,
    payload: DashboardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DashboardService(db).create_dashboard(workspace_id, payload, current_user)


@router.get("/workspaces/{workspace_id}/dashboards", response_model=list[DashboardRead])
def list_dashboards(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DashboardService(db).list_dashboards(workspace_id, current_user)


@router.put("/dashboards/{dashboard_id}", response_model=DashboardRead)
def update_dashboard(
    dashboard_id: uuid.UUID,
    payload: DashboardUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DashboardService(db).update_dashboard(dashboard_id, payload, current_user)


@router.delete("/dashboards/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dashboard(
    dashboard_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    DashboardService(db).delete_dashboard(dashboard_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/dashboards/{dashboard_id}/gadgets", response_model=DashboardGadgetRead, status_code=status.HTTP_201_CREATED
)
def add_dashboard_gadget(
    dashboard_id: uuid.UUID,
    payload: DashboardGadgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DashboardService(db).add_gadget(dashboard_id, payload, current_user)


@router.delete("/dashboard-gadgets/{gadget_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_dashboard_gadget(
    gadget_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    DashboardService(db).remove_gadget(gadget_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/project-templates", response_model=ProjectTemplateRead, status_code=status.HTTP_201_CREATED
)
def create_project_template(
    payload: ProjectTemplateCreate,
    workspace_id: uuid.UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DashboardService(db).create_project_template(workspace_id, payload, current_user)


@router.get("/project-templates", response_model=list[ProjectTemplateRead])
def list_project_templates(
    workspace_id: uuid.UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DashboardService(db).list_project_templates(workspace_id, current_user)


@router.post(
    "/projects/{project_id}/issue-templates",
    response_model=IssueTemplateRead,
    status_code=status.HTTP_201_CREATED,
)
def create_issue_template(
    project_id: uuid.UUID,
    payload: IssueTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DashboardService(db).create_issue_template(project_id, payload, current_user)


@router.get("/projects/{project_id}/issue-templates", response_model=list[IssueTemplateRead])
def list_issue_templates(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DashboardService(db).list_issue_templates(project_id, current_user)


@router.delete("/issue-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_issue_template(
    template_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    DashboardService(db).delete_issue_template(template_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/projects/{project_id}/intake-forms", response_model=IntakeFormRead, status_code=status.HTTP_201_CREATED
)
def create_intake_form(
    project_id: uuid.UUID,
    payload: IntakeFormCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DashboardService(db).create_intake_form(project_id, payload, current_user)


@router.get("/projects/{project_id}/intake-forms", response_model=list[IntakeFormRead])
def list_intake_forms(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DashboardService(db).list_intake_forms(project_id, current_user)


@router.put("/intake-forms/{form_id}", response_model=IntakeFormRead)
def update_intake_form(
    form_id: uuid.UUID,
    payload: IntakeFormUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DashboardService(db).update_intake_form(form_id, payload, current_user)


@router.post("/intake/{token}/submit", response_model=WorkItemRead, status_code=status.HTTP_201_CREATED)
def submit_intake_form(
    token: str,
    payload: IntakeSubmission,
    db: Session = Depends(get_db),
):
    return DashboardService(db).submit_intake_form(token, payload)
