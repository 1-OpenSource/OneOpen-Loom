from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.project import Project
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceRole
from app.schemas.comment import CommentCreate
from app.schemas.project import ProjectCreate
from app.schemas.workspace import WorkspaceCreate, WorkspaceInvitationCreate, WorkspaceMemberAdd
from app.schemas.work_item import WorkItemCreate, WorkItemUpdate
from app.services.comment_service import CommentService
from app.services.project_service import ProjectService
from app.services.workspace_service import WorkspaceService
from app.services.work_item_service import WorkItemService


def get_or_create_user(session, *, name: str, email: str) -> User:
    existing = session.scalar(select(User).where(User.email == email))
    if existing:
        return existing
    user = User(name=name, email=email, password_hash=hash_password("password123"), is_active=True)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def get_or_create_workspace(
    workspace_service: WorkspaceService,
    session,
    payload: WorkspaceCreate,
    actor: User,
) -> Workspace:
    existing = session.scalar(
        select(Workspace).where(Workspace.slug == payload.slug, Workspace.deleted_at.is_(None))
    )
    if existing:
        return existing
    return workspace_service.create_workspace(payload, actor)


def get_or_create_project(
    project_service: ProjectService,
    session,
    workspace_id,
    payload: ProjectCreate,
    actor: User,
) -> Project:
    existing = session.scalar(
        select(Project).where(
            Project.workspace_id == workspace_id,
            Project.key == payload.key.upper(),
            Project.deleted_at.is_(None),
        )
    )
    if existing:
        return existing
    return project_service.create_project(workspace_id, payload, actor)


def main() -> None:
    session = SessionLocal()
    try:
        users = {
            "akhil": get_or_create_user(session, name="Akhil Tiwari", email="akhil@oneopen.dev"),
            "maria": get_or_create_user(session, name="Maria Chen", email="maria@oneopen.dev"),
            "sam": get_or_create_user(session, name="Samir Patel", email="samir@oneopen.dev"),
            "ivy": get_or_create_user(session, name="Ivy Brooks", email="ivy@oneopen.dev"),
        }

        workspace_service = WorkspaceService(session)
        project_service = ProjectService(session)
        work_item_service = WorkItemService(session)
        comment_service = CommentService(session)

        foundation = get_or_create_workspace(
            workspace_service,
            session,
            WorkspaceCreate(
                name="OneOpen Foundation",
                slug="oneopen-foundation",
                description="Shared delivery workspace for platform, docs, and release operations.",
            ),
            users["akhil"],
        )
        maintainers = get_or_create_workspace(
            workspace_service,
            session,
            WorkspaceCreate(
                name="Maintainer Guild",
                slug="maintainer-guild",
                description="Operational workspace for maintainers and contributor programs.",
            ),
            users["maria"],
        )

        for target_user, role in (
            (users["maria"], WorkspaceRole.ADMIN),
            (users["sam"], WorkspaceRole.MEMBER),
            (users["ivy"], WorkspaceRole.VIEWER),
        ):
            try:
                workspace_service.add_member(
                    foundation.id,
                    WorkspaceMemberAdd(user_id=target_user.id, role=role),
                    users["akhil"],
                )
            except Exception:
                session.rollback()

        for target_user, role in (
            (users["akhil"], WorkspaceRole.ADMIN),
            (users["sam"], WorkspaceRole.MEMBER),
        ):
            try:
                workspace_service.add_member(
                    maintainers.id,
                    WorkspaceMemberAdd(user_id=target_user.id, role=role),
                    users["maria"],
                )
            except Exception:
                session.rollback()

        try:
            workspace_service.create_invitation(
                foundation.id,
                WorkspaceInvitationCreate(email="new.contributor@example.com", role=WorkspaceRole.MEMBER),
                users["akhil"],
            )
        except Exception:
            session.rollback()

        projects = [
            get_or_create_project(
                project_service,
                session,
                foundation.id,
                ProjectCreate(name="Platform Core", key="OWB", description="Core product experience"),
                users["akhil"],
            ),
            get_or_create_project(
                project_service,
                session,
                foundation.id,
                ProjectCreate(name="Docs and Onboarding", key="DOC", description="Contributor docs and guides"),
                users["maria"],
            ),
            get_or_create_project(
                project_service,
                session,
                maintainers.id,
                ProjectCreate(name="Release Operations", key="REL", description="Release cadence and triage"),
                users["maria"],
            ),
        ]

        backlog = [
            ("Design workspace summary cards", "STORY", "HIGH", "TODO", False),
            ("Fix board drag state rollback", "BUG", "CRITICAL", "IN_PROGRESS", False),
            ("Document invite acceptance flow", "TASK", "MEDIUM", "IN_REVIEW", False),
            ("Add search keyboard navigation", "IMPROVEMENT", "HIGH", "TODO", False),
            ("Model audit entity metadata", "SPIKE", "MEDIUM", "DONE", False),
            ("Research attachment retention strategy", "RESEARCH", "LOW", "IN_PROGRESS", True),
            ("Add watcher notifications placeholder", "FEATURE_REQUEST", "LOW", "TODO", False),
            ("Polish project members view", "TASK", "MEDIUM", "IN_PROGRESS", True),
            ("Improve markdown editing affordances", "STORY", "MEDIUM", "DONE", False),
            ("Unblock release checklist review", "TASK", "HIGH", "IN_REVIEW", True),
        ]

        created_items = []
        for index in range(25):
            project = projects[index % len(projects)]
            title, item_type, priority, status, is_blocked = backlog[index % len(backlog)]
            actor = users["akhil"] if project.workspace_id == foundation.id else users["maria"]
            assignee = users["akhil"] if project.workspace_id == foundation.id and index % 2 == 0 else users["maria"]
            watcher_ids = list(dict.fromkeys([actor.id, users["maria"].id]))
            created = work_item_service.create_work_item(
                project.id,
                WorkItemCreate(
                    title=f"{title} #{index + 1}",
                    description="Seeded development work item for local demos.",
                    type=item_type,
                    priority=priority,
                    status=status,
                    is_blocked=is_blocked,
                    assignee_user_id=assignee.id,
                    reporter_id=users["sam"].id if project.workspace_id == foundation.id and index % 3 == 0 else actor.id,
                    story_points=(index % 8) + 1,
                    due_date=date.today() + timedelta(days=index + 2),
                    labels=[{"name": "seed"}, {"name": project.key.lower()}],
                    components=["backend" if index % 2 == 0 else "frontend"],
                    watcher_ids=watcher_ids,
                ),
                actor,
            )
            created_items.append(created)

        for item in created_items[:8]:
            comment_service.create_comment(item.id, CommentCreate(comment_text="Seed comment for discussion context."), users["maria"])

        for item in created_items[:6]:
            work_item_service.update_work_item(
                item.id,
                WorkItemUpdate(acceptance_criteria="- complete implementation\n- verify tests\n- update docs"),
                users["akhil"],
            )

        print("Seed data created:")
        print(f"- Workspaces: 2")
        print(f"- Projects: {len(projects)}")
        print(f"- Work items: {len(created_items)}")
        print(f"- Demo users: {len(users)}")
    finally:
        session.close()


if __name__ == "__main__":
    main()
