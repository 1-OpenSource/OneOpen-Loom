export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: "bearer";
}

export interface SetupStatus {
  needs_owner: boolean;
  user_count: number;
}
