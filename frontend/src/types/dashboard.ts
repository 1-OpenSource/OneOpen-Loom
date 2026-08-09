export type GadgetType = "FILTER_COUNT" | "ASSIGNED_TO_ME" | "ACTIVITY_STREAM" | "STATUS_BREAKDOWN";

export interface DashboardGadget {
  id: string;
  dashboard_id: string;
  gadget_type: GadgetType;
  title: string;
  config: Record<string, unknown>;
  position: number;
}

export interface Dashboard {
  id: string;
  workspace_id: string;
  name: string;
  is_shared: boolean;
  gadgets: DashboardGadget[];
  created_at: string;
}

export interface DashboardCreate {
  name: string;
  is_shared?: boolean;
}

export interface DashboardGadgetCreate {
  gadget_type: GadgetType;
  title: string;
  config?: Record<string, unknown>;
}
