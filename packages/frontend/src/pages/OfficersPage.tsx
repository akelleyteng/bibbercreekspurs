import { useState, useEffect } from 'react';

interface OfficerHolder {
  firstName: string;
  lastName: string;
  holderType: string;
  profilePhotoUrl?: string;
}

interface OfficerData {
  id: string;
  position: string;
  label: string;
  description: string;
  holder?: OfficerHolder;
}

export default function OfficersPage() {
  const [officers, setOfficers] = useState<OfficerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';
    // Compute current term year (Oct-Sep)
    const now = new Date();
    const year = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
    const termYear = `${year}-${year + 1}`;

    fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($termYear: String!) { officerPositions(termYear: $termYear) { id position label description holder { firstName lastName holderType profilePhotoUrl } } }`,
        variables: { termYear },
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.data?.officerPositions) {
          setOfficers(result.data.officerPositions);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Club Officers</h1>
        <p className="text-gray-500 text-center py-12">Loading officers...</p>
      </div>
    );
  }

  // Define the canonical order of positions
  const POSITION_ORDER = [
    'PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'TREASURER',
    'SERGEANT_AT_ARMS', 'NEWS_REPORTER', 'RECREATION_LEADER', 'HISTORIAN',
  ];

  // Sort by canonical order, assigned first
  const sortedOfficers = [...officers].sort((a, b) => {
    const aIdx = POSITION_ORDER.indexOf(a.position);
    const bIdx = POSITION_ORDER.indexOf(b.position);
    return aIdx - bIdx;
  });

  const assignedOfficers = sortedOfficers.filter(o => o.holder);

  if (assignedOfficers.length === 0) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Club Officers</h1>
        <p className="text-gray-500 text-center py-12">Officer positions have not been assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Club Officers</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {assignedOfficers.map((officer) => (
          <div key={officer.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <img
                src={officer.holder!.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(officer.holder!.firstName + ' ' + officer.holder!.lastName)}&background=4f772d&color=fff&size=80`}
                alt={`${officer.holder!.firstName} ${officer.holder!.lastName}`}
                className="w-20 h-20 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
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
