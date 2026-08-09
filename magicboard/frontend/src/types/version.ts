export interface ProjectVersion {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  release_date: string | null;
  is_released: boolean;
  is_archived: boolean;
  created_at: string;
}

export interface ProjectVersionCreate {
  name: string;
  description?: string | null;
  release_date?: string | null;
}
