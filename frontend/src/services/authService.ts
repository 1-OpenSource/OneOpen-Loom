import { apiClient } from "./apiClient";
import type { AuthToken, LoginRequest, RegisterRequest, SetupStatus, User } from "../types/auth";

export const authService = {
  async getSetupStatus(): Promise<SetupStatus> {
    const response = await apiClient.get<SetupStatus>("/api/auth/setup-status");
    return response.data;
  },

  async register(payload: RegisterRequest): Promise<User> {
    const response = await apiClient.post<User>("/api/auth/register", payload);
    return response.data;
  },

  async login(payload: LoginRequest): Promise<AuthToken> {
    const response = await apiClient.post<AuthToken>("/api/auth/login", payload);
    return response.data;
  },

  async me(): Promise<User> {
    const response = await apiClient.get<User>("/api/auth/me");
    return response.data;
  }
};
