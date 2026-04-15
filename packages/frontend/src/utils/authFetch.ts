const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

const AUTH_ERROR_CODES = new Set(['UNAUTHENTICATED', 'INVALID_TOKEN']);

/**
 * Decode the JWT payload and check if it's expired or within 60s of expiry.
 * Does NOT verify the signature — just reads the exp claim to decide whether
 * to proactively refresh before sending a request.
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    // JWT uses base64url; atob needs standard base64
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    // Refresh 60s before actual expiry to avoid race conditions
    return !payload.exp || (payload.exp - 60) * 1000 < Date.now();
  } catch {
    return false; // Can't decode — let the server decide
  }
}

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

  // Treat HTTP 401/403 as auth errors so the retry logic can kick in
  if (res.status === 401 || res.status === 403) {
    return { errors: [{ message: 'Unauthorized', extensions: { code: 'UNAUTHENTICATED' } }] };
  }

  if (!res.ok) {
    return { errors: [{ message: `Server error (${res.status})` }] };
  }

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
  let token = localStorage.getItem('token');

  // Proactively refresh if the token is expired or within 60s of expiry.
  // This prevents the backend from returning INTERNAL_SERVER_ERROR (instead of
  // UNAUTHENTICATED) when verifyAccessToken throws a plain Error for expired tokens,
  // which authFetch's hasAuthError check would miss.
  if (token && isTokenExpired(token)) {
    const freshToken = await refreshAccessToken();
    if (freshToken) {
      token = freshToken;
    } else {
      clearSession();
      return { errors: [{ message: 'Session expired', extensions: { code: 'UNAUTHENTICATED' } }] };
    }
  }

  const result = await executeGraphQL<T>(query, variables, token);

  if (!hasAuthError(result.errors)) {
    return result;
  }

  // Unexpected auth error despite a seemingly valid token — refresh and retry once
  const newToken = await refreshAccessToken();
  if (!newToken) {
    clearSession();
    return result;
  }

  return executeGraphQL<T>(query, variables, newToken);
}
