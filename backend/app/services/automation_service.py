import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.automation import AutomationRule, AutomationRun, AutomationTriggerType
from app.models.user import User
from app.models.work_item import WorkItem, WorkItemPriority
from app.schemas.automation import AutomationRuleCreate, AutomationRuleUpdate
from app.services.access_service import AccessService


class AutomationService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def create_rule(self, project_id: uuid.UUID, payload: AutomationRuleCreate, user: User) -> AutomationRule:
        self.access.require_project_write(project_id, user)
        rule = AutomationRule(
            project_id=project_id,
            name=payload.name,
            trigger_type=payload.trigger_type,
            conditions=payload.conditions,
            actions=payload.actions,
            is_enabled=payload.is_enabled,
            created_by_user_id=user.id,
        )
        self.db.add(rule)
        self.db.commit()
        return rule

    def list_rules(self, project_id: uuid.UUID, user: User) -> list[AutomationRule]:
        self.access.require_project_read(project_id, user)
        return list(self.db.scalars(select(AutomationRule).where(AutomationRule.project_id == project_id)).all())

    def update_rule(self, rule_id: uuid.UUID, payload: AutomationRuleUpdate, user: User) -> AutomationRule:
        rule = self.db.get(AutomationRule, rule_id)
        if not rule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation rule not found.")
        self.access.require_project_write(rule.project_id, user)
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            setattr(rule, key, value)
        self.db.commit()
        return rule

    def delete_rule(self, rule_id: uuid.UUID, user: User) -> None:
        rule = self.db.get(AutomationRule, rule_id)
        if not rule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation rule not found.")
        self.access.require_project_write(rule.project_id, user)
        self.db.delete(rule)
        self.db.commit()

    def list_runs(self, rule_id: uuid.UUID, user: User) -> list[AutomationRun]:
        rule = self.db.get(AutomationRule, rule_id)
        if not rule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation rule not found.")
        self.access.require_project_read(rule.project_id, user)
        return list(
            self.db.scalars(
                select(AutomationRun).where(AutomationRun.rule_id == rule_id).order_by(AutomationRun.ran_at.desc())
            ).all()
        )

    def evaluate(
        self,
        project_id: uuid.UUID,
        trigger_type: AutomationTriggerType,
        work_item: WorkItem | None,
        user: User,
    ) -> None:
        rules = list(
            self.db.scalars(
                select(AutomationRule).where(
                    AutomationRule.project_id == project_id,
                    AutomationRule.trigger_type == trigger_type,
                    AutomationRule.is_enabled.is_(True),
                )
            ).all()
        )
        if not rules:
            return
        for rule in rules:
            if not self._matches_conditions(rule.conditions, work_item):
                continue
            result = self._run_actions(rule.actions, work_item, user)
            self.db.add(
                AutomationRun(
                    rule_id=rule.id,
                    work_item_id=work_item.id if work_item else None,
                    status="SUCCESS",
                    result_json=result,
                )
            )
        self.db.commit()

    def _matches_conditions(self, conditions: dict | None, work_item: WorkItem | None) -> bool:
        if not conditions or work_item is None:
            return True
        for key, expected in conditions.items():
            actual = getattr(work_item, key, None)
            actual_value = actual.value if hasattr(actual, "value") else actual
            if str(actual_value) != str(expected):
                return False
        return True

    def _run_actions(self, actions: list[dict] | None, work_item: WorkItem | None, user: User) -> dict:
        applied: list[str] = []
        for action in actions or []:
            action_type = action.get("type")
            if action_type == "set_priority" and work_item and action.get("priority"):
                try:
                    work_item.priority = WorkItemPriority(action["priority"])
                    applied.append(action_type)
                except ValueError:
                    continue
            elif action_type == "add_label" and work_item and action.get("label"):
                from app.models.work_item import WorkItemLabel

                if not any(label.name == action["label"] for label in work_item.labels):
                    work_item.labels.append(WorkItemLabel(name=action["label"]))
                applied.append(action_type)
            elif action_type == "notify" and work_item:
                from app.models.notification import NotificationType
                from app.services.notification_service import NotificationService

                NotificationService(self.db).create(
                    user_id=work_item.owner_id or user.id,
                    type=NotificationType.AUTOMATION,
                    title=action.get("message", "Automation triggered"),
                    work_item_id=work_item.id,
                    project_id=work_item.project_id,
                )
                applied.append(action_type)
        return {"applied": applied}
