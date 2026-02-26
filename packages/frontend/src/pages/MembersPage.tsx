import { useState, useEffect } from 'react';

import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';

const ROLE_LABELS: Record<string, string> = {
  PARENT: 'Parent',
  ADULT_LEADER: 'Adult Leader',
  YOUTH_MEMBER: 'Youth Member',
  ADMIN: 'Admin',
};

interface YouthMember {
  id: string;
  firstName: string;
  lastName: string;
  birthdate?: string;
}

interface MemberData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string;
  profilePhotoUrl?: string;
  horsePhotoUrl?: string;
  avatarChoice?: string;
  horseName?: string;
  project?: string;
  birthday?: string;
  tshirtSize?: string;
  youthMembers?: YouthMember[];
  createdAt: string;
}

type RoleFilter = 'all' | 'youth' | 'adult_leader' | 'parent' | 'officer';

const FILTERS: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'All Members' },
  { key: 'youth', label: 'Youth Members' },
  { key: 'adult_leader', label: 'Adult Leaders' },
  { key: 'parent', label: 'Parents' },
  { key: 'officer', label: 'Officers' },
];

function getAvatarUrl(member: MemberData): string {
  if (member.avatarChoice === 'profile' && member.profilePhotoUrl) return member.profilePhotoUrl;
  if (member.avatarChoice === 'horse' && member.horsePhotoUrl) return member.horsePhotoUrl;
  return member.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.firstName + ' ' + member.lastName)}&background=4f772d&color=fff`;
}

export default function MembersPage() {
  const { isAuthenticated } = useAuth();
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [officerUserIds, setOfficerUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setLoading(false);
      return;
    }

    authFetch(`query { users { id firstName lastName email role phone profilePhotoUrl horsePhotoUrl avatarChoice horseName project birthday tshirtSize youthMembers { id firstName lastName birthdate } createdAt } }`)
      .then((result) => {
        if (result.data?.users) {
          setMembers(result.data.users);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch current term officers for the Officers filter
    const now = new Date();
    const year = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
    const termYear = `${year}-${year + 1}`;
    authFetch(
      `query($termYear: String!) { officerPositions(termYear: $termYear) { holderUserId } }`,
      { termYear },
    ).then((result) => {
      if (result.data?.officerPositions) {
        const ids = new Set<string>();
        for (const o of result.data.officerPositions) {
          if (o.holderUserId) ids.add(o.holderUserId);
        }
        setOfficerUserIds(ids);
      }
    }).catch(() => {});
  }, [isAuthenticated]);

  const filteredMembers = members
    .filter((user) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query ||
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.horseName && user.horseName.toLowerCase().includes(query));

      let matchesRole = true;
      switch (roleFilter) {
        case 'youth': matchesRole = user.role === 'YOUTH_MEMBER'; break;
        case 'adult_leader': matchesRole = user.role === 'ADULT_LEADER'; break;
        case 'parent': matchesRole = user.role === 'PARENT'; break;
        case 'officer': matchesRole = officerUserIds.has(user.id); break;
      }

      return matchesSearch && matchesRole;
    })
    .sort((a, b) => a.firstName.localeCompare(b.firstName));

  if (!isAuthenticated) {
    return (
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Club Members</h1>
        <p className="text-gray-500 text-center py-12">Please log in to view the member directory.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Club Members</h1>
        <p className="text-gray-500 text-center py-12">Loading members...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Club Members</h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
        <div className="relative max-w-md w-full">
          <input
            type="text"
            placeholder="Search by name, email, or horse name..."
            className="input w-full pr-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setRoleFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              roleFilter === f.key
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs opacity-75">
              ({f.key === 'all' ? members.length
                : f.key === 'youth' ? members.filter(m => m.role === 'YOUTH_MEMBER').length
                : f.key === 'adult_leader' ? members.filter(m => m.role === 'ADULT_LEADER').length
                : f.key === 'parent' ? members.filter(m => m.role === 'PARENT').length
                : members.filter(m => officerUserIds.has(m.id)).length})
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredMembers.map((member) => (
          <div key={member.id} className="card">
            <div className="flex items-center mb-3 sm:mb-4">
              <img
                src={getAvatarUrl(member)}
                alt={member.firstName}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full mr-3 sm:mr-4 object-cover"
              />
              <div>
                <h3 className="font-bold text-gray-900">
                  {member.firstName} {member.lastName}
                </h3>
                <p className="text-sm text-gray-500">{ROLE_LABELS[member.role] || member.role}</p>
              </div>
            </div>
            {member.horseName && (
              <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Horse:</span> {member.horseName}</p>
            )}
            {member.project && (
              <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Project:</span> {member.project}</p>
            )}
            {member.birthday && (
              <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Birthday:</span> {new Date(member.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
            )}
            {member.tshirtSize && (
              <p className="text-sm text-gray-600 mb-1"><span className="font-medium">T-Shirt:</span> {member.tshirtSize}</p>
            )}
            {member.youthMembers && member.youthMembers.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-700">Youth Members:</p>
                <ul className="text-sm text-gray-600">
                  {member.youthMembers.map((ym) => (
                    <li key={ym.id}>{ym.firstName} {ym.lastName}</li>
                  ))}
                </ul>
              </div>
            )}
            {member.phone && (
              <p className="text-sm text-gray-600">{member.phone}</p>
            )}
            <div className="mt-3 text-xs text-gray-500">
              Member since {new Date(member.createdAt).getFullYear()}
            </div>
          </div>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <p className="text-gray-500 text-center py-12">No members found.</p>
      )}
    </div>
  );
}
