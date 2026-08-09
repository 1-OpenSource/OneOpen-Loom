import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.plan import Plan, PlanProject
from app.models.user import User
from app.models.work_item import WorkItem, WorkItemType
from app.schemas.plan import PlanCreate, PlanUpdate, RoadmapItem
from app.services.access_service import AccessService
from app.services.oql_service import OqlService, parse_oql


class PlanService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def _query_plan(self, plan_id: uuid.UUID) -> Plan:
        statement = select(Plan).options(selectinload(Plan.projects)).where(Plan.id == plan_id)
        plan = self.db.scalar(statement)
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found.")
        return plan

    def create_plan(self, workspace_id: uuid.UUID, payload: PlanCreate, user: User) -> Plan:
        self.access.require_workspace_member(workspace_id, user)
        plan = Plan(
            workspace_id=workspace_id,
            name=payload.name,
            description=payload.description,
            oql=payload.oql,
            created_by_user_id=user.id,
        )
        self.db.add(plan)
        self.db.flush()
        for project_id in payload.project_ids:
            self.access.require_project_read(project_id, user)
            self.db.add(PlanProject(plan_id=plan.id, project_id=project_id))
        self.db.commit()
        return self._query_plan(plan.id)

    def list_plans(self, workspace_id: uuid.UUID, user: User) -> list[Plan]:
        self.access.require_workspace_member(workspace_id, user)
        statement = (
            select(Plan).options(selectinload(Plan.projects)).where(Plan.workspace_id == workspace_id)
        )
        return list(self.db.scalars(statement).all())

    def get_plan(self, plan_id: uuid.UUID, user: User) -> Plan:
        plan = self._query_plan(plan_id)
        self.access.require_workspace_member(plan.workspace_id, user)
        return plan

    def update_plan(self, plan_id: uuid.UUID, payload: PlanUpdate, user: User) -> Plan:
        plan = self._query_plan(plan_id)
        self.access.require_workspace_member(plan.workspace_id, user)
        values = payload.model_dump(exclude_unset=True, exclude={"project_ids"})
        for key, value in values.items():
            setattr(plan, key, value)
        if payload.project_ids is not None:
            for existing in list(plan.projects):
                self.db.delete(existing)
            self.db.flush()
            for project_id in payload.project_ids:
                self.access.require_project_read(project_id, user)
                self.db.add(PlanProject(plan_id=plan.id, project_id=project_id))
        self.db.commit()
        return self._query_plan(plan.id)

    def delete_plan(self, plan_id: uuid.UUID, user: User) -> None:
        plan = self._query_plan(plan_id)
        self.access.require_workspace_member(plan.workspace_id, user)
        self.db.delete(plan)
        self.db.commit()

    def list_issues(self, plan_id: uuid.UUID, user: User) -> list[WorkItem]:
        plan = self._query_plan(plan_id)
        self.access.require_workspace_member(plan.workspace_id, user)
        if not plan.oql:
            project_ids = plan.project_ids
            if not project_ids:
                return []
            statement = select(WorkItem).where(
                WorkItem.project_id.in_(project_ids), WorkItem.deleted_at.is_(None)
            )
            return list(self.db.scalars(statement).all())
        parsed = parse_oql(plan.oql)
        statement = OqlService(self.db).build_statement(parsed, workspace_id=plan.workspace_id)
        return list(self.db.scalars(statement).unique().all())

    def roadmap(self, project_id: uuid.UUID, user: User) -> list[RoadmapItem]:
        self.access.require_project_read(project_id, user)
        statement = (
            select(WorkItem)
            .where(
                WorkItem.project_id == project_id,
                WorkItem.deleted_at.is_(None),
                WorkItem.type.in_([WorkItemType.EPIC, WorkItemType.STORY]),
            )
            .order_by(WorkItem.rank.asc())
        )
        items = list(self.db.scalars(statement).all())
        epics = [item for item in items if item.type == WorkItemType.EPIC]
        stories_by_epic: dict[uuid.UUID, list[WorkItem]] = {}
        orphan_stories = []
        for item in items:
            if item.type == WorkItemType.STORY:
                if item.epic_id:
                    stories_by_epic.setdefault(item.epic_id, []).append(item)
                else:
                    orphan_stories.append(item)

        def to_roadmap_item(work_item: WorkItem, children: list[WorkItem] | None = None) -> RoadmapItem:
            return RoadmapItem(
                id=work_item.id,
                work_item_key=work_item.work_item_key,
                title=work_item.title,
                type=work_item.type.value,
                status=work_item.status.value,
                start_date=work_item.start_date,
                due_date=work_item.due_date,
                epic_id=work_item.epic_id,
                children=[to_roadmap_item(child) for child in (children or [])],
            )

        result = [to_roadmap_item(epic, stories_by_epic.get(epic.id, [])) for epic in epics]
        result.extend(to_roadmap_item(story) for story in orphan_stories)
        return result
