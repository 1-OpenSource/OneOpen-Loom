import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserSummary(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    avatar_url: str | None

    model_config = ConfigDict(from_attributes=True)


class UserRead(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    avatar_url: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
