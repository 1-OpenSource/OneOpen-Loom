import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fields import CustomFieldDefinition, CustomFieldValue, ProjectComponent, ProjectLabel
from app.models.user import User
from app.models.work_item import WorkItem
from app.schemas.fields import (
    CustomFieldDefinitionCreate,
    CustomFieldDefinitionUpdate,
    CustomFieldValueSet,
    ProjectComponentCreate,
    ProjectLabelCreate,
)
from app.services.access_service import AccessService


class FieldsService:
    def __init__(self, db: Session):
        self.db = db
        self.access = AccessService(db)

    def list_labels(self, project_id: uuid.UUID, user: User) -> list[ProjectLabel]:
        self.access.require_project_read(project_id, user)
        return list(self.db.scalars(select(ProjectLabel).where(ProjectLabel.project_id == project_id)).all())

    def create_label(self, project_id: uuid.UUID, payload: ProjectLabelCreate, user: User) -> ProjectLabel:
        self.access.require_project_write(project_id, user)
        existing = self.db.scalar(
            select(ProjectLabel).where(ProjectLabel.project_id == project_id, ProjectLabel.name == payload.name)
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Label already exists.")
        label = ProjectLabel(project_id=project_id, name=payload.name, color=payload.color)
        self.db.add(label)
        self.db.commit()
        return label

    def delete_label(self, label_id: uuid.UUID, user: User) -> None:
        label = self.db.get(ProjectLabel, label_id)
        if not label:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found.")
        self.access.require_project_write(label.project_id, user)
        self.db.delete(label)
        self.db.commit()

    def list_components(self, project_id: uuid.UUID, user: User) -> list[ProjectComponent]:
        self.access.require_project_read(project_id, user)
        return list(
            self.db.scalars(select(ProjectComponent).where(ProjectComponent.project_id == project_id)).all()
        )

    def create_component(
        self, project_id: uuid.UUID, payload: ProjectComponentCreate, user: User
    ) -> ProjectComponent:
        self.access.require_project_write(project_id, user)
        existing = self.db.scalar(
            select(ProjectComponent).where(
                ProjectComponent.project_id == project_id, ProjectComponent.name == payload.name
            )
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Component already exists.")
        component = ProjectComponent(
            project_id=project_id, name=payload.name, description=payload.description
        )
        self.db.add(component)
        self.db.commit()
        return component

    def delete_component(self, component_id: uuid.UUID, user: User) -> None:
        component = self.db.get(ProjectComponent, component_id)
        if not component:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Component not found.")
        self.access.require_project_write(component.project_id, user)
        self.db.delete(component)
        self.db.commit()

    def list_field_definitions(self, project_id: uuid.UUID, user: User) -> list[CustomFieldDefinition]:
        self.access.require_project_read(project_id, user)
        return list(
            self.db.scalars(
                select(CustomFieldDefinition).where(CustomFieldDefinition.project_id == project_id)
            ).all()
        )

    def create_field_definition(
        self, project_id: uuid.UUID, payload: CustomFieldDefinitionCreate, user: User
    ) -> CustomFieldDefinition:
        self.access.require_project_write(project_id, user)
        existing = self.db.scalar(
            select(CustomFieldDefinition).where(
                CustomFieldDefinition.project_id == project_id, CustomFieldDefinition.name == payload.name
            )
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Custom field already exists.")
        field = CustomFieldDefinition(
            project_id=project_id,
            name=payload.name,
            field_type=payload.field_type,
            options=payload.options,
            applies_to_types=payload.applies_to_types,
            is_required=payload.is_required,
        )
        self.db.add(field)
        self.db.commit()
        return field

    def update_field_definition(
        self, field_id: uuid.UUID, payload: CustomFieldDefinitionUpdate, user: User
    ) -> CustomFieldDefinition:
        field = self.db.get(CustomFieldDefinition, field_id)
        if not field:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom field not found.")
        self.access.require_project_write(field.project_id, user)
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            setattr(field, key, value)
        self.db.commit()
        return field

    def delete_field_definition(self, field_id: uuid.UUID, user: User) -> None:
        field = self.db.get(CustomFieldDefinition, field_id)
        if not field:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom field not found.")
        self.access.require_project_write(field.project_id, user)
        self.db.delete(field)
        self.db.commit()

    def set_value(self, work_item_id: uuid.UUID, payload: CustomFieldValueSet, user: User) -> CustomFieldValue:
        work_item = self.db.get(WorkItem, work_item_id)
        if not work_item or work_item.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
        self.access.require_project_write(work_item.project_id, user)
        field = self.db.get(CustomFieldDefinition, payload.field_id)
        if not field or field.project_id != work_item.project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Custom field must belong to the same project.",
            )
        value = self.db.scalar(
            select(CustomFieldValue).where(
                CustomFieldValue.work_item_id == work_item_id, CustomFieldValue.field_id == payload.field_id
            )
        )
        if value:
            value.value_text = payload.value_text
            value.value_json = payload.value_json
        else:
            value = CustomFieldValue(
                work_item_id=work_item_id,
                field_id=payload.field_id,
                value_text=payload.value_text,
                value_json=payload.value_json,
            )
            self.db.add(value)
        self.db.commit()
        return value

    def list_values(self, work_item_id: uuid.UUID, user: User) -> list[CustomFieldValue]:
        work_item = self.db.get(WorkItem, work_item_id)
        if not work_item or work_item.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
        self.access.require_project_read(work_item.project_id, user)
        return list(
            self.db.scalars(select(CustomFieldValue).where(CustomFieldValue.work_item_id == work_item_id)).all()
        )
