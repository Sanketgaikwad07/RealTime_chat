import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { User, AuthState } from "@/types/chat";
import { authApi } from "@/services/api";

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({ user: null, token: null, isAuthenticated: false });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await authApi.login(email, password);
      localStorage.setItem("token", token);
      setState({ user, token, isAuthenticated: true });
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await authApi.register(username, email, password);
      localStorage.setItem("token", token);
      setState({ user, token, isAuthenticated: true });
    } catch {
      setError("Registration failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setState({ user: null, token: null, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, error, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
