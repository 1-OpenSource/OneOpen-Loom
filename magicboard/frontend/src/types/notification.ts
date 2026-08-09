export interface NotificationItem {
  id: string;
  user_id: string;
  category: string;
  title: string;
  body: string | null;
  href: string | null;
  is_read: boolean;
  created_at: string;
}
