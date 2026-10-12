import { createContext, useContext } from 'react';
import type { Grant, User } from '../types/api';
export interface AuthContextValue {
  user: User | null;
  login: (grant: Grant) => void;
  logout: () => Promise<void>;
}
export const AuthContext = createContext<AuthContextValue | null>(null);
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthContext ausente');
  return context;
}
