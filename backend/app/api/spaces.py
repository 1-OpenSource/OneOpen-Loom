import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.space import (
    MagicboardSearchResult,
    MagicboardTemplateRead,
    MarkdownPageExport,
    PageWorkItemSummary,
    SpaceCreate,
    SpaceExportRead,
    SpaceImportRequest,
    SpaceMemberRead,
    SpaceMembersUpdate,
    SpacePageAttachmentRead,
    SpacePageCommentCreate,
    SpacePageCommentRead,
    SpacePageCreate,
    SpacePageFavoriteRead,
    SpacePageFromTemplateCreate,
    SpacePagePathResolve,
    SpacePageRead,
    SpacePageRecentRead,
    SpacePageShareLinkRead,
    SpacePageTreeNode,
    SpacePageUpdate,
    SpacePageVersionRead,
    SpaceRead,
    SpaceUpdate,
    WorkItemPageLink,
)
from app.services.space_service import SpaceService

router = APIRouter(tags=["spaces"])


@router.post("/workspaces/{workspace_id}/spaces", response_model=SpaceRead, status_code=status.HTTP_201_CREATED)
def create_space(
    workspace_id: uuid.UUID,
    payload: SpaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).create_space(workspace_id, payload, current_user)


@router.get("/workspaces/{workspace_id}/spaces", response_model=list[SpaceRead])
def list_spaces(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).list_spaces(workspace_id, current_user)


@router.get("/spaces/{space_id}", response_model=SpaceRead)
def get_space(
    space_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).get_space(space_id, current_user)


@router.put("/spaces/{space_id}", response_model=SpaceRead)
def update_space(
    space_id: uuid.UUID,
    payload: SpaceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).update_space(space_id, payload, current_user)


@router.delete("/spaces/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_space(
    space_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).delete_space(space_id, current_user)


@router.post("/spaces/{space_id}/archive", response_model=SpaceRead)
def archive_space(
    space_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).archive_space(space_id, current_user)


@router.get("/spaces/{space_id}/members", response_model=list[SpaceMemberRead])
def list_space_members(
    space_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).list_space_members(space_id, current_user)


@router.put("/spaces/{space_id}/members", response_model=list[SpaceMemberRead])
def set_space_members(
    space_id: uuid.UUID,
    payload: SpaceMembersUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).set_space_members(space_id, payload.members, current_user)


@router.post("/spaces/{space_id}/watch", status_code=status.HTTP_204_NO_CONTENT)
def watch_space(
    space_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).watch_space(space_id, current_user)


@router.delete("/spaces/{space_id}/watch", status_code=status.HTTP_204_NO_CONTENT)
def unwatch_space(
    space_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).unwatch_space(space_id, current_user)


@router.get("/spaces/{space_id}/export", response_model=SpaceExportRead)
def export_space(
    space_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = SpaceService(db)
    space = service.get_space(space_id, current_user)
    pages = service.export_space_markdown(space_id, current_user)
    return SpaceExportRead(
        space_key=space.key,
        space_name=space.name,
        pages=[MarkdownPageExport(**page) for page in pages],
    )


@router.post("/spaces/{space_id}/import", response_model=list[SpacePageRead])
def import_space_pages(
    space_id: uuid.UUID,
    payload: SpaceImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).import_markdown_pages(space_id, payload.pages, current_user)


@router.post("/spaces/{space_id}/pages", response_model=SpacePageRead, status_code=status.HTTP_201_CREATED)
def create_page(
    space_id: uuid.UUID,
    payload: SpacePageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).create_page(space_id, payload, current_user)


@router.post(
    "/spaces/{space_id}/pages/from-template",
    response_model=SpacePageRead,
    status_code=status.HTTP_201_CREATED,
)
def create_page_from_template(
    space_id: uuid.UUID,
    payload: SpacePageFromTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).create_page_from_template(space_id, payload, current_user)


@router.get("/spaces/{space_id}/pages", response_model=list[SpacePageRead])
def list_pages_flat(
    space_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).list_pages_flat(space_id, current_user)


@router.get("/spaces/{space_id}/pages/tree", response_model=list[SpacePageTreeNode])
def get_page_tree(
    space_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).list_page_tree(space_id, current_user)


@router.get("/pages/{page_id}", response_model=SpacePageRead)
def get_page(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).get_page(page_id, current_user)


@router.put("/pages/{page_id}", response_model=SpacePageRead)
def update_page(
    page_id: uuid.UUID,
    payload: SpacePageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).update_page(page_id, payload, current_user)


@router.delete("/pages/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_page(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).delete_page(page_id, current_user)


@router.post("/pages/{page_id}/archive", response_model=SpacePageRead)
def archive_page(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).archive_page(page_id, current_user)


@router.post("/pages/{page_id}/restore/{version_id}", response_model=SpacePageRead)
def restore_page_version(
    page_id: uuid.UUID,
    version_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).restore_version(page_id, version_id, current_user)


@router.get("/pages/{page_id}/versions", response_model=list[SpacePageVersionRead])
def list_page_versions(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).list_versions(page_id, current_user)


@router.get("/pages/{page_id}/work-items", response_model=list[PageWorkItemSummary])
def list_work_items_for_page(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = SpaceService(db).list_work_items_for_page(page_id, current_user)
    return [
        PageWorkItemSummary(
            id=item.id,
            work_item_key=item.work_item_key,
            title=item.title,
            status=item.status.value,
            type=item.type.value,
            project_id=item.project_id,
        )
        for item in items
    ]


@router.post("/pages/{page_id}/comments", response_model=SpacePageCommentRead, status_code=status.HTTP_201_CREATED)
def add_page_comment(
    page_id: uuid.UUID,
    payload: SpacePageCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).add_comment(page_id, payload.body, current_user)


@router.get("/pages/{page_id}/comments", response_model=list[SpacePageCommentRead])
def list_page_comments(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).list_comments(page_id, current_user)


@router.delete("/page-comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_page_comment(
    comment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).delete_comment(comment_id, current_user)


@router.post("/pages/{page_id}/watch", status_code=status.HTTP_204_NO_CONTENT)
def watch_page(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).watch_page(page_id, current_user)


@router.delete("/pages/{page_id}/watch", status_code=status.HTTP_204_NO_CONTENT)
def unwatch_page(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).unwatch_page(page_id, current_user)


@router.post("/pages/{page_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
def favorite_page(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).favorite_page(page_id, current_user)


@router.delete("/pages/{page_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
def unfavorite_page(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).unfavorite_page(page_id, current_user)


@router.post("/pages/{page_id}/view", status_code=status.HTTP_204_NO_CONTENT)
def record_page_view(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).record_recent_view(page_id, current_user)


@router.post("/work-items/{work_item_id}/pages", status_code=status.HTTP_204_NO_CONTENT)
def link_page_to_work_item(
    work_item_id: uuid.UUID,
    payload: WorkItemPageLink,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).link_page_to_work_item(work_item_id, payload.page_id, current_user)


@router.delete("/work-items/{work_item_id}/pages/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_page_from_work_item(
    work_item_id: uuid.UUID,
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).unlink_page_from_work_item(work_item_id, page_id, current_user)


@router.get("/work-items/{work_item_id}/pages", response_model=list[SpacePageRead])
def list_pages_for_work_item(
    work_item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).list_pages_for_work_item(work_item_id, current_user)


@router.get("/workspaces/{workspace_id}/magicboard/search", response_model=list[MagicboardSearchResult])
def search_magicboard_pages(
    workspace_id: uuid.UUID,
    q: str = Query(min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).search_pages(workspace_id, q, current_user)


@router.get("/magicboard/templates", response_model=list[MagicboardTemplateRead])
def list_magicboard_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ = current_user
    return SpaceService(db).list_templates()


@router.get("/workspaces/{workspace_id}/magicboard/favorites", response_model=list[SpacePageFavoriteRead])
def list_magicboard_favorites(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).list_favorites(workspace_id, current_user)


@router.get("/workspaces/{workspace_id}/magicboard/recent", response_model=list[SpacePageRecentRead])
def list_magicboard_recent(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).list_recent(workspace_id, current_user)


@router.get("/workspaces/{workspace_id}/work-items/by-key/{key}", response_model=PageWorkItemSummary)
def get_work_item_by_key(
    workspace_id: uuid.UUID,
    key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = SpaceService(db).get_work_item_summary_by_key(workspace_id, key, current_user)
    return PageWorkItemSummary(
        id=item.id,
        work_item_key=item.work_item_key,
        title=item.title,
        status=item.status.value,
        type=item.type.value,
        project_id=item.project_id,
    )


@router.get("/workspaces/{workspace_id}/work-items/search")
def search_work_items_for_connector(
    workspace_id: uuid.UUID,
    q: str = Query(default="", min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Used by standalone Magicboard suite-search when WORKBOARD_API_URL is set."""
    return SpaceService(db).suite_search(workspace_id, q, current_user).get("work_items", [])


@router.get("/pages/{page_id}/attachments", response_model=list[SpacePageAttachmentRead])
def list_page_attachments(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).list_page_attachments(page_id, current_user)


@router.post(
    "/pages/{page_id}/attachments",
    response_model=SpacePageAttachmentRead,
    status_code=status.HTTP_201_CREATED,
)
def upload_page_attachment(
    page_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).upload_page_attachment(page_id, file, current_user)


@router.delete("/page-attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_page_attachment(
    attachment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).delete_page_attachment(attachment_id, current_user)


@router.get("/workspaces/{workspace_id}/suite-search")
def suite_search(
    workspace_id: uuid.UUID,
    q: str = Query(default="", min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).suite_search(workspace_id, q, current_user)


@router.get(
    "/workspaces/{workspace_id}/magicboard/resolve",
    response_model=SpacePagePathResolve,
)
def resolve_magicboard_path(
    workspace_id: uuid.UUID,
    space_key: str = Query(min_length=1),
    page_slug: str = Query(min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).resolve_page_path(workspace_id, space_key, page_slug, current_user)


@router.post(
    "/pages/{page_id}/share-links",
    response_model=SpacePageShareLinkRead,
    status_code=status.HTTP_201_CREATED,
)
def create_page_share_link(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = SpaceService(db)
    link = service.create_share_link(page_id, current_user)
    return SpacePageShareLinkRead(**service.share_link_read(link))


@router.get("/pages/{page_id}/share-links", response_model=list[SpacePageShareLinkRead])
def list_page_share_links(
    page_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = SpaceService(db)
    return [SpacePageShareLinkRead(**service.share_link_read(link)) for link in service.list_share_links(page_id, current_user)]


@router.delete("/share-links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_page_share_link(
    link_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    SpaceService(db).revoke_share_link(link_id, current_user)


@router.get("/magicboard/share/{token}", response_model=SpacePagePathResolve)
def resolve_magicboard_share_link(
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SpaceService(db).resolve_share_link(token, current_user)
