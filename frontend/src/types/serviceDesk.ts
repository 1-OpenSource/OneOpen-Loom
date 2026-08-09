export interface ServiceQueue {
  id: string;
  project_id: string;
  name: string;
  oql: string | null;
  position: number;
  created_at: string;
}

export interface ServiceQueueCreate {
  name: string;
  oql?: string | null;
  position?: number;
}

export interface PortalProjectInfo {
  project_key: string;
  project_name: string;
  description: string | null;
  request_types: string[];
}

export interface PortalRequestCreate {
  summary: string;
  description?: string | null;
  requester_email: string;
  request_type?: string | null;
}
