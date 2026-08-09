import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.activity import AuditEntityType
from app.models.project import Project, WorkflowStatus
from app.models.report import WorkItemStatusHistory
from app.models.user import User
from app.models.work_item import (
    ALLOWED_STATUS_TRANSITIONS,
    STAGE_STATUSES,
    WorkItem,
    WorkItemAttachment,
    WorkItemLabel,
    WorkItemLink,
    WorkItemLinkType,
    WorkItemPriority,
    WorkItemStatus,
    WorkItemType,
    WorkItemWatcher,
)
from app.schemas.work_item import (
    WorkItemBlockedUpdate,
    WorkItemCreate,
    WorkItemLinkCreate,
    WorkItemOwnerUpdate,
    WorkItemPriorityUpdate,
    WorkItemRankUpdate,
    WorkItemStatusUpdate,
    WorkItemUpdate,
)
from app.services.access_service import AccessService
from app.services.audit_service import AuditService
from app.services.storage_service import StorageService

TRACKED_FIELDS = {
    "title",
    "description",
    "acceptance_criteria",
    "type",
    "status",
    "is_blocked",
    "priority",
    "owner_id",
    "reporter_id",
    "parent_work_item_id",
    "epic_id",
    "estimate_points",
    "original_estimate_seconds",
    "remaining_estimate_seconds",
    "start_date",
    "due_date",
    "sprint_name",
    "components",
}

RANK_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"
RANK_WIDTH = 12
RANK_STEP = 1_000_000


def _rank_to_int(rank: str | None) -> int:
    if not rank:
        return 0
    try:
        return int(rank, 36)
    except ValueError:
        return 0


def _int_to_rank(value: int) -> str:
    if value <= 0:
        return "0".rjust(RANK_WIDTH, "0")
    digits: list[str] = []
    remaining = value
    while remaining > 0:
        remaining, rem = divmod(remaining, 36)
        digits.append(RANK_ALPHABET[rem])
    return "".join(reversed(digits)).rjust(RANK_WIDTH, "0")


def _mid_rank(lower: str | None, upper: str | None) -> str:
    lower_val = _rank_to_int(lower)
    upper_val = _rank_to_int(upper) if upper else lower_val + RANK_STEP * 2
    if upper_val <= lower_val:
        upper_val = lower_val + RANK_STEP * 2
    mid = lower_val + max((upper_val - lower_val) // 2, 1)
    return _int_to_rank(mid)


class WorkItemService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)
        self.audit = AuditService(db)
        self.storage = StorageService()

    def _query_work_item(self, work_item_id: uuid.UUID) -> WorkItem:
        statement = (
            select(WorkItem)
            .options(
                joinedload(WorkItem.owner),
                joinedload(WorkItem.creator),
                joinedload(WorkItem.reporter),
                joinedload(WorkItem.parent_work_item),
                selectinload(WorkItem.subtasks).selectinload(WorkItem.labels),
                selectinload(WorkItem.labels),
                selectinload(WorkItem.watchers).joinedload(WorkItemWatcher.user),
                selectinload(WorkItem.attachments).joinedload(WorkItemAttachment.uploaded_by),
                selectinload(WorkItem.outgoing_links).joinedload(WorkItemLink.target_work_item),
                selectinload(WorkItem.incoming_links).joinedload(WorkItemLink.source_work_item),
            )
            .where(WorkItem.id == work_item_id, WorkItem.deleted_at.is_(None))
        )
        work_item = self.db.scalar(statement)
        if not work_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
        return work_item

    def _get_project(self, project_id: uuid.UUID, user: User) -> Project:
        context = self.access.require_project_read(project_id, user)
        return context.project

    def _validate_project_user(self, project: Project, user_id: uuid.UUID | None) -> None:
        if user_id is None:
            return
        member = self.access.get_workspace_member(project.workspace_id, user_id)
        if not member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected user is not a member of this workspace.",
            )

    def _validate_watcher_ids(self, project: Project, watcher_ids: list[uuid.UUID]) -> None:
        for watcher_id in watcher_ids:
            self._validate_project_user(project, watcher_id)

    def _validate_parent(self, project_id: uuid.UUID, parent_work_item_id: uuid.UUID | None) -> None:
        if parent_work_item_id is None:
            return
        parent = self.db.get(WorkItem, parent_work_item_id)
        if not parent or parent.project_id != project_id or parent.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent work item must belong to the same project.",
            )

    def _validate_epic(self, project_id: uuid.UUID, epic_id: uuid.UUID | None) -> None:
        if epic_id is None:
            return
        epic = self.db.get(WorkItem, epic_id)
        if not epic or epic.project_id != project_id or epic.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Epic must belong to the same project.",
            )
        if epic.type != WorkItemType.EPIC:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="epic_id must reference a work item of type EPIC.",
            )

    def _next_rank(self, project_id: uuid.UUID) -> str:
        last_rank = self.db.scalar(
            select(func.max(WorkItem.rank)).where(WorkItem.project_id == project_id)
        )
        return _mid_rank(last_rank, None)

    def _normalize_stage_status(self, stage: WorkItemStatus) -> WorkItemStatus:
        if stage == WorkItemStatus.BLOCKED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Blocked is a flag, not a board stage. Use is_blocked instead.",
            )
        if stage not in STAGE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported board stage: {stage.value}.",
            )
        return stage

    def _validate_status_transition(
        self, project_id: uuid.UUID, current: WorkItemStatus, next_status: WorkItemStatus
    ) -> None:
        next_status = self._normalize_stage_status(next_status)
        if current == WorkItemStatus.BLOCKED:
            return
        if current == next_status:
            return
        has_rows, allowed_via_rows = self._custom_transition_lookup(project_id, current)
        if has_rows:
            if next_status not in allowed_via_rows:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot move from {current.value} to {next_status.value}.",
                )
            return
        allowed = ALLOWED_STATUS_TRANSITIONS.get(current, set())
        if next_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot move from {current.value} to {next_status.value}.",
            )

    def _custom_transition_lookup(
        self, project_id: uuid.UUID, current: WorkItemStatus
    ) -> tuple[bool, set[WorkItemStatus]]:
        from app.models.board import WorkflowTransition

        transition_count = self.db.scalar(
            select(func.count())
            .select_from(WorkflowTransition)
            .where(WorkflowTransition.project_id == project_id)
        )
        if not transition_count:
            return False, set()
        from_status = self.db.scalar(
            select(WorkflowStatus).where(
                WorkflowStatus.project_id == project_id, WorkflowStatus.key == current.value
            )
        )
        if not from_status:
            return True, set()
        rows = self.db.scalars(
            select(WorkflowTransition).where(
                WorkflowTransition.project_id == project_id,
                WorkflowTransition.from_status_id == from_status.id,
            )
        ).all()
        status_by_id = {
            row.id: row.key
            for row in self.db.scalars(
                select(WorkflowStatus).where(WorkflowStatus.project_id == project_id)
            ).all()
        }
        allowed_keys = {status_by_id.get(row.to_status_id) for row in rows}
        allowed_statuses = {
            WorkItemStatus(key) for key in allowed_keys if key and key in WorkItemStatus._value2member_map_
        }
        return True, allowed_statuses

    def _validate_work_item_type(self, project: Project, work_item_type: object) -> None:
        type_value = work_item_type.value if hasattr(work_item_type, "value") else str(work_item_type)
        if project.issue_type_scheme_id:
            from app.models.admin import IssueTypeSchemeItem

            allowed_types = {
                row.work_item_type
                for row in self.db.scalars(
                    select(IssueTypeSchemeItem).where(
                        IssueTypeSchemeItem.scheme_id == project.issue_type_scheme_id
                    )
                ).all()
            }
            if allowed_types and type_value not in allowed_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Work item type {type_value} is not allowed by the project's issue type scheme.",
                )
            return
        allowed = project.available_work_item_types or []
        if allowed and type_value not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Work item type {type_value} is not enabled for this project.",
            )

    def _find_transition(
        self, project_id: uuid.UUID, current: WorkItemStatus, next_status: WorkItemStatus
    ):
        from app.models.board import WorkflowTransition

        from_status = self.db.scalar(
            select(WorkflowStatus).where(
                WorkflowStatus.project_id == project_id, WorkflowStatus.key == current.value
            )
        )
        to_status = self.db.scalar(
            select(WorkflowStatus).where(
                WorkflowStatus.project_id == project_id, WorkflowStatus.key == next_status.value
            )
        )
        if not from_status or not to_status:
            return None
        return self.db.scalar(
            select(WorkflowTransition).where(
                WorkflowTransition.project_id == project_id,
                WorkflowTransition.from_status_id == from_status.id,
                WorkflowTransition.to_status_id == to_status.id,
            )
        )

    def _transition_rules_for(
        self, work_item: WorkItem, current: WorkItemStatus, next_status: WorkItemStatus
    ):
        from app.models.board import WorkflowTransitionRule

        if current == next_status:
            return []
        transition = self._find_transition(work_item.project_id, current, next_status)
        if not transition:
            return []
        return list(
            self.db.scalars(
                select(WorkflowTransitionRule)
                .where(WorkflowTransitionRule.transition_id == transition.id)
                .order_by(WorkflowTransitionRule.position.asc())
            ).all()
        )

    def _evaluate_transition_guards(
        self,
        work_item: WorkItem,
        current: WorkItemStatus,
        next_status: WorkItemStatus,
        *,
        user: User,
        transition_comment: str | None = None,
    ) -> None:
        from app.models.board import WorkflowRuleKind

        for rule in self._transition_rules_for(work_item, current, next_status):
            if rule.kind in {WorkflowRuleKind.CONDITION.value, WorkflowRuleKind.VALIDATOR.value}:
                self._check_transition_rule(
                    work_item,
                    rule.rule_type,
                    rule.config or {},
                    kind=rule.kind,
                    user=user,
                    transition_comment=transition_comment,
                )

    def _run_transition_post_functions(
        self,
        work_item: WorkItem,
        current: WorkItemStatus,
        next_status: WorkItemStatus,
        *,
        user: User,
    ) -> None:
        from app.models.board import WorkflowRuleKind

        for rule in self._transition_rules_for(work_item, current, next_status):
            if rule.kind == WorkflowRuleKind.POST_FUNCTION.value:
                self._run_transition_post_function(
                    work_item, rule.rule_type, rule.config or {}, user=user
                )

    def _check_transition_rule(
        self,
        work_item: WorkItem,
        rule_type: str,
        config: dict,
        *,
        kind: str,
        user: User,
        transition_comment: str | None = None,
    ) -> None:
        label = "Condition" if kind == "CONDITION" else "Validator"
        if rule_type in {"field_required", "require_field", "required_field"}:
            field_name = config.get("field")
            if not field_name:
                return
            value = getattr(work_item, field_name, None)
            if value is None or value == "":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{label} failed: field '{field_name}' is required for this transition.",
                )
        elif rule_type in {"not_blocked", "must_not_be_blocked"}:
            if work_item.is_blocked:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{label} failed: work item must not be blocked.",
                )
        elif rule_type == "field_equals":
            field_name = config.get("field")
            expected = config.get("value")
            if field_name is None:
                return
            actual = getattr(work_item, field_name, None)
            actual_value = actual.value if hasattr(actual, "value") else actual
            if actual_value != expected:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{label} failed: field '{field_name}' must equal {expected!r}.",
                )
        elif rule_type in {"user_in_role", "user_in_project_role"}:
            role = str(config.get("role") or config.get("value") or "").upper()
            if not role:
                return
            member = self.access.get_project_member(work_item.project_id, user.id)
            project = self.db.get(Project, work_item.project_id)
            workspace_member = (
                self.access.get_workspace_member(project.workspace_id, user.id) if project else None
            )
            project_role = member.role.value if member and hasattr(member.role, "value") else (
                str(member.role) if member else None
            )
            workspace_role = (
                workspace_member.role.value
                if workspace_member and hasattr(workspace_member.role, "value")
                else (str(workspace_member.role) if workspace_member else None)
            )
            if role not in {project_role, workspace_role}:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{label} failed: user must have role {role}.",
                )
        elif rule_type == "user_in_group":
            group_id = config.get("group_id") or config.get("value")
            if not group_id:
                return
            from app.models.enterprise import WorkspaceGroupMember

            membership = self.db.scalar(
                select(WorkspaceGroupMember).where(
                    WorkspaceGroupMember.group_id == group_id,
                    WorkspaceGroupMember.user_id == user.id,
                )
            )
            if not membership:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{label} failed: user must be in the required group.",
                )
        elif rule_type in {"issue_type_in", "type_in"}:
            allowed = config.get("types") or config.get("value") or []
            if isinstance(allowed, str):
                allowed = [part.strip() for part in allowed.split(",") if part.strip()]
            type_value = work_item.type.value if hasattr(work_item.type, "value") else str(work_item.type)
            if allowed and type_value not in allowed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{label} failed: issue type {type_value} is not allowed for this transition.",
                )
        elif rule_type in {"comment_required", "require_comment"}:
            if not (transition_comment and transition_comment.strip()):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{label} failed: a comment is required for this transition.",
                )

    def _run_transition_post_function(
        self, work_item: WorkItem, rule_type: str, config: dict, *, user: User
    ) -> None:
        if rule_type in {"clear_blocked", "clear_flag"}:
            work_item.is_blocked = False
        elif rule_type in {"set_field", "update_field"}:
            field_name = config.get("field")
            if not field_name or not hasattr(work_item, field_name):
                return
            value = config.get("value")
            if field_name == "priority" and isinstance(value, str):
                value = WorkItemPriority(value)
            if field_name == "status" and isinstance(value, str):
                return
            if field_name == "type" and isinstance(value, str):
                value = WorkItemType(value) if value in WorkItemType._value2member_map_ else value
            setattr(work_item, field_name, value)
        elif rule_type == "set_blocked":
            work_item.is_blocked = bool(config.get("value", True))
        elif rule_type in {"assign_to_role", "assign_role"}:
            role = str(config.get("role") or config.get("value") or "").upper()
            if not role:
                return
            from app.models.project import ProjectMember

            members = self.db.scalars(
                select(ProjectMember).where(ProjectMember.project_id == work_item.project_id)
            ).all()
            member = next(
                (
                    row
                    for row in members
                    if (row.role.value if hasattr(row.role, "value") else str(row.role)) == role
                ),
                None,
            )
            if member:
                work_item.owner_id = member.user_id
        elif rule_type == "add_comment":
            body = str(config.get("comment") or config.get("value") or "").strip()
            if not body:
                return
            from app.models.comment import Comment

            self.db.add(
                Comment(
                    work_item_id=work_item.id,
                    user_id=user.id,
                    comment_text=body,
                )
            )
        elif rule_type in {"create_magicboard_page", "link_magicboard_page"}:
            from app.models.project import Project
            from app.schemas.space import SpacePageCreate
            from app.services.space_service import SpaceService

            space_id = config.get("space_id")
            if not space_id:
                return
            template_key = str(config.get("template_key") or "blank")
            title = str(config.get("title") or work_item.title)
            space_service = SpaceService(self.db)
            try:
                from app.schemas.space import SpacePageFromTemplateCreate

                page = space_service.create_page_from_template(
                    uuid.UUID(str(space_id)),
                    SpacePageFromTemplateCreate(
                        template_key=template_key,
                        title=title,
                    ),
                    user,
                )
            except Exception:
                page = space_service.create_page(
                    uuid.UUID(str(space_id)),
                    SpacePageCreate(title=title, content=f"# {title}\n\nLinked from {work_item.work_item_key}."),
                    user,
                )
            space_service.link_page_to_work_item(work_item.id, page.id, user)
            project = self.db.get(Project, work_item.project_id)
            _ = project

    def _validate_blocked_state(self, stage: WorkItemStatus, is_blocked: bool) -> None:
        if is_blocked and stage == WorkItemStatus.DONE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Done work items cannot be marked blocked. Reopen the item first.",
            )

    def _allocate_work_item_number(self, project: Project) -> tuple[int, str]:
        number = project.next_work_item_number
        project.next_work_item_number += 1
        return number, f"{project.key}-{number}"

    def _apply_related_fields(self, work_item: WorkItem, payload: WorkItemCreate | WorkItemUpdate) -> None:
        if hasattr(payload, "labels") and payload.labels is not None:
            work_item.labels.clear()
            for label in payload.labels:
                work_item.labels.append(WorkItemLabel(name=label.name.strip(), color=label.color))
        if hasattr(payload, "watcher_ids") and payload.watcher_ids is not None:
            work_item.watchers.clear()
            for watcher_id in payload.watcher_ids:
                work_item.watchers.append(WorkItemWatcher(user_id=watcher_id))
        if hasattr(payload, "components") and payload.components is not None:
            work_item.components = [component.strip() for component in payload.components if component.strip()]

    def _record_changes(self, work_item: WorkItem, original_values: dict[str, object], actor_user_id: uuid.UUID) -> None:
        for field_name, old_value in original_values.items():
            new_value = getattr(work_item, field_name)
            if old_value != new_value:
                self.audit.record(
                    actor_user_id=actor_user_id,
                    action="work_item.updated",
                    entity_type=AuditEntityType.WORK_ITEM,
                    entity_id=str(work_item.id),
                    entity_label=work_item.work_item_key,
                    work_item_id=work_item.id,
                    project_id=work_item.project_id,
                    workspace_id=work_item.project.workspace_id,
                    field_name=field_name,
                    old_value=old_value,
                    new_value=new_value,
                )

    def create_work_item(self, project_id: uuid.UUID, payload: WorkItemCreate, user: User) -> WorkItem:
        context = self.access.require_project_write(project_id, user)
        project = context.project
        self._validate_project_user(project, payload.assignee_user_id)
        self._validate_project_user(project, payload.reporter_id)
        self._validate_parent(project_id, payload.parent_work_item_id)
        self._validate_epic(project_id, payload.epic_id)
        self._validate_watcher_ids(project, payload.watcher_ids)
        self._validate_work_item_type(project, payload.type)
        stage = self._normalize_stage_status(payload.status)
        self._validate_blocked_state(stage, payload.is_blocked)
        sequence_number, work_item_key = self._allocate_work_item_number(project)
        work_item = WorkItem(
            project_id=project_id,
            sequence_number=sequence_number,
            work_item_key=work_item_key,
            title=payload.title,
            description=payload.description,
            acceptance_criteria=payload.acceptance_criteria,
            type=payload.type,
            status=stage,
            is_blocked=payload.is_blocked,
            priority=payload.priority,
            owner_id=payload.assignee_user_id,
            creator_id=user.id,
            reporter_id=payload.reporter_id or user.id,
            parent_work_item_id=payload.parent_work_item_id,
            epic_id=payload.epic_id,
            rank=self._next_rank(project_id),
            sprint_name=payload.sprint_name,
            estimate_points=payload.story_points,
            original_estimate_seconds=payload.original_estimate_seconds,
            remaining_estimate_seconds=payload.remaining_estimate_seconds,
            start_date=payload.start_date,
            due_date=payload.due_date,
            completed_at=datetime.now(timezone.utc) if stage == WorkItemStatus.DONE else None,
        )
        self.db.add(work_item)
        self.db.flush()
        self._apply_related_fields(work_item, payload)
        self.db.add(
            WorkItemStatusHistory(
                work_item_id=work_item.id,
                project_id=project.id,
                from_status=None,
                to_status=stage.value,
                changed_by_user_id=user.id,
            )
        )
        self.audit.record(
            actor_user_id=user.id,
            action="work_item.created",
            entity_type=AuditEntityType.WORK_ITEM,
            entity_id=str(work_item.id),
            entity_label=work_item.work_item_key,
            work_item_id=work_item.id,
            project_id=project.id,
            workspace_id=project.workspace_id,
        )
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Could not create a unique work item key. Please retry.",
            ) from exc
        self._run_automation(project.id, "WORK_ITEM_CREATED", work_item, user)
        return self._query_work_item(work_item.id)

    def _run_automation(self, project_id: uuid.UUID, trigger_type: str, work_item: WorkItem, user: User) -> None:
        from app.models.automation import AutomationTriggerType
        from app.services.automation_service import AutomationService

        try:
            AutomationService(self.db).evaluate(project_id, AutomationTriggerType(trigger_type), work_item, user)
        except Exception:
            self.db.rollback()

    def list_work_items(
        self,
        project_id: uuid.UUID,
        user: User,
        *,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        status_filter: str | None = None,
        priority_filter: str | None = None,
        type_filter: str | None = None,
        assignee_user_id: uuid.UUID | None = None,
        reporter_id: uuid.UUID | None = None,
        label: str | None = None,
        archived: bool | None = None,
        blocked: bool | None = None,
        epic_id: uuid.UUID | None = None,
        sprint_id: uuid.UUID | None = None,
        sort_by: str = "rank",
    ) -> dict:
        self.access.require_project_read(project_id, user)
        statement = (
            select(WorkItem)
            .options(joinedload(WorkItem.owner), joinedload(WorkItem.reporter), selectinload(WorkItem.labels))
            .where(WorkItem.project_id == project_id, WorkItem.deleted_at.is_(None))
        )
        if archived is True:
            statement = statement.where(WorkItem.archived_at.is_not(None))
        elif archived is False:
            statement = statement.where(WorkItem.archived_at.is_(None))
        if search:
            like = f"%{search.lower()}%"
            statement = statement.where(
                func.lower(WorkItem.title).like(like) | func.lower(WorkItem.work_item_key).like(like)
            )
        if status_filter:
            statement = statement.where(WorkItem.status == WorkItemStatus(status_filter))
        if priority_filter:
            statement = statement.where(WorkItem.priority == WorkItemPriority(priority_filter))
        if type_filter:
            statement = statement.where(WorkItem.type == type_filter)
        if assignee_user_id:
            statement = statement.where(WorkItem.owner_id == assignee_user_id)
        if reporter_id:
            statement = statement.where(WorkItem.reporter_id == reporter_id)
        if blocked is not None:
            statement = statement.where(WorkItem.is_blocked.is_(blocked))
        if label:
            statement = statement.join(WorkItemLabel).where(func.lower(WorkItemLabel.name) == label.lower())
        if epic_id:
            statement = statement.where(WorkItem.epic_id == epic_id)
        if sprint_id:
            from app.models.sprint import SprintItem

            statement = statement.join(SprintItem, SprintItem.work_item_id == WorkItem.id).where(
                SprintItem.sprint_id == sprint_id
            )

        total = int(self.db.scalar(select(func.count()).select_from(statement.subquery())) or 0)
        sort_column = {
            "created_at": WorkItem.created_at,
            "updated_at": WorkItem.updated_at,
            "due_date": WorkItem.due_date,
            "priority": WorkItem.priority,
            "rank": WorkItem.rank,
        }.get(sort_by, WorkItem.rank)
        if sort_by == "rank":
            statement = statement.order_by(sort_column.asc(), WorkItem.sequence_number.asc())
        else:
            statement = statement.order_by(sort_column.desc(), WorkItem.sequence_number.asc())
        statement = statement.offset((page - 1) * page_size).limit(page_size)
        items = list(self.db.scalars(statement).unique().all())
        return {"items": items, "meta": {"page": page, "page_size": page_size, "total": total}}

    def get_work_item(self, work_item_id: uuid.UUID, user: User) -> WorkItem:
        work_item = self._query_work_item(work_item_id)
        self.access.require_project_read(work_item.project_id, user)
        return work_item

    def update_work_item(self, work_item_id: uuid.UUID, payload: WorkItemUpdate, user: User) -> WorkItem:
        work_item = self._query_work_item(work_item_id)
        context = self.access.require_project_write(work_item.project_id, user)
        project = context.project
        values = payload.model_dump(exclude_unset=True)
        assignee_user_id = values.pop("assignee_user_id", None) if "assignee_user_id" in values else None
        story_points = values.pop("story_points", None) if "story_points" in values else None
        archived = values.pop("archived", None) if "archived" in values else None
        transition_comment = values.pop("transition_comment", None)
        if "assignee_user_id" in payload.model_fields_set:
            self._validate_project_user(project, assignee_user_id)
            values["owner_id"] = assignee_user_id
        if "reporter_id" in values:
            self._validate_project_user(project, values["reporter_id"])
        if "parent_work_item_id" in values:
            self._validate_parent(project.id, values["parent_work_item_id"])
        if "epic_id" in values:
            self._validate_epic(project.id, values["epic_id"])
        if "watcher_ids" in values:
            self._validate_watcher_ids(project, values["watcher_ids"] or [])
        if "type" in values:
            self._validate_work_item_type(project, values["type"])
        if "story_points" in payload.model_fields_set:
            values["estimate_points"] = story_points
        if archived is not None:
            values["archived_at"] = datetime.now(timezone.utc) if archived else None
        next_status = values.get("status", work_item.status)
        previous_status = work_item.status
        if "status" in values:
            self._validate_status_transition(project.id, work_item.status, values["status"])
            values["status"] = self._normalize_stage_status(values["status"])
            next_status = values["status"]
            self._evaluate_transition_guards(
                work_item,
                previous_status,
                next_status,
                user=user,
                transition_comment=transition_comment,
            )
        next_blocked = values.get("is_blocked", work_item.is_blocked)
        if "is_blocked" in values or "status" in values:
            self._validate_blocked_state(next_status, bool(next_blocked))
        original_values = {
            field_name: getattr(work_item, field_name)
            for field_name in TRACKED_FIELDS
            if field_name in values
        }
        for key, value in values.items():
            if key in {"labels", "watcher_ids"}:
                continue
            setattr(work_item, key, value)
        if "status" in values:
            self._run_transition_post_functions(
                work_item, previous_status, work_item.status, user=user
            )
            work_item.completed_at = (
                datetime.now(timezone.utc) if work_item.status == WorkItemStatus.DONE else None
            )
            if work_item.status == WorkItemStatus.DONE:
                work_item.is_blocked = False
            if work_item.status != previous_status:
                self.db.add(
                    WorkItemStatusHistory(
                        work_item_id=work_item.id,
                        project_id=work_item.project_id,
                        from_status=previous_status.value,
                        to_status=work_item.status.value,
                        changed_by_user_id=user.id,
                    )
                )
        self._apply_related_fields(work_item, payload)
        self._record_changes(work_item, original_values, user.id)
        self.db.commit()
        if "status" in values:
            self._run_automation(work_item.project_id, "STATUS_CHANGED", work_item, user)
        else:
            self._run_automation(work_item.project_id, "WORK_ITEM_UPDATED", work_item, user)
        return self._query_work_item(work_item.id)

    def delete_work_item(self, work_item_id: uuid.UUID, user: User) -> None:
        work_item = self._query_work_item(work_item_id)
        context = self.access.require_project_write(work_item.project_id, user)
        work_item.deleted_at = datetime.now(timezone.utc)
        self.audit.record(
            actor_user_id=user.id,
            action="work_item.deleted",
            entity_type=AuditEntityType.WORK_ITEM,
            entity_id=str(work_item.id),
            entity_label=work_item.work_item_key,
            work_item_id=work_item.id,
            project_id=work_item.project_id,
            workspace_id=context.project.workspace_id,
        )
        self.db.commit()

    def update_status(self, work_item_id: uuid.UUID, payload: WorkItemStatusUpdate, user: User) -> WorkItem:
        return self.update_work_item(work_item_id, WorkItemUpdate(status=payload.status), user)

    def update_blocked(self, work_item_id: uuid.UUID, payload: WorkItemBlockedUpdate, user: User) -> WorkItem:
        return self.update_work_item(work_item_id, WorkItemUpdate(is_blocked=payload.is_blocked), user)

    def update_owner(self, work_item_id: uuid.UUID, payload: WorkItemOwnerUpdate, user: User) -> WorkItem:
        return self.update_work_item(
            work_item_id, WorkItemUpdate(assignee_user_id=payload.assignee_user_id), user
        )

    def update_priority(self, work_item_id: uuid.UUID, payload: WorkItemPriorityUpdate, user: User) -> WorkItem:
        return self.update_work_item(work_item_id, WorkItemUpdate(priority=payload.priority), user)

    def update_rank(self, work_item_id: uuid.UUID, payload: WorkItemRankUpdate, user: User) -> WorkItem:
        work_item = self._query_work_item(work_item_id)
        self.access.require_project_write(work_item.project_id, user)
        project_id = work_item.project_id

        if payload.before_id:
            anchor = self.db.get(WorkItem, payload.before_id)
            if not anchor or anchor.project_id != project_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="before_id must belong to the same project.",
                )
            prev_rank = self.db.scalar(
                select(WorkItem.rank)
                .where(
                    WorkItem.project_id == project_id,
                    WorkItem.id != work_item.id,
                    WorkItem.rank < anchor.rank,
                )
                .order_by(WorkItem.rank.desc())
                .limit(1)
            )
            new_rank = _mid_rank(prev_rank, anchor.rank)
        elif payload.after_id:
            anchor = self.db.get(WorkItem, payload.after_id)
            if not anchor or anchor.project_id != project_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="after_id must belong to the same project.",
                )
            next_rank = self.db.scalar(
                select(WorkItem.rank)
                .where(
                    WorkItem.project_id == project_id,
                    WorkItem.id != work_item.id,
                    WorkItem.rank > anchor.rank,
                )
                .order_by(WorkItem.rank.asc())
                .limit(1)
            )
            new_rank = _mid_rank(anchor.rank, next_rank)
        else:
            new_rank = self._next_rank(project_id)

        old_rank = work_item.rank
        work_item.rank = new_rank
        self.audit.record(
            actor_user_id=user.id,
            action="work_item.rank_updated",
            entity_type=AuditEntityType.WORK_ITEM,
            entity_id=str(work_item.id),
            entity_label=work_item.work_item_key,
            work_item_id=work_item.id,
            project_id=project_id,
            workspace_id=work_item.project.workspace_id,
            field_name="rank",
            old_value=old_rank,
            new_value=new_rank,
        )
        self.db.commit()
        return self._query_work_item(work_item.id)

    def get_workboard(
        self,
        project_id: uuid.UUID,
        user: User,
        *,
        search: str | None = None,
        assignee_user_id: uuid.UUID | None = None,
        priority_filter: str | None = None,
        type_filter: str | None = None,
        label: str | None = None,
        blocked: bool | None = None,
        sprint_id: uuid.UUID | None = None,
    ) -> dict:
        project = self.db.scalar(
            select(Project)
            .options(selectinload(Project.workflow_statuses))
            .where(Project.id == project_id, Project.deleted_at.is_(None))
        )
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        listing = self.list_work_items(
            project_id,
            user,
            page=1,
            page_size=500,
            search=search,
            assignee_user_id=assignee_user_id,
            priority_filter=priority_filter,
            type_filter=type_filter,
            label=label,
            blocked=blocked,
            sprint_id=sprint_id,
            archived=False,
        )
        items = listing["items"]

        def stage_key_of(item: WorkItem) -> str:
            return item.status.value if item.status != WorkItemStatus.BLOCKED else WorkItemStatus.IN_PROGRESS.value

        from app.models.board import BoardColumn

        board_columns = list(
            self.db.scalars(
                select(BoardColumn)
                .options(selectinload(BoardColumn.statuses))
                .where(BoardColumn.project_id == project_id)
                .order_by(BoardColumn.position.asc())
            ).all()
        )
        if board_columns:
            status_by_id = {row.id: row for row in project.workflow_statuses}
            columns = []
            for column in board_columns:
                mapped_statuses = [status_by_id[cs.status_id] for cs in column.statuses if cs.status_id in status_by_id]
                status_keys = {row.key for row in mapped_statuses}
                if not status_keys:
                    continue
                column_items = [item for item in items if stage_key_of(item) in status_keys]
                key = next(iter(status_keys)) if len(status_keys) == 1 else str(column.id)
                color = mapped_statuses[0].color if mapped_statuses else "#94a3b8"
                wip_warning = bool(column.wip_limit and len(column_items) > column.wip_limit)
                columns.append(
                    {
                        "key": key,
                        "title": column.name,
                        "color": color,
                        "count": len(column_items),
                        "items": column_items,
                        "wip_limit": column.wip_limit,
                        "wip_warning": wip_warning,
                    }
                )
            return {"columns": columns}

        stage_configs = [row for row in project.workflow_statuses if row.key != "BLOCKED"]
        grouped: dict[str, list[WorkItem]] = {row.key: [] for row in stage_configs}
        for item in items:
            grouped.setdefault(stage_key_of(item), []).append(item)
        columns = []
        for status_config in stage_configs:
            column_items = grouped.get(status_config.key, [])
            columns.append(
                {
                    "key": status_config.key,
                    "title": status_config.name,
                    "color": status_config.color,
                    "count": len(column_items),
                    "items": column_items,
                    "wip_limit": None,
                    "wip_warning": False,
                }
            )
        return {"columns": columns}

    def create_attachment(self, work_item_id: uuid.UUID, upload: UploadFile, user: User) -> WorkItemAttachment:
        work_item = self._query_work_item(work_item_id)
        context = self.access.require_project_write(work_item.project_id, user)
        stored_path, file_size = self.storage.save_attachment(work_item.work_item_key, upload)
        attachment = WorkItemAttachment(
            work_item_id=work_item_id,
            filename=upload.filename or "attachment",
            stored_path=stored_path,
            content_type=upload.content_type,
            file_size=file_size,
            uploaded_by_user_id=user.id,
        )
        self.db.add(attachment)
        self.db.flush()
        self.audit.record(
            actor_user_id=user.id,
            action="attachment.uploaded",
            entity_type=AuditEntityType.ATTACHMENT,
            entity_id=str(attachment.id),
            entity_label=attachment.filename,
            work_item_id=work_item.id,
            project_id=work_item.project_id,
            workspace_id=context.project.workspace_id,
        )
        self.db.commit()
        statement = (
            select(WorkItemAttachment)
            .options(joinedload(WorkItemAttachment.uploaded_by))
            .where(WorkItemAttachment.id == attachment.id)
        )
        return self.db.scalar(statement)

    def delete_attachment(self, attachment_id: uuid.UUID, user: User) -> None:
        attachment = self.db.scalar(
            select(WorkItemAttachment).where(WorkItemAttachment.id == attachment_id)
        )
        if not attachment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found.")
        work_item = self._query_work_item(attachment.work_item_id)
        context = self.access.require_project_write(work_item.project_id, user)
        self.storage.delete_attachment(attachment.stored_path)
        self.audit.record(
            actor_user_id=user.id,
            action="attachment.deleted",
            entity_type=AuditEntityType.ATTACHMENT,
            entity_id=str(attachment.id),
            entity_label=attachment.filename,
            work_item_id=work_item.id,
            project_id=work_item.project_id,
            workspace_id=context.project.workspace_id,
        )
        self.db.delete(attachment)
        self.db.commit()

    def get_attachment(self, attachment_id: uuid.UUID, user: User) -> WorkItemAttachment:
        statement = (
            select(WorkItemAttachment)
            .options(joinedload(WorkItemAttachment.uploaded_by))
            .where(WorkItemAttachment.id == attachment_id)
        )
        attachment = self.db.scalar(statement)
        if not attachment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found.")
        self.access.require_project_read(self._query_work_item(attachment.work_item_id).project_id, user)
        return attachment

    def create_link(self, work_item_id: uuid.UUID, payload: WorkItemLinkCreate, user: User) -> WorkItemLink:
        source = self._query_work_item(work_item_id)
        self.access.require_project_write(source.project_id, user)
        target = self._query_work_item(payload.target_work_item_id)
        if source.project_id != target.project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Linked work items must belong to the same project.",
            )
        existing = self.db.scalar(
            select(WorkItemLink).where(
                WorkItemLink.source_work_item_id == source.id,
                WorkItemLink.target_work_item_id == target.id,
                WorkItemLink.link_type == payload.link_type,
            )
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Link already exists.")
        link = WorkItemLink(
            source_work_item_id=source.id,
            target_work_item_id=target.id,
            link_type=payload.link_type,
            created_by_user_id=user.id,
        )
        self.db.add(link)
        self.db.flush()
        if payload.link_type == WorkItemLinkType.PARENT_OF:
            target.parent_work_item_id = source.id
        elif payload.link_type == WorkItemLinkType.CHILD_OF:
            source.parent_work_item_id = target.id
        self.audit.record(
            actor_user_id=user.id,
            action="work_item.link_created",
            entity_type=AuditEntityType.WORK_ITEM_LINK,
            entity_id=str(link.id),
            entity_label=f"{source.work_item_key}->{target.work_item_key}",
            work_item_id=source.id,
            project_id=source.project_id,
            workspace_id=source.project.workspace_id,
            field_name="link_type",
            new_value=payload.link_type,
        )
        self.db.commit()
        return link

    def bulk_update(self, ids: list[uuid.UUID], action: str, payload: dict, user: User) -> dict:
        updated: list[str] = []
        failed: list[dict] = []
        for work_item_id in ids:
            try:
                if action == "update_status":
                    self.update_work_item(
                        work_item_id, WorkItemUpdate(status=WorkItemStatus(payload["status"])), user
                    )
                elif action == "update_priority":
                    self.update_work_item(
                        work_item_id, WorkItemUpdate(priority=WorkItemPriority(payload["priority"])), user
                    )
                elif action == "update_assignee":
                    assignee = payload.get("assignee_user_id")
                    self.update_work_item(
                        work_item_id,
                        WorkItemUpdate(assignee_user_id=uuid.UUID(assignee) if assignee else None),
                        user,
                    )
                elif action == "add_label":
                    work_item = self._query_work_item(work_item_id)
                    self.access.require_project_write(work_item.project_id, user)
                    name = (payload.get("name") or "").strip()
                    if name and not any(existing.name == name for existing in work_item.labels):
                        work_item.labels.append(WorkItemLabel(name=name, color=payload.get("color")))
                        self.db.commit()
                elif action == "archive":
                    self.update_work_item(work_item_id, WorkItemUpdate(archived=True), user)
                elif action == "delete":
                    self.delete_work_item(work_item_id, user)
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported action: {action}"
                    )
                updated.append(str(work_item_id))
            except HTTPException as exc:
                failed.append({"id": str(work_item_id), "detail": exc.detail})
        return {"updated": updated, "failed": failed}

    def delete_link(self, link_id: uuid.UUID, user: User) -> None:
        link = self.db.scalar(select(WorkItemLink).where(WorkItemLink.id == link_id))
        if not link:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found.")
        source = self._query_work_item(link.source_work_item_id)
        context = self.access.require_project_write(source.project_id, user)
        self.audit.record(
            actor_user_id=user.id,
            action="work_item.link_deleted",
            entity_type=AuditEntityType.WORK_ITEM_LINK,
            entity_id=str(link.id),
            entity_label=str(link.id),
            work_item_id=source.id,
            project_id=source.project_id,
            workspace_id=context.project.workspace_id,
        )
        self.db.delete(link)
        self.db.commit()
