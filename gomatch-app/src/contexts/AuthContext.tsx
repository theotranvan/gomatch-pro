import React, { createContext, useEffect, useMemo, useState } from "react";
import type { PlayerProfile, User } from "../types";
import { authService } from "../services/auth";

interface AuthContextType {
  user: User | null;
  profile: PlayerProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    passwordConfirm: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<PlayerProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const profile = user?.profile ?? null;
  const isAuthenticated = !!user;

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const tokens = await authService.getTokens();
      if (tokens) {
        try {
          await authService.refreshToken(tokens.refresh);
        } catch {
          await authService.clearTokens();
          setUser(null);
          return;
        }
        const me = await authService.getMe();
        setUser(me);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const { user: loggedUser } = await authService.login(email, password);
    setUser(loggedUser);
  }

  async function register(
    email: string,
    password: string,
    passwordConfirm: string,
  ) {
    const { user: newUser } = await authService.register(
      email,
      password,
      passwordConfirm,
    );
    setUser(newUser);
  }

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  async function updateProfile(data: Partial<PlayerProfile>) {
    await authService.updateProfile(data);
    const me = await authService.getMe();
    setUser(me);
  }

  async function refreshUser() {
    const me = await authService.getMe();
    setUser(me);
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      isLoading,
      isAuthenticated,
      login,
      register,
      logout,
      updateProfile,
      refreshUser,
    }),
    [user, isLoading],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
