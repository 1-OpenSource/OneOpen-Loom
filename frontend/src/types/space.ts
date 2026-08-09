export interface Space {
  id: string;
  workspace_id: string;
  name: string;
  key: string;
  description: string | null;
  created_at: string;
}

export interface SpaceCreate {
  name: string;
  key: string;
  description?: string | null;
}

export interface SpacePage {
  id: string;
  space_id: string;
  parent_page_id: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface SpacePageCreate {
  title: string;
  content?: string;
  parent_page_id?: string | null;
}
