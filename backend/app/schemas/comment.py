import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserSummary


class CommentCreate(BaseModel):
    comment_text: str = Field(min_length=1)


class CommentUpdate(BaseModel):
    comment_text: str = Field(min_length=1)


class CommentRead(BaseModel):
    id: uuid.UUID
    work_item_id: uuid.UUID
    user_id: uuid.UUID
    comment_text: str
    created_at: datetime
    updated_at: datetime
    user: UserSummary

    model_config = ConfigDict(from_attributes=True)
