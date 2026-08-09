import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.report_service import ReportService

router = APIRouter(tags=["reports"])


def _wants_csv(request: Request, format_param: str | None) -> bool:
    if format_param and format_param.lower() == "csv":
        return True
    accept = request.headers.get("accept", "")
    return "text/csv" in accept


@router.get("/projects/{project_id}/reports/velocity")
def get_velocity(
    project_id: uuid.UUID,
    request: Request,
    format: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ReportService(db)
    data = service.velocity(project_id, current_user)
    if _wants_csv(request, format):
        return PlainTextResponse(service.to_csv(data["series"]), media_type="text/csv")
    return data


@router.get("/projects/{project_id}/reports/burndown")
def get_project_burndown(
    project_id: uuid.UUID,
    request: Request,
    sprint_id: uuid.UUID | None = Query(default=None),
    format: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ReportService(db)
    data = service.project_burndown(project_id, current_user, sprint_id=sprint_id)
    if _wants_csv(request, format):
        return PlainTextResponse(service.to_csv(data["series"]), media_type="text/csv")
    return data


@router.get("/sprints/{sprint_id}/reports/burndown")
def get_burndown(
    sprint_id: uuid.UUID,
    request: Request,
    format: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ReportService(db)
    data = service.burndown(sprint_id, current_user)
    if _wants_csv(request, format):
        return PlainTextResponse(service.to_csv(data["series"]), media_type="text/csv")
    return data


@router.get("/projects/{project_id}/reports/cfd")
@router.get("/projects/{project_id}/reports/cumulative-flow")
def get_cfd(
    project_id: uuid.UUID,
    request: Request,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    format: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ReportService(db)
    data = service.cfd(project_id, current_user, start_date=start_date, end_date=end_date)
    if _wants_csv(request, format):
        return PlainTextResponse(service.to_csv(data["series"]), media_type="text/csv")
    return data


@router.get("/projects/{project_id}/reports/created-vs-resolved")
def get_created_vs_resolved(
    project_id: uuid.UUID,
    request: Request,
    days: int = Query(default=30, ge=7, le=180),
    format: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ReportService(db)
    data = service.created_vs_resolved(project_id, current_user, days=days)
    if _wants_csv(request, format):
        return PlainTextResponse(service.to_csv(data["series"]), media_type="text/csv")
    return data


@router.get("/projects/{project_id}/reports/cycle-time")
def get_cycle_time(
    project_id: uuid.UUID,
    request: Request,
    format: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ReportService(db)
    data = service.cycle_time(project_id, current_user)
    if _wants_csv(request, format):
        return PlainTextResponse(service.to_csv(data["items"]), media_type="text/csv")
    return data
