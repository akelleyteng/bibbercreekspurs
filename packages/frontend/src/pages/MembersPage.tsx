import { useState, useEffect } from 'react';

import { useAuth } from '../context/AuthContext';

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
  horseName?: string;
  project?: string;
  birthday?: string;
  tshirtSize?: string;
  youthMembers?: YouthMember[];
  createdAt: string;
}

type RoleFilter = 'ALL' | 'YOUTH' | 'ADULT';

export default function MembersPage() {
  const { isAuthenticated } = useAuth();
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');

  useEffect(() => {
    const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';
    const token = localStorage.getItem('token');

    if (!token) {
      setLoading(false);
      return;
    }

    fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `query { users { id firstName lastName email role phone profilePhotoUrl horseName project birthday tshirtSize youthMembers { id firstName lastName birthdate } createdAt } }`,
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.data?.users) {
          setMembers(result.data.users);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const filteredMembers = members.filter((user) => {
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === 'ALL' ||
      (roleFilter === 'YOUTH' && user.role === 'YOUTH_MEMBER') ||
      (roleFilter === 'ADULT' && ['PARENT', 'ADULT_LEADER', 'ADMIN'].includes(user.role));

    return matchesSearch && matchesRole;
  });

  if (!isAuthenticated) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Club Members</h1>
        <p className="text-gray-500 text-center py-12">Please log in to view the member directory.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Club Members</h1>
        <p className="text-gray-500 text-center py-12">Loading members...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Club Members</h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex gap-1">
          {(['ALL', 'YOUTH', 'ADULT'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setRoleFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                roleFilter === filter
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter === 'ALL' ? 'All Members' : filter === 'YOUTH' ? 'Youth' : 'Adults'}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search members..."
          className="input max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredMembers.map((member) => (
          <div key={member.id} className="card">
            <div className="flex items-center mb-4">
              <img
                src={member.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.firstName + ' ' + member.lastName)}&background=4f772d&color=fff`}
                alt={member.firstName}
                className="w-16 h-16 rounded-full mr-4"
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
