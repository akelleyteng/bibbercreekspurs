import { useState, useEffect } from 'react';

const GRAPHQL_URL = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql');

export interface AvatarData {
  profilePhotoUrl?: string | null;
  horsePhotoUrl?: string | null;
  avatarChoice?: string | null;
}

// Module-level cache — persists for the browser session
const avatarCache = new Map<string, AvatarData>();
const pendingFetches = new Map<string, Promise<AvatarData>>();

/** Pre-populate the cache from data you already have (e.g. members list). */
export function seedAvatarCache(users: Array<{ id: string } & AvatarData>) {
  for (const u of users) {
    avatarCache.set(u.id, {
      profilePhotoUrl: u.profilePhotoUrl,
      horsePhotoUrl: u.horsePhotoUrl,
      avatarChoice: u.avatarChoice,
    });
  }
}

/** Invalidate a single user's cached avatar (e.g. after photo upload). */
export function invalidateAvatarCache(userId: string) {
  avatarCache.delete(userId);
}

function fetchAvatarData(userId: string): Promise<AvatarData> {
  const cached = avatarCache.get(userId);
  if (cached) return Promise.resolve(cached);

  const pending = pendingFetches.get(userId);
  if (pending) return pending;

  const token = localStorage.getItem('token');
  const promise = fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      query: `query UserAvatar($userId: ID!) { userAvatar(userId: $userId) { profilePhotoUrl horsePhotoUrl avatarChoice } }`,
      variables: { userId },
    }),
  })
    .then(r => r.json())
    .then(r => {
      const data: AvatarData = r.data?.userAvatar || {};
      avatarCache.set(userId, data);
      pendingFetches.delete(userId);
      return data;
    })
    .catch(() => {
      pendingFetches.delete(userId);
      return {} as AvatarData;
    });

  pendingFetches.set(userId, promise);
  return promise;
}

function resolveAvatarSrc(data: AvatarData): string | null {
  if (data.avatarChoice === 'profile' && data.profilePhotoUrl) return data.profilePhotoUrl;
  if (data.avatarChoice === 'horse' && data.horsePhotoUrl) return data.horsePhotoUrl;
  if (data.profilePhotoUrl) return data.profilePhotoUrl;
  return null;
}

// ---- Component ----

interface MemberAvatarProps {
  userId?: string;
  firstName: string;
  lastName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses: Record<string, string> = {
  xs: 'w-6 h-6 text-[0.5rem]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export default function MemberAvatar({
  userId,
  firstName,
  lastName,
  size = 'md',
  className = '',
}: MemberAvatarProps) {
  const cached = userId ? avatarCache.get(userId) : undefined;
  const [avatarData, setAvatarData] = useState<AvatarData | null>(cached || null);

  useEffect(() => {
    if (!userId) return;
    if (avatarCache.has(userId)) {
      setAvatarData(avatarCache.get(userId)!);
      return;
    }
    let cancelled = false;
    fetchAvatarData(userId).then(data => {
      if (!cancelled) setAvatarData(data);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const src = avatarData ? resolveAvatarSrc(avatarData) : null;
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  if (src) {
    return (
      <img
        src={src}
        alt={`${firstName} ${lastName}`}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-primary-600 text-white flex items-center justify-center font-bold flex-shrink-0 ${className}`}
    >
      {firstName[0]}{lastName[0]}
    </div>
  );
}
