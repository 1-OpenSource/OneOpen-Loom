import uuid

from pydantic import BaseModel


class SearchResultItem(BaseModel):
    entity_type: str
    identifier: str
    title: str
    context: str | None
    status: str | None
    href: str
    entity_id: uuid.UUID


class SearchResultRead(BaseModel):
    query: str
    results: list[SearchResultItem]
