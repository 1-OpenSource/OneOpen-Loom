import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.search import SearchResultRead
from app.services.search_service import SearchService

router = APIRouter(tags=["search"])


@router.get("/search", response_model=SearchResultRead)
def search(
    workspace_id: uuid.UUID = Query(...),
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {
        "query": q,
        "results": SearchService(db).search_workspace(workspace_id, q, current_user),
    }
