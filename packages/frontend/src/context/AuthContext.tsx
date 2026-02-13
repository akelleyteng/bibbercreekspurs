import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  passwordResetRequired: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async (accessToken: string): Promise<User | null> => {
    try {
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            query Me {
              me {
                id
                email
                firstName
                lastName
                role
                passwordResetRequired
              }
            }
          `,
        }),
      });

      const result = await response.json();
      if (result.data?.me) {
        return result.data.me;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const tryRefreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            mutation RefreshToken {
              refreshToken {
                accessToken
              }
            }
          `,
        }),
      });

      const result = await response.json();
      if (result.data?.refreshToken?.accessToken) {
        return result.data.refreshToken.accessToken;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // On mount: try to restore the session
  useEffect(() => {
    async function initAuth() {
      // First, check if we have a token in localStorage
      const existingToken = localStorage.getItem('token');
      const existingUser = localStorage.getItem('user');

      if (existingToken && existingUser) {
        // Try to use the existing token to fetch the user
        const userData = await fetchCurrentUser(existingToken);
        if (userData) {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          setIsLoading(false);
          return;
        }
      }

      // Token is expired or missing — try refreshing via the httpOnly cookie
      const newToken = await tryRefreshToken();
      if (newToken) {
        localStorage.setItem('token', newToken);
        const userData = await fetchCurrentUser(newToken);
        if (userData) {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          setIsLoading(false);
          return;
        }
      }

      // No valid session — clear stale data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsLoading(false);
    }

    initAuth();
  }, [fetchCurrentUser, tryRefreshToken]);

  const logout = useCallback(async () => {
    try {
      await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation Logout { logout }`,
        }),
      });
    } catch {
      // Logout request failed, but we still clear local state
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
