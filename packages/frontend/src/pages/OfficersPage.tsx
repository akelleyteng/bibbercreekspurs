import { useState, useEffect } from 'react';

import MemberAvatar from '../components/MemberAvatar';
import { authFetch } from '../utils/authFetch';

interface OfficerHolder {
  firstName: string;
  lastName: string;
  holderType: string;
  profilePhotoUrl?: string;
}

interface OfficerData {
  id: string;
  position: string;
  holderUserId?: string;
  label: string;
  description: string;
  holder?: OfficerHolder;
}

interface OfficerRole {
  name: string;
  sortOrder: number;
}

export default function OfficersPage() {
  const [officers, setOfficers] = useState<OfficerData[]>([]);
  const [roles, setRoles] = useState<OfficerRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Compute current term year (Oct-Sep)
    const now = new Date();
    const year = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
    const termYear = `${year}-${year + 1}`;

    Promise.all([
      authFetch(
        `query($termYear: String!) { officerPositions(termYear: $termYear) { id position holderUserId label description holder { firstName lastName holderType profilePhotoUrl } } }`,
        { termYear },
      ),
      authFetch(`query { officerRoles { name sortOrder } }`),
    ])
      .then(([posResult, rolesResult]) => {
        if (posResult.data?.officerPositions) {
          setOfficers(posResult.data.officerPositions);
        }
        if (rolesResult.data?.officerRoles) {
          setRoles(rolesResult.data.officerRoles);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Club Officers</h1>
        <p className="text-gray-500 text-center py-12">Loading officers...</p>
      </div>
    );
  }

  // Sort by role sort order from DB
  const roleOrder = new Map(roles.map(r => [r.name, r.sortOrder]));
  const sortedOfficers = [...officers].sort((a, b) => {
    const aIdx = roleOrder.get(a.position) ?? 999;
    const bIdx = roleOrder.get(b.position) ?? 999;
    return aIdx - bIdx;
  });

  const assignedOfficers = sortedOfficers.filter(o => o.holder);

  if (assignedOfficers.length === 0) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Club Officers</h1>
        <p className="text-gray-500 text-center py-12">Officer positions have not been assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Club Officers</h1>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {assignedOfficers.map((officer) => (
          <div key={officer.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-3 sm:gap-4">
              <MemberAvatar userId={officer.holderUserId} firstName={officer.holder!.firstName} lastName={officer.holder!.lastName} size="xl" />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                  {officer.holder!.firstName} {officer.holder!.lastName}
                </h3>
                <p className="text-primary-600 font-medium mb-2">
                  {officer.label}
                </p>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {officer.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
