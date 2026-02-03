"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { loginAction, signupAction, logoutAction } from "@/app/actions/auth";

interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  initialSession?: { user: { id: string; email: string; avatarUrl?: string }; token: string } | null;
}

export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [token, setToken] = useState<string | null>(initialSession?.token ?? null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!initialSession);
  const [isLoading] = useState(false);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const result = await loginAction(email, password, rememberMe);
    if (!result.success) {
      throw new Error(result.error);
    }
    setUser(result.user);
    setToken(result.token);
    setIsAuthenticated(true);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const result = await signupAction(name, email, password);
    if (!result.success) {
      throw new Error(result.error);
    }
    setUser({ ...result.user, name });
    setToken(result.token);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    await logoutAction();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, token, login, signup, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
