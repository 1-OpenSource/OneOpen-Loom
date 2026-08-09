export interface VelocityPoint {
  sprint_id: string;
  sprint_name: string;
  committed_points: number;
  completed_points: number;
}

export interface BurndownPoint {
  date: string;
  remaining_points: number;
  ideal_points: number;
}

export interface CumulativeFlowPoint {
  date: string;
  counts_by_status: Record<string, number>;
}

export interface CreatedVsResolvedPoint {
  date: string;
  created: number;
  resolved: number;
}
