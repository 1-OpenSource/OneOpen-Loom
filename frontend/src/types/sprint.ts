export type SprintState = "PLANNED" | "ACTIVE" | "COMPLETED";

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  state: SprintState;
  start_date: string | null;
  end_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SprintCreate {
  name: string;
  goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}
