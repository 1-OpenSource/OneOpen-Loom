import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.fields import (
    CustomFieldDefinitionCreate,
    CustomFieldDefinitionRead,
    CustomFieldDefinitionUpdate,
    CustomFieldValueRead,
    CustomFieldValueSet,
    ProjectComponentCreate,
    ProjectComponentRead,
    ProjectLabelCreate,
    ProjectLabelRead,
)
from app.services.fields_service import FieldsService

router = APIRouter(tags=["fields"])


@router.get("/projects/{project_id}/labels", response_model=list[ProjectLabelRead])
def list_labels(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FieldsService(db).list_labels(project_id, current_user)


@router.post("/projects/{project_id}/labels", response_model=ProjectLabelRead, status_code=status.HTTP_201_CREATED)
def create_label(
    project_id: uuid.UUID,
    payload: ProjectLabelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FieldsService(db).create_label(project_id, payload, current_user)


@router.delete("/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_label(
    label_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    FieldsService(db).delete_label(label_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/projects/{project_id}/components", response_model=list[ProjectComponentRead])
def list_components(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FieldsService(db).list_components(project_id, current_user)


@router.post(
    "/projects/{project_id}/components", response_model=ProjectComponentRead, status_code=status.HTTP_201_CREATED
)
def create_component(
    project_id: uuid.UUID,
    payload: ProjectComponentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FieldsService(db).create_component(project_id, payload, current_user)


@router.delete("/components/{component_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_component(
    component_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    FieldsService(db).delete_component(component_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/projects/{project_id}/custom-fields", response_model=list[CustomFieldDefinitionRead])
def list_custom_fields(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FieldsService(db).list_field_definitions(project_id, current_user)


@router.post(
    "/projects/{project_id}/custom-fields",
    response_model=CustomFieldDefinitionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_custom_field(
    project_id: uuid.UUID,
    payload: CustomFieldDefinitionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FieldsService(db).create_field_definition(project_id, payload, current_user)


@router.put("/custom-fields/{field_id}", response_model=CustomFieldDefinitionRead)
def update_custom_field(
    field_id: uuid.UUID,
    payload: CustomFieldDefinitionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FieldsService(db).update_field_definition(field_id, payload, current_user)


@router.delete("/custom-fields/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_field(
    field_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    FieldsService(db).delete_field_definition(field_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put(
    "/work-items/{work_item_id}/custom-fields", response_model=CustomFieldValueRead, status_code=status.HTTP_200_OK
)
def set_custom_field_value(
    work_item_id: uuid.UUID,
    payload: CustomFieldValueSet,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FieldsService(db).set_value(work_item_id, payload, current_user)


@router.get("/work-items/{work_item_id}/custom-fields", response_model=list[CustomFieldValueRead])
def list_custom_field_values(
    work_item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FieldsService(db).list_values(work_item_id, current_user)
