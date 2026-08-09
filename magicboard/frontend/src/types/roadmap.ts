export interface RoadmapItem {
  id: string;
  work_item_key: string;
  title: string;
  type: string;
  status: string;
  start_date: string | null;
  due_date: string | null;
  progress: number;
  children: RoadmapItem[];
}

export interface RoadmapResponse {
  items: RoadmapItem[];
}
