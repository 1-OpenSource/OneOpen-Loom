import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.work_item import WorkItemLinkType, WorkItemPriority, WorkItemStatus, WorkItemType
from app.schemas.user import UserSummary


class WorkItemLabelInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: str | None = Field(default=None, max_length=20)


class WorkItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    description: str | None = None
    acceptance_criteria: str | None = None
    type: WorkItemType = WorkItemType.TASK
    status: WorkItemStatus = WorkItemStatus.TODO
    is_blocked: bool = False
    priority: WorkItemPriority = WorkItemPriority.MEDIUM
    assignee_user_id: uuid.UUID | None = None
    reporter_id: uuid.UUID | None = None
    parent_work_item_id: uuid.UUID | None = None
    epic_id: uuid.UUID | None = None
    sprint_name: str | None = Field(default=None, max_length=80)
    story_points: int | None = Field(default=None, ge=0)
    original_estimate_seconds: int | None = Field(default=None, ge=0)
    remaining_estimate_seconds: int | None = Field(default=None, ge=0)
    start_date: date | None = None
    due_date: date | None = None
    labels: list[WorkItemLabelInput] = Field(default_factory=list)
    components: list[str] = Field(default_factory=list)
    watcher_ids: list[uuid.UUID] = Field(default_factory=list)


class WorkItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=240)
    description: str | None = None
    acceptance_criteria: str | None = None
    type: WorkItemType | None = None
    status: WorkItemStatus | None = None
    is_blocked: bool | None = None
    priority: WorkItemPriority | None = None
    assignee_user_id: uuid.UUID | None = None
    reporter_id: uuid.UUID | None = None
    parent_work_item_id: uuid.UUID | None = None
    epic_id: uuid.UUID | None = None
    sprint_name: str | None = Field(default=None, max_length=80)
    story_points: int | None = Field(default=None, ge=0)
    original_estimate_seconds: int | None = Field(default=None, ge=0)
    remaining_estimate_seconds: int | None = Field(default=None, ge=0)
    start_date: date | None = None
    due_date: date | None = None
    archived: bool | None = None
    labels: list[WorkItemLabelInput] | None = None
    components: list[str] | None = None
    watcher_ids: list[uuid.UUID] | None = None
    transition_comment: str | None = Field(default=None, max_length=5000)


class WorkItemStatusUpdate(BaseModel):
    status: WorkItemStatus


class WorkItemBlockedUpdate(BaseModel):
    is_blocked: bool


class WorkItemOwnerUpdate(BaseModel):
    assignee_user_id: uuid.UUID | None = None


class WorkItemPriorityUpdate(BaseModel):
    priority: WorkItemPriority


class WorkItemRankUpdate(BaseModel):
    before_id: uuid.UUID | None = None
    after_id: uuid.UUID | None = None


class WorkItemLabelRead(BaseModel):
    id: uuid.UUID
    name: str
    color: str | None

    model_config = ConfigDict(from_attributes=True)


class WorkItemWatcherRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user: UserSummary

    model_config = ConfigDict(from_attributes=True)


class WorkItemAttachmentRead(BaseModel):
    id: uuid.UUID
    filename: str
    content_type: str | None
    file_size: int
    uploaded_by_user_id: uuid.UUID
    created_at: datetime
    uploaded_by: UserSummary

    model_config = ConfigDict(from_attributes=True)


class WorkItemLinkCreate(BaseModel):
    target_work_item_id: uuid.UUID
    link_type: WorkItemLinkType


class WorkItemSummary(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    work_item_key: str
    title: str
    description: str | None
    type: WorkItemType
    status: WorkItemStatus
    is_blocked: bool = False
    priority: WorkItemPriority
    assignee_user_id: uuid.UUID | None
    reporter_id: uuid.UUID | None
    creator_id: uuid.UUID
    parent_work_item_id: uuid.UUID | None
    epic_id: uuid.UUID | None = None
    rank: str = ""
    story_points: int | None
    start_date: date | None
    due_date: date | None
    completed_at: datetime | None
    archived_at: datetime | None
    components: list[str]
    created_at: datetime
    updated_at: datetime
    assignee: UserSummary | None = Field(default=None, alias="owner")
    reporter: UserSummary | None = None
    creator: UserSummary | None = None
    labels: list[WorkItemLabelRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class WorkItemLinkRead(BaseModel):
    id: uuid.UUID
    source_work_item_id: uuid.UUID
    target_work_item_id: uuid.UUID
    link_type: WorkItemLinkType
    created_by_user_id: uuid.UUID
    created_at: datetime
    source_work_item: WorkItemSummary | None = None
    target_work_item: WorkItemSummary | None = None

    model_config = ConfigDict(from_attributes=True)


class WorkItemRead(WorkItemSummary):
    acceptance_criteria: str | None
    sprint_name: str | None
    original_estimate_seconds: int | None = None
    remaining_estimate_seconds: int | None = None
    watchers: list[WorkItemWatcherRead] = Field(default_factory=list)
    attachments: list[WorkItemAttachmentRead] = Field(default_factory=list)
    outgoing_links: list[WorkItemLinkRead] = Field(default_factory=list)
    incoming_links: list[WorkItemLinkRead] = Field(default_factory=list)
    subtasks: list[WorkItemSummary] = Field(default_factory=list)
    parent_work_item: WorkItemSummary | None = None


class WorkboardColumnRead(BaseModel):
    key: str
    title: str
    color: str
    count: int
    items: list[WorkItemSummary]
    wip_limit: int | None = None
    wip_warning: bool = False


class WorkboardRead(BaseModel):
    columns: list[WorkboardColumnRead]


class WorkItemSearchResult(BaseModel):
    id: uuid.UUID
    work_item_key: str
    title: str
    status: WorkItemStatus


class WorkItemListQuery(BaseModel):
    search: str | None = None
