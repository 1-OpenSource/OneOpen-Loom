import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.project import ProductType, ProjectRole, ProjectVisibility
from app.schemas.user import UserSummary


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    key: str = Field(min_length=2, max_length=10, pattern=r"^[A-Za-z][A-Za-z0-9]*$")
    description: str | None = Field(default=None, max_length=5000)
    icon: str | None = Field(default=None, max_length=80)
    color: str | None = Field(default=None, max_length=20)
    visibility: ProjectVisibility = ProjectVisibility.PUBLIC
    lead_user_id: uuid.UUID | None = None
    product_type: ProductType = ProductType.SOFTWARE
    default_workflow: str | None = Field(default="default", max_length=80)
    available_work_item_types: list[str] | None = None
    issue_type_scheme_id: uuid.UUID | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=180)
    key: str | None = Field(default=None, min_length=2, max_length=10, pattern=r"^[A-Za-z][A-Za-z0-9]*$")
    description: str | None = Field(default=None, max_length=5000)
    icon: str | None = Field(default=None, max_length=80)
    color: str | None = Field(default=None, max_length=20)
    visibility: ProjectVisibility | None = None
    lead_user_id: uuid.UUID | None = None
    product_type: ProductType | None = None
    default_workflow: str | None = Field(default=None, max_length=80)
    available_work_item_types: list[str] | None = None
    issue_type_scheme_id: uuid.UUID | None = None


class ProjectArchiveUpdate(BaseModel):
    archived: bool


class ProjectMemberAdd(BaseModel):
    user_id: uuid.UUID
    role: ProjectRole


class ProjectMemberRoleUpdate(BaseModel):
    role: ProjectRole


class ProjectMemberRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    role: ProjectRole
    created_at: datetime
    updated_at: datetime
    user: UserSummary

    model_config = ConfigDict(from_attributes=True)


class WorkflowStatusRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    key: str
    color: str
    category: str = "in_progress"
    position: int
    is_default: bool

    model_config = ConfigDict(from_attributes=True)


class ProjectRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    key: str
    description: str | None
    icon: str | None
    color: str | None
    visibility: ProjectVisibility
    lead_user_id: uuid.UUID | None
    product_type: ProductType = ProductType.SOFTWARE
    default_workflow: str | None
    available_work_item_types: list[str]
    issue_type_scheme_id: uuid.UUID | None = None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime
    lead: UserSummary | None = None

    model_config = ConfigDict(from_attributes=True)


class ProjectOverviewRead(BaseModel):
    project: ProjectRead
    total_work_items: int
    member_count: int
    status_breakdown: dict[str, int]
    priority_breakdown: dict[str, int]
    recent_work_item_ids: list[uuid.UUID]
    workflow_statuses: list[WorkflowStatusRead]
