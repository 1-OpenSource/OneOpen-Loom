from __future__ import annotations

import logging
import smtplib
import uuid
from email.message import EmailMessage

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.admin import WorkspaceSmtpSettings

logger = logging.getLogger(__name__)


class MailService:
    """Send mail via workspace SMTP when enabled, otherwise env mailer settings."""

    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()

    def _workspace_smtp(self, workspace_id: uuid.UUID) -> WorkspaceSmtpSettings | None:
        return self.db.scalar(
            select(WorkspaceSmtpSettings).where(WorkspaceSmtpSettings.workspace_id == workspace_id)
        )

    def resolve_transport(self, workspace_id: uuid.UUID | None = None) -> dict:
        if workspace_id is not None:
            smtp = self._workspace_smtp(workspace_id)
            if smtp and smtp.enabled and smtp.host:
                return {
                    "source": "workspace",
                    "host": smtp.host,
                    "port": smtp.port,
                    "username": smtp.username,
                    "password": smtp.password,
                    "use_tls": smtp.use_tls,
                    "from_email": smtp.from_email or self.settings.mail_from,
                    "from_name": smtp.from_name or self.settings.mail_from_name,
                }
        if self.settings.mail_host:
            return {
                "source": "env",
                "host": self.settings.mail_host,
                "port": self.settings.mail_port,
                "username": self.settings.mail_username,
                "password": self.settings.mail_password,
                "use_tls": self.settings.mail_use_tls,
                "from_email": self.settings.mail_from,
                "from_name": self.settings.mail_from_name,
            }
        return {"source": "none"}

    def send_email(
        self,
        *,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: str | None = None,
        workspace_id: uuid.UUID | None = None,
    ) -> dict:
        transport = self.resolve_transport(workspace_id)
        if transport.get("source") == "none":
            logger.info(
                "Mail skipped (no SMTP configured). to=%s subject=%s",
                to_email,
                subject,
            )
            return {"sent": False, "reason": "No SMTP configured.", "source": "none"}

        message = EmailMessage()
        from_email = transport.get("from_email") or "noreply@localhost"
        from_name = transport.get("from_name") or "OneOpen Workboard"
        message["From"] = f"{from_name} <{from_email}>"
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(body_text or "")
        if body_html:
            message.add_alternative(body_html, subtype="html")

        try:
            with smtplib.SMTP(transport["host"], int(transport["port"]), timeout=15) as server:
                if transport.get("use_tls"):
                    server.starttls()
                username = transport.get("username")
                password = transport.get("password")
                if username and password:
                    server.login(username, password)
                server.send_message(message)
            return {"sent": True, "source": transport["source"]}
        except Exception as exc:  # noqa: BLE001 - surface transport errors to callers
            logger.exception("Failed to send email to %s", to_email)
            return {"sent": False, "reason": str(exc), "source": transport["source"]}
