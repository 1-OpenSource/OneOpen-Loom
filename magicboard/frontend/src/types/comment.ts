import type { User } from "./auth";

export interface Comment {
  id: string;
  work_item_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  user: User;
}
