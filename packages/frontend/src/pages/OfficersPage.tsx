import { mockUsers } from '../data/mockData';

export default function OfficersPage() {
  const officers = mockUsers.filter((user) => user.role === 'OFFICER' || user.role === 'ADMIN');

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Club Officers</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {officers.map((officer) => (
          <div key={officer.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <img
                src={officer.profileImageUrl}
                alt={`${officer.firstName} ${officer.lastName} profile photo`}
                className="w-20 h-20 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {officer.firstName} {officer.lastName}
                </h3>
                <p className="text-primary-600 font-medium mb-2">
                  {officer.role === 'ADMIN' ? 'Club Leader' : 'Officer'}
                </p>
                {officer.bio && (
                  <p className="text-gray-600 text-sm leading-relaxed mb-3">
                    {officer.bio}
                  </p>
                )}
                <a
                  href={`mailto:${officer.email}`}
                  className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
                >
                  {officer.email}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
