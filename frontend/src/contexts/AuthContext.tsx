import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, ApiResponse } from '../types';
import { apiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<ApiResponse<{ user: User; token: string }>>;
  register: (email: string, password: string) => Promise<ApiResponse<{ user: User; token: string }>>;
  logout: () => void;
  verifyEmail: (token: string) => Promise<ApiResponse<{ message: string }>>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      if (apiService.isAuthenticated()) {
        try {
          const response = await apiService.getCurrentUser();
          if (response.success) {
            setUser(response.data);
          } else {
            // Token is invalid, remove it
            apiService.logout();
          }
        } catch (error) {
          // Token is invalid, remove it
          apiService.logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiService.login(email, password);
    if (response.success) {
      setUser(response.data.user);
    }
    return response;
  };

  const register = async (email: string, password: string) => {
    const response = await apiService.register(email, password);
    if (response.success) {
      setUser(response.data.user);
    }
    return response;
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
  };

  const verifyEmail = async (token: string) => {
    return await apiService.verifyEmail(token);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    verifyEmail,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};