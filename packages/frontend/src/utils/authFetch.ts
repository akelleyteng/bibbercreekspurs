const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

const AUTH_ERROR_CODES = new Set(['UNAUTHENTICATED', 'INVALID_TOKEN']);

export const SESSION_EXPIRED_EVENT = 'auth:session-expired';

// Mutex: only one refresh at a time; concurrent callers piggyback on the same promise
let refreshPromise: Promise<string | null> | null = null;

interface GraphQLError {
  message: string;
  extensions?: { code?: string };
}

interface GraphQLResult<T = any> {
  data?: T;
  errors?: GraphQLError[];
}

function hasAuthError(errors?: GraphQLError[]): boolean {
  return !!errors?.some((e) => AUTH_ERROR_CODES.has(e.extensions?.code || ''));
}

async function executeGraphQL<T>(
  query: string,
  variables: Record<string, unknown> | undefined,
  token: string | null,
): Promise<GraphQLResult<T>> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation RefreshToken($token: String) {
            refreshToken(token: $token) {
              accessToken
              user { id email firstName lastName role passwordResetRequired }
            }
          }`,
          variables: { token: refreshToken },
        }),
      });

      const result = await res.json();
      if (result.data?.refreshToken) {
        const { accessToken, user } = result.data.refreshToken;
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        return accessToken;
      }
      return null;
    } catch {
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function clearSession(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('refreshToken');
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

/**
 * Authenticated GraphQL fetch with automatic token refresh.
 * If the request fails with an auth error, refreshes the access token and retries once.
 */
export async function authFetch<T = any>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<GraphQLResult<T>> {
  const token = localStorage.getItem('token');
  const result = await executeGraphQL<T>(query, variables, token);

  if (!hasAuthError(result.errors)) {
    return result;
  }

  // Token expired — try to refresh
  const newToken = await refreshAccessToken();
  if (!newToken) {
    clearSession();
    return result;
  }

  // Retry with the fresh token
  return executeGraphQL<T>(query, variables, newToken);
}
