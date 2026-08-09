import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceInvitationAccept,
    WorkspaceInvitationCreate,
    WorkspaceInvitationRead,
    WorkspaceMemberAdd,
    WorkspaceMemberRead,
    WorkspaceMemberRoleUpdate,
    WorkspaceOverviewSummary,
    WorkspaceRead,
    WorkspaceUpdate,
)
from app.services.workspace_service import WorkspaceService

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.post("", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkspaceService(db).create_workspace(payload, current_user)


@router.get("", response_model=list[WorkspaceRead])
def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkspaceService(db).list_workspaces(current_user)


@router.get("/{workspace_id}", response_model=WorkspaceRead)
def get_workspace(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkspaceService(db).get_workspace(workspace_id, current_user)


@router.get("/{workspace_id}/overview", response_model=WorkspaceOverviewSummary)
def get_workspace_overview(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkspaceService(db).get_overview(workspace_id, current_user)


@router.put("/{workspace_id}", response_model=WorkspaceRead)
def update_workspace(
    workspace_id: uuid.UUID,
    payload: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkspaceService(db).update_workspace(workspace_id, payload, current_user)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    WorkspaceService(db).delete_workspace(workspace_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberRead])
def list_workspace_members(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkspaceService(db).list_members(workspace_id, current_user)


@router.post("/{workspace_id}/members", response_model=WorkspaceMemberRead, status_code=status.HTTP_201_CREATED)
def add_workspace_member(
    workspace_id: uuid.UUID,
    payload: WorkspaceMemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkspaceService(db).add_member(workspace_id, payload, current_user)


@router.put("/{workspace_id}/members/{user_id}/role", response_model=WorkspaceMemberRead)
def update_workspace_member_role(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: WorkspaceMemberRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkspaceService(db).update_member_role(workspace_id, user_id, payload.role, current_user)


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_workspace_member(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    WorkspaceService(db).remove_member(workspace_id, user_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{workspace_id}/invitations", response_model=list[WorkspaceInvitationRead])
def list_workspace_invitations(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkspaceService(db).list_invitations(workspace_id, current_user)


@router.post("/{workspace_id}/invitations", response_model=WorkspaceInvitationRead, status_code=status.HTTP_201_CREATED)
def create_workspace_invitation(
    workspace_id: uuid.UUID,
    payload: WorkspaceInvitationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkspaceService(db).create_invitation(workspace_id, payload, current_user)


@router.post("/{workspace_id}/invitations/{invitation_id}/resend", response_model=WorkspaceInvitationRead)
def resend_workspace_invitation(
    workspace_id: uuid.UUID,
    invitation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkspaceService(db).resend_invitation(workspace_id, invitation_id, current_user)


@router.delete("/{workspace_id}/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_workspace_invitation(
    workspace_id: uuid.UUID,
    invitation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    WorkspaceService(db).revoke_invitation(workspace_id, invitation_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/invitations/accept", response_model=WorkspaceInvitationRead)
def accept_workspace_invitation(
    payload: WorkspaceInvitationAccept,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WorkspaceService(db).accept_invitation(payload.token, current_user)
