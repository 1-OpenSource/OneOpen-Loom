"""Rewrite SpacePage.content from legacy markdown/macros to TipTap HTML.

Usage:
  python -m app.scripts.migrate_page_content
  python -m app.scripts.migrate_page_content --dry-run
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone

from app.db.database import Base
from app.db.session import SessionLocal, engine
from app.models.space import SpacePage
from app.services.content_migrate import legacy_markdown_to_html, looks_like_html


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate Magicboard page content to HTML")
    parser.add_argument("--dry-run", action="store_true", help="Report counts without writing")
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        pages = db.query(SpacePage).all()
        scanned = len(pages)
        skipped = 0
        migrated = 0
        for page in pages:
            content = page.content or ""
            if looks_like_html(content):
                skipped += 1
                continue
            html = legacy_markdown_to_html(content)
            migrated += 1
            if args.dry_run:
                continue
            page.content = html
            page.updated_at = datetime.now(timezone.utc)

        if not args.dry_run and migrated:
            db.commit()

        mode = "dry-run" if args.dry_run else "applied"
        print(f"[{mode}] scanned={scanned} migrated={migrated} skipped_html={skipped}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
