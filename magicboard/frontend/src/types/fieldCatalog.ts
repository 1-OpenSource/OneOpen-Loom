export interface ProjectLabel {
  id: string;
  project_id: string;
  name: string;
  color: string | null;
}

export interface ProjectComponent {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  lead_user_id: string | null;
}

export type CustomFieldType = "TEXT" | "NUMBER" | "DATE" | "SELECT" | "MULTI_SELECT" | "CHECKBOX" | "USER";

export interface CustomField {
  id: string;
  project_id: string;
  name: string;
  field_type: CustomFieldType;
  options: string[];
  is_required: boolean;
}

export interface CustomFieldCreate {
  name: string;
  field_type: CustomFieldType;
  options?: string[];
  is_required?: boolean;
}
