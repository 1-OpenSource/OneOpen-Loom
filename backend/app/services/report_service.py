import csv
import io
import uuid
from collections import defaultdict
from datetime import date, datetime, time, timedelta

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.report import WorkItemStatusHistory
from app.models.sprint import Sprint, SprintItem, SprintMetric, SprintState
from app.models.user import User
from app.models.work_item import WorkItem, WorkItemStatus
from app.services.access_service import AccessService


class ReportService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def velocity(self, project_id: uuid.UUID, user: User) -> dict:
        self.access.require_project_read(project_id, user)
        sprints = list(
            self.db.scalars(
                select(Sprint)
                .where(Sprint.project_id == project_id, Sprint.state == SprintState.CLOSED)
                .order_by(Sprint.complete_date.asc())
            ).all()
        )
        series = []
        for sprint in sprints:
            metric = self.db.scalar(
                select(SprintMetric)
                .where(SprintMetric.sprint_id == sprint.id)
                .order_by(SprintMetric.created_at.desc())
            )
            series.append(
                {
                    "sprint_id": str(sprint.id),
                    "sprint_name": sprint.name,
                    "committed_points": metric.committed_points if metric else 0,
                    "completed_points": metric.completed_points if metric else 0,
                }
            )
        return {"series": series}

    def burndown(self, sprint_id: uuid.UUID, user: User) -> dict:
        sprint = self.db.get(Sprint, sprint_id)
        if not sprint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found.")
        self.access.require_project_read(sprint.project_id, user)
        items = list(self.db.scalars(select(SprintItem).where(SprintItem.sprint_id == sprint_id)).all())
        work_item_ids = [item.work_item_id for item in items]
        work_items = {
            wi.id: wi
            for wi in (
                self.db.scalars(select(WorkItem).where(WorkItem.id.in_(work_item_ids))).all()
                if work_item_ids
                else []
            )
        }
        point_by_item = {
            item.work_item_id: item.committed_points
            or (work_items.get(item.work_item_id).estimate_points if work_items.get(item.work_item_id) else 0)
            or 0
            for item in items
        }
        total_points = sum(point_by_item.values())
        start = sprint.start_date or date.today()
        end = sprint.end_date or start
        if end < start:
            end = start
        total_days = (end - start).days + 1
        series = []
        current_day = start
        day_index = 0
        while current_day <= end:
            completed_points = 0
            for item in items:
                work_item = work_items.get(item.work_item_id)
                if (
                    work_item
                    and work_item.status == WorkItemStatus.DONE
                    and work_item.completed_at
                    and work_item.completed_at.date() <= current_day
                ):
                    completed_points += point_by_item.get(item.work_item_id, 0)
            remaining = max(total_points - completed_points, 0)
            ideal_remaining = max(total_points - (total_points * (day_index + 1) / total_days), 0)
            series.append(
                {
                    "date": current_day.isoformat(),
                    "remaining_points": remaining,
                    "ideal_remaining_points": round(ideal_remaining, 2),
                }
            )
            current_day += timedelta(days=1)
            day_index += 1
        return {"sprint_id": str(sprint_id), "total_points": total_points, "series": series}

    def cfd(
        self,
        project_id: uuid.UUID,
        user: User,
        *,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict:
        self.access.require_project_read(project_id, user)
        history = list(
            self.db.scalars(
                select(WorkItemStatusHistory)
                .where(WorkItemStatusHistory.project_id == project_id)
                .order_by(WorkItemStatusHistory.changed_at.asc())
            ).all()
        )
        if not history:
            return {"series": []}
        end = end_date or date.today()
        start = start_date or history[0].changed_at.date()
        events_by_day: dict[date, list[WorkItemStatusHistory]] = defaultdict(list)
        for row in history:
            events_by_day[row.changed_at.date()].append(row)
        sorted_days = sorted(events_by_day.keys())
        item_status: dict[uuid.UUID, str] = {}
        series = []
        current_day = start
        day_pointer = 0
        while current_day <= end:
            while day_pointer < len(sorted_days) and sorted_days[day_pointer] <= current_day:
                for row in events_by_day[sorted_days[day_pointer]]:
                    item_status[row.work_item_id] = row.to_status
                day_pointer += 1
            status_counts: dict[str, int] = defaultdict(int)
            for status_value in item_status.values():
                status_counts[status_value] += 1
            series.append({"date": current_day.isoformat(), **status_counts})
            current_day += timedelta(days=1)
        return {"series": series}

    def cycle_time(self, project_id: uuid.UUID, user: User) -> dict:
        self.access.require_project_read(project_id, user)
        history = list(
            self.db.scalars(
                select(WorkItemStatusHistory)
                .where(WorkItemStatusHistory.project_id == project_id)
                .order_by(WorkItemStatusHistory.changed_at.asc())
            ).all()
        )
        start_times: dict[uuid.UUID, object] = {}
        per_item = []
        for row in history:
            if row.to_status == WorkItemStatus.IN_PROGRESS.value and row.work_item_id not in start_times:
                start_times[row.work_item_id] = row.changed_at
            if row.to_status == WorkItemStatus.DONE.value and row.work_item_id in start_times:
                started = start_times.pop(row.work_item_id)
                duration_seconds = (row.changed_at - started).total_seconds()
                per_item.append(
                    {"work_item_id": str(row.work_item_id), "cycle_time_seconds": duration_seconds}
                )
        durations = [row["cycle_time_seconds"] for row in per_item]
        average = sum(durations) / len(durations) if durations else 0
        return {"average_cycle_time_seconds": average, "items": per_item}

    def project_burndown(self, project_id: uuid.UUID, user: User, sprint_id: uuid.UUID | None = None) -> dict:
        self.access.require_project_read(project_id, user)
        sprint: Sprint | None = None
        if sprint_id:
            sprint = self.db.get(Sprint, sprint_id)
            if not sprint or sprint.project_id != project_id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found.")
        else:
            sprint = self.db.scalar(
                select(Sprint)
                .where(Sprint.project_id == project_id, Sprint.state == SprintState.ACTIVE)
                .order_by(Sprint.start_date.desc())
            )
            if not sprint:
                sprint = self.db.scalar(
                    select(Sprint)
                    .where(Sprint.project_id == project_id, Sprint.state == SprintState.CLOSED)
                    .order_by(Sprint.complete_date.desc())
                )
        if not sprint:
            return {"series": []}
        return self.burndown(sprint.id, user)

    def created_vs_resolved(
        self,
        project_id: uuid.UUID,
        user: User,
        *,
        days: int = 30,
    ) -> dict:
        self.access.require_project_read(project_id, user)
        end = date.today()
        start = end - timedelta(days=max(days - 1, 0))
        start_dt = datetime.combine(start, time.min)
        items = list(
            self.db.scalars(
                select(WorkItem).where(
                    WorkItem.project_id == project_id,
                    WorkItem.deleted_at.is_(None),
                    or_(WorkItem.created_at >= start_dt, WorkItem.completed_at >= start_dt),
                )
            ).all()
        )
        created_by_day: dict[str, int] = defaultdict(int)
        resolved_by_day: dict[str, int] = defaultdict(int)
        for item in items:
            created_day = item.created_at.date()
            if created_day >= start:
                created_by_day[created_day.isoformat()] += 1
            if item.completed_at and item.completed_at.date() >= start:
                resolved_by_day[item.completed_at.date().isoformat()] += 1
        series = []
        current = start
        while current <= end:
            key = current.isoformat()
            series.append(
                {
                    "date": key,
                    "created": created_by_day.get(key, 0),
                    "resolved": resolved_by_day.get(key, 0),
                }
            )
            current += timedelta(days=1)
        return {"series": series}

    @staticmethod
    def to_csv(series: list[dict]) -> str:
        if not series:
            return ""
        output = io.StringIO()
        fieldnames: list[str] = []
        for row in series:
            for key in row.keys():
                if key not in fieldnames:
                    fieldnames.append(key)
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(series)
        return output.getvalue()
