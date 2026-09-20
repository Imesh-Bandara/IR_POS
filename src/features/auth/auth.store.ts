import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  role_id: string;
  status: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  permissions: string[];
  isAuthenticated: boolean;
  setAuth: (token: string, user: User, permissions: string[]) => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  permissions: [],
  isAuthenticated: false,
  setAuth: (token, user, permissions) =>
    set({ token, user, permissions, isAuthenticated: true }),
  clearAuth: () =>
    set({ token: null, user: null, permissions: [], isAuthenticated: false }),
  hasPermission: (permission: string) => get().permissions.includes(permission),
}));
