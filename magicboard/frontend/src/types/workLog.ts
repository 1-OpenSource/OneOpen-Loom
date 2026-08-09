import type { UserSummary } from "./auth";

export interface WorkLog {
  id: string;
  work_item_id: string;
  user_id: string;
  time_spent_seconds: number;
  started_at: string;
  comment: string | null;
  created_at: string;
  user: UserSummary;
}

export interface WorkLogCreate {
  time_spent_seconds: number;
  started_at?: string | null;
  comment?: string | null;
}
