export type IntegrationType = "GITHUB" | "GITLAB" | "SLACK" | "CI" | "OTHER";

export interface ProjectIntegration {
  id: string;
  project_id: string;
  integration_type: IntegrationType;
  name: string;
  url: string;
  created_at: string;
}

export interface ProjectIntegrationCreate {
  integration_type: IntegrationType;
  name: string;
  url: string;
}
