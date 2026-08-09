import re
import uuid
from dataclasses import dataclass, field

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.project import Project
from app.models.user import User
from app.models.work_item import WorkItem, WorkItemLabel, WorkItemWatcher

CLAUSE_PATTERN = re.compile(
    r'^(?P<field>[A-Za-z_]+)\s*(?P<op>=|!=|~)\s*(?P<value>"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\'|\S+)$'
)

TEXT_FIELDS = {"title", "description"}
SORTABLE_FIELDS = {
    "created_at": WorkItem.created_at,
    "updated_at": WorkItem.updated_at,
    "due_date": WorkItem.due_date,
    "priority": WorkItem.priority,
    "rank": WorkItem.rank,
    "status": WorkItem.status,
}


@dataclass
class OqlParseResult:
    filters: list[tuple[str, str, str]] = field(default_factory=list)
    order_by: str | None = None
    order_dir: str = "asc"


def _strip_quotes(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


def parse_oql(oql: str) -> OqlParseResult:
    text = oql.strip()
    order_by = None
    order_dir = "asc"
    order_match = re.search(r"\border\s+by\s+(.+)$", text, re.IGNORECASE)
    if order_match:
        order_clause = order_match.group(1).strip()
        text = text[: order_match.start()].strip()
        parts = order_clause.split()
        if parts:
            order_by = parts[0].lower()
        if len(parts) > 1 and parts[1].lower() in ("asc", "desc"):
            order_dir = parts[1].lower()

    filters: list[tuple[str, str, str]] = []
    if text:
        clauses = re.split(r"\s+AND\s+", text, flags=re.IGNORECASE)
        for clause in clauses:
            clause = clause.strip()
            if not clause:
                continue
            match = CLAUSE_PATTERN.match(clause)
            if not match:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Could not parse OQL clause: {clause}",
                )
            field_name = match.group("field").lower()
            op = match.group("op")
            value = _strip_quotes(match.group("value"))
            filters.append((field_name, op, value))
    return OqlParseResult(filters=filters, order_by=order_by, order_dir=order_dir)


class OqlService:
    def __init__(self, db: Session):
        self.db = db

    def build_statement(
        self,
        parsed: OqlParseResult,
        *,
        project_id: uuid.UUID | None = None,
        workspace_id: uuid.UUID | None = None,
    ) -> Select:
        statement = (
            select(WorkItem)
            .join(Project, Project.id == WorkItem.project_id)
            .options(
                joinedload(WorkItem.owner),
                joinedload(WorkItem.reporter),
                selectinload(WorkItem.labels),
            )
            .where(WorkItem.deleted_at.is_(None))
        )
        if project_id:
            statement = statement.where(WorkItem.project_id == project_id)
        if workspace_id:
            statement = statement.where(Project.workspace_id == workspace_id)
        for field_name, op, value in parsed.filters:
            statement = self._apply_filter(statement, field_name, op, value)

        order_column = SORTABLE_FIELDS.get(parsed.order_by) if parsed.order_by else None
        if order_column is not None:
            statement = statement.order_by(
                order_column.desc() if parsed.order_dir == "desc" else order_column.asc()
            )
        else:
            statement = statement.order_by(WorkItem.rank.asc())
        return statement

    def _apply_filter(self, statement: Select, field_name: str, op: str, value: str) -> Select:
        if field_name == "project":
            statement = statement.where(func.lower(Project.key) == value.lower())
        elif field_name == "type":
            statement = statement.where(func.lower(WorkItem.type) == value.lower())
        elif field_name == "status":
            statement = statement.where(func.lower(WorkItem.status) == value.lower())
        elif field_name == "priority":
            statement = statement.where(func.lower(WorkItem.priority) == value.lower())
        elif field_name == "is_blocked":
            statement = statement.where(WorkItem.is_blocked.is_(value.lower() in ("1", "true", "yes")))
        elif field_name == "assignee":
            user = self.db.scalar(select(User).where(func.lower(User.email) == value.lower()))
            if not user:
                user = self.db.scalar(select(User).where(func.lower(User.name) == value.lower()))
            statement = statement.where(WorkItem.owner_id == (user.id if user else None))
        elif field_name == "reporter":
            user = self.db.scalar(select(User).where(func.lower(User.email) == value.lower()))
            statement = statement.where(WorkItem.reporter_id == (user.id if user else None))
        elif field_name == "label":
            statement = statement.join(WorkItemLabel).where(func.lower(WorkItemLabel.name) == value.lower())
        elif field_name == "watcher":
            user = self.db.scalar(select(User).where(func.lower(User.email) == value.lower()))
            statement = statement.join(WorkItemWatcher).where(
                WorkItemWatcher.user_id == (user.id if user else None)
            )
        elif field_name in TEXT_FIELDS or field_name == "text":
            like = f"%{value.lower()}%"
            if field_name == "text":
                statement = statement.where(
                    func.lower(WorkItem.title).like(like) | func.lower(WorkItem.description).like(like)
                )
            else:
                column = getattr(WorkItem, field_name)
                statement = statement.where(func.lower(column).like(like))
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported OQL field: {field_name}",
            )
        return statement

    def search(
        self,
        oql: str,
        *,
        project_id: uuid.UUID | None = None,
        workspace_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        parsed = parse_oql(oql)
        statement = self.build_statement(parsed, project_id=project_id, workspace_id=workspace_id)
        total = int(self.db.scalar(select(func.count()).select_from(statement.subquery())) or 0)
        statement = statement.offset((page - 1) * page_size).limit(page_size)
        items = list(self.db.scalars(statement).unique().all())
        return {"items": items, "meta": {"page": page, "page_size": page_size, "total": total}}
