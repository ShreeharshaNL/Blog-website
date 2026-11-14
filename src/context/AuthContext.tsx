import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '../types';
import { apiRequest, setAuthToken } from '../utils/api';

interface AuthContextType {
  user: User | null;
  unreadNotifications: number;
  isLoading: boolean;
  loginDemo: (role?: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updatedFields: Partial<User>) => void;
  setUnreadNotifications: React.Dispatch<React.SetStateAction<number>>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  unreadNotifications: 0,
  isLoading: true,
  loginDemo: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  updateUser: () => {},
  setUnreadNotifications: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiRequest<{ user: User | null; unread_notifications: number }>('/api/auth/me');
      setUser(data.user);
      setUnreadNotifications(data.unread_notifications || 0);
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const loginDemo = async (role = 'user', username?: string) => {
    setIsLoading(true);
    try {
      const data = await apiRequest<{ token: string; user: any }>('/api/auth/login-demo', {
        method: 'POST',
        body: JSON.stringify({ role, username }),
      });
      if (data.token) {
        setAuthToken(data.token);
      }
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    } finally {
      setAuthToken(null);
      setUser(null);
      setUnreadNotifications(0);
    }
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        unreadNotifications,
        isLoading,
        loginDemo,
        logout,
        refreshUser,
        updateUser,
        setUnreadNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
