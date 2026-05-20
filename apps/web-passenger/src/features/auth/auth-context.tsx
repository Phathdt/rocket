import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AuthState, AuthUser } from '@/types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  login: (state: AuthState) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadInitialState(): AuthState | null {
  try {
    const token = localStorage.getItem('accessToken');
    const userRaw = localStorage.getItem('authUser');
    if (!token || !userRaw) return null;
    return { accessToken: token, user: JSON.parse(userRaw) as AuthUser };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initial = loadInitialState();
  const [authState, setAuthState] = useState<AuthState | null>(initial);

  const login = useCallback((state: AuthState) => {
    localStorage.setItem('accessToken', state.accessToken);
    localStorage.setItem('authUser', JSON.stringify(state.user));
    setAuthState(state);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('authUser');
    setAuthState(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: authState?.user ?? null,
        accessToken: authState?.accessToken ?? null,
        login,
        logout,
        isAuthenticated: !!authState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
