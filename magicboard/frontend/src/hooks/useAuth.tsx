import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type { ReactNode } from "react";
import { authService } from "../services/authService";
import type { LoginRequest, RegisterRequest, User } from "../types/auth";
import { clearAuthToken, getAuthToken, setAuthToken } from "../utils/authToken";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const stored = getAuthToken();
    if (!stored) {
      setToken(null);
      setUser(null);
      return;
    }
    setToken(stored);
    const currentUser = await authService.me();
    setUser(currentUser);
  }, []);

  useEffect(() => {
    refreshUser()
      .catch(() => {
        clearAuthToken();
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (payload: LoginRequest) => {
    const result = await authService.login(payload);
    setAuthToken(result.access_token);
    setToken(result.access_token);
    const currentUser = await authService.me();
    setUser(currentUser);
  }, []);

  const register = useCallback(async (payload: RegisterRequest) => {
    await authService.register(payload);
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setToken(null);
    setUser(null);
    window.location.assign("/login");
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user) || Boolean(token),
      isLoading,
      login,
      register,
      logout,
      refreshUser
    }),
    [user, token, isLoading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
