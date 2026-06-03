import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AuthApi, type Permission, type SessionUser } from "@/lib/auth-store";

type Ctx = {
  user: SessionUser | null;
  permissions: Permission[];
  loading: boolean;
  login: (u: string, p: string) => Promise<SessionUser>;
  logout: () => void;
  hasPermission: (p: Permission) => boolean;
  refresh: () => void;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AuthApi.bootstrap();
    setUser(AuthApi.getSession());
    setLoading(false);
  }, []);

  const refresh = useCallback(() => setUser(AuthApi.getSession()), []);

  const login = useCallback(async (username: string, password: string) => {
    const s = AuthApi.login(username, password);
    setUser(s);
    return s;
  }, []);

  const logout = useCallback(() => {
    AuthApi.logout();
    setUser(null);
  }, []);

  const permissions = AuthApi.getPermissions(user);

  const hasPermission = useCallback(
    (p: Permission) => permissions.includes(p),
    [permissions]
  );

  return (
    <AuthContext.Provider
      value={{ user, permissions, loading, login, logout, hasPermission, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
