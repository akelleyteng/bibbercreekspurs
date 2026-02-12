import { useState } from 'react';
import { mockUsers } from '../data/mockData';

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredMembers = mockUsers.filter(
    (user) =>
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Club Members</h1>
      
      <div className="mb-6">
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
                src={member.profileImageUrl}
                alt={member.firstName}
                className="w-16 h-16 rounded-full mr-4"
              />
              <div>
                <h3 className="font-bold text-gray-900">
                  {member.firstName} {member.lastName}
                </h3>
                <p className="text-sm text-gray-500">{member.role}</p>
              </div>
            </div>
            {member.bio && <p className="text-gray-600 text-sm">{member.bio}</p>}
            <div className="mt-3 text-xs text-gray-500">
              Member since {member.joinDate.getFullYear()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
