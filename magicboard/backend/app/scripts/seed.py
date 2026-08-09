"""Seed a demo Magicboard user, workspace, and space."""

from app.core.security import hash_password
from app.db.database import Base
from app.db.session import SessionLocal, engine
from app.models.space import SpacePageStatus
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, WorkspaceRole
from app.schemas.space import SpaceCreate, SpacePageCreate
from app.services.space_service import SpaceService


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "akhil@oneopen.dev").first()
        if not user:
            user = User(
                name="Akhil Tiwari",
                email="akhil@oneopen.dev",
                password_hash=hash_password("password123"),
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        workspace = db.query(Workspace).filter(Workspace.slug == "demo").first()
        if not workspace:
            workspace = Workspace(
                name="Demo Workspace",
                slug="demo",
                description="Magicboard standalone demo",
                created_by=user.id,
                accent_color="#0f766e",
                brand_name="OneOpen Magicboard",
                brand_tagline="Team knowledge",
            )
            db.add(workspace)
            db.commit()
            db.refresh(workspace)
            db.add(
                WorkspaceMember(
                    workspace_id=workspace.id,
                    user_id=user.id,
                    role=WorkspaceRole.OWNER,
                )
            )
            db.commit()
        else:
            changed = False
            if workspace.accent_color in (None, "", "#e86a17"):
                workspace.accent_color = "#0f766e"
                changed = True
            if not workspace.brand_name:
                workspace.brand_name = "OneOpen Magicboard"
                changed = True
            if not workspace.brand_tagline:
                workspace.brand_tagline = "Team knowledge"
                changed = True
            if changed:
                db.commit()

        service = SpaceService(db)
        spaces = service.list_spaces(workspace.id, user)
        if not spaces:
            space = service.create_space(
                workspace.id,
                SpaceCreate(name="Engineering Docs", key="DOCS", description="Starter space"),
                user,
            )
            service.create_page(
                space.id,
                SpacePageCreate(
                    title="Welcome",
                    slug="welcome",
                    content="# Welcome to Magicboard\n\nStandalone knowledge for your team.\n",
                    status=SpacePageStatus.PUBLISHED,
                ),
                user,
            )
        print("Seed complete:")
        print("- User: akhil@oneopen.dev / password123")
        print("- Workspace slug: demo")
        print("- Space key: DOCS")
    finally:
        db.close()


if __name__ == "__main__":
    main()
