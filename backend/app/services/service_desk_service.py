import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.service_desk import Approval, CsatResponse, Queue, RequestType, SlaCalendar, SlaGoal
from app.models.user import User
from app.models.work_item import WorkItem
from app.schemas.service_desk import (
    ApprovalCreate,
    ApprovalDecision,
    CsatSubmit,
    QueueCreate,
    RequestTypeCreate,
    SlaCalendarCreate,
    SlaGoalCreate,
)
from app.services.access_service import AccessService
from app.services.oql_service import OqlService, parse_oql


class ServiceDeskService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def create_request_type(
        self, project_id: uuid.UUID, payload: RequestTypeCreate, user: User
    ) -> RequestType:
        self.access.require_project_write(project_id, user)
        request_type = RequestType(
            project_id=project_id,
            name=payload.name,
            description=payload.description,
            work_item_type=payload.work_item_type,
            icon=payload.icon,
            fields_json=payload.fields_json,
        )
        self.db.add(request_type)
        self.db.commit()
        return request_type

    def list_request_types(self, project_id: uuid.UUID, user: User) -> list[RequestType]:
        self.access.require_project_read(project_id, user)
        return list(self.db.scalars(select(RequestType).where(RequestType.project_id == project_id)).all())

    def create_queue(self, project_id: uuid.UUID, payload: QueueCreate, user: User) -> Queue:
        self.access.require_project_write(project_id, user)
        queue = Queue(project_id=project_id, name=payload.name, oql=payload.oql, position=payload.position)
        self.db.add(queue)
        self.db.commit()
        return queue

    def list_queues(self, project_id: uuid.UUID, user: User) -> list[Queue]:
        self.access.require_project_read(project_id, user)
        statement = select(Queue).where(Queue.project_id == project_id).order_by(Queue.position.asc())
        return list(self.db.scalars(statement).all())

    def queue_issues(self, queue_id: uuid.UUID, user: User) -> list[WorkItem]:
        queue = self.db.get(Queue, queue_id)
        if not queue:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue not found.")
        self.access.require_project_read(queue.project_id, user)
        if not queue.oql:
            statement = select(WorkItem).where(
                WorkItem.project_id == queue.project_id, WorkItem.deleted_at.is_(None)
            )
            return list(self.db.scalars(statement).all())
        parsed = parse_oql(queue.oql)
        statement = OqlService(self.db).build_statement(parsed, project_id=queue.project_id)
        return list(self.db.scalars(statement).unique().all())

    def create_sla_calendar(
        self, project_id: uuid.UUID, payload: SlaCalendarCreate, user: User
    ) -> SlaCalendar:
        self.access.require_project_write(project_id, user)
        calendar = SlaCalendar(
            project_id=project_id,
            name=payload.name,
            timezone=payload.timezone,
            working_hours_json=payload.working_hours_json,
        )
        self.db.add(calendar)
        self.db.commit()
        return calendar

    def list_sla_calendars(self, project_id: uuid.UUID, user: User) -> list[SlaCalendar]:
        self.access.require_project_read(project_id, user)
        return list(self.db.scalars(select(SlaCalendar).where(SlaCalendar.project_id == project_id)).all())

    def create_sla_goal(self, project_id: uuid.UUID, payload: SlaGoalCreate, user: User) -> SlaGoal:
        self.access.require_project_write(project_id, user)
        goal = SlaGoal(
            project_id=project_id,
            name=payload.name,
            calendar_id=payload.calendar_id,
            oql=payload.oql,
            goal_seconds=payload.goal_seconds,
        )
        self.db.add(goal)
        self.db.commit()
        return goal

    def list_sla_goals(self, project_id: uuid.UUID, user: User) -> list[SlaGoal]:
        self.access.require_project_read(project_id, user)
        return list(self.db.scalars(select(SlaGoal).where(SlaGoal.project_id == project_id)).all())

    def create_approval(self, work_item_id: uuid.UUID, payload: ApprovalCreate, user: User) -> Approval:
        work_item = self.db.get(WorkItem, work_item_id)
        if not work_item or work_item.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
        self.access.require_project_write(work_item.project_id, user)
        approval = Approval(work_item_id=work_item_id, approver_user_id=payload.approver_user_id)
        self.db.add(approval)
        self.db.commit()
        return approval

    def decide_approval(self, approval_id: uuid.UUID, payload: ApprovalDecision, user: User) -> Approval:
        approval = self.db.get(Approval, approval_id)
        if not approval:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found.")
        if approval.approver_user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Only the assigned approver can decide."
            )
        approval.status = payload.status
        approval.comment = payload.comment
        approval.decided_at = datetime.now(timezone.utc)
        self.db.commit()
        return approval

    def list_approvals(self, work_item_id: uuid.UUID, user: User) -> list[Approval]:
        work_item = self.db.get(WorkItem, work_item_id)
        if not work_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
        self.access.require_project_read(work_item.project_id, user)
        return list(self.db.scalars(select(Approval).where(Approval.work_item_id == work_item_id)).all())

    def submit_csat(self, work_item_id: uuid.UUID, payload: CsatSubmit, user: User) -> CsatResponse:
        work_item = self.db.get(WorkItem, work_item_id)
        if not work_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
        self.access.require_project_read(work_item.project_id, user)
        response = CsatResponse(
            work_item_id=work_item_id,
            rating=payload.rating,
            comment=payload.comment,
            submitted_by_user_id=user.id,
        )
        self.db.add(response)
        self.db.commit()
        return response
