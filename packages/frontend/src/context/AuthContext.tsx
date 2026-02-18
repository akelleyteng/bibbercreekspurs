import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

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

// Refresh access token 2 minutes before the 15-minute expiry
const TOKEN_REFRESH_INTERVAL_MS = 13 * 60 * 1000;

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

  const tryRefreshToken = useCallback(async (): Promise<{ accessToken: string; user: User } | null> => {
    // Get the stored refresh token from localStorage (set when "Remember Me" was checked)
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      return null;
    }

    try {
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation RefreshToken($token: String) {
              refreshToken(token: $token) {
                accessToken
                user {
                  id
                  email
                  firstName
                  lastName
                  role
                  passwordResetRequired
                }
              }
            }
          `,
          variables: {
            token: storedRefreshToken,
          },
        }),
      });

      const result = await response.json();
      if (result.data?.refreshToken) {
        return result.data.refreshToken;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // On mount: try to restore the session
  useEffect(() => {
    async function initAuth() {
      // First, check if we have an access token in localStorage
      const existingToken = localStorage.getItem('token');
      const existingUser = localStorage.getItem('user');

      if (existingToken && existingUser) {
        // Try to use the existing access token to fetch the user
        const userData = await fetchCurrentUser(existingToken);
        if (userData) {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          setIsLoading(false);
          return;
        }
      }

      // Access token is expired or missing — try refreshing via stored refresh token
      const refreshResult = await tryRefreshToken();
      if (refreshResult) {
        localStorage.setItem('token', refreshResult.accessToken);
        localStorage.setItem('user', JSON.stringify(refreshResult.user));
        setUser(refreshResult.user);
        setIsLoading(false);
        return;
      }

      // No valid session — clear stale data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setIsLoading(false);
    }

    initAuth();
  }, [fetchCurrentUser, tryRefreshToken]);

  // Silently refresh the access token before it expires
  const refreshSession = useCallback(async () => {
    const refreshResult = await tryRefreshToken();
    if (refreshResult) {
      localStorage.setItem('token', refreshResult.accessToken);
      localStorage.setItem('user', JSON.stringify(refreshResult.user));
      setUser(refreshResult.user);
    } else if (user) {
      // Refresh failed while we thought we were logged in — session is dead
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  }, [tryRefreshToken, user]);

  // Proactive refresh timer + tab re-focus refresh
  const lastRefreshRef = useRef(Date.now());

  useEffect(() => {
    if (!user) return;

    // Periodic refresh every 13 minutes
    lastRefreshRef.current = Date.now();
    const interval = setInterval(() => {
      lastRefreshRef.current = Date.now();
      refreshSession();
    }, TOKEN_REFRESH_INTERVAL_MS);

    // Also refresh when tab becomes visible again (handles backgrounded tabs)
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastRefreshRef.current;
        if (elapsed > TOKEN_REFRESH_INTERVAL_MS) {
          lastRefreshRef.current = Date.now();
          refreshSession();
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, refreshSession]);

  const logout = useCallback(async () => {
    try {
      await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `mutation Logout { logout }`,
        }),
      });
    } catch {
      // Logout request failed, but we still clear local state
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
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
