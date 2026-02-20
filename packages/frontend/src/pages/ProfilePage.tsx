import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  PARENT: 'Parent',
  ADULT_LEADER: 'Adult Leader',
  YOUTH_MEMBER: 'Youth Member',
  ADMIN: 'Admin',
};

const TSHIRT_OPTIONS = [
  '',
  'Youth S',
  'Youth M',
  'Youth L',
  'Adult XS',
  'Adult S',
  'Adult M',
  'Adult L',
  'Adult XL',
  'Adult XXL',
];

interface LinkedFamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  profilePhotoUrl?: string;
}

interface FamilyData {
  linkedChildren: LinkedFamilyMember[];
  linkedParents: LinkedFamilyMember[];
}

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  horseName: string;
  project: string;
  birthday: string;
  tshirtSize: string;
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    role: '',
    horseName: '',
    project: '',
    birthday: '',
    tshirtSize: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [familyData, setFamilyData] = useState<FamilyData>({ linkedChildren: [], linkedParents: [] });
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [linkChildUserId, setLinkChildUserId] = useState('');
  const { user: authUser } = useAuth();

  const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

  const fetchProfileData = useCallback(async () => {
    if (!authUser) return;
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { me { id email firstName lastName role phone address horseName project birthday tshirtSize } }`,
      }),
    });
    const result = await res.json();
    if (result.data?.me) {
      const me = result.data.me;
      setFormData({
        firstName: me.firstName || '',
        lastName: me.lastName || '',
        email: me.email || '',
        phone: me.phone || '',
        address: me.address || '',
        role: me.role || '',
        horseName: me.horseName || '',
        project: me.project || '',
        birthday: me.birthday ? me.birthday.split('T')[0] : '',
        tshirtSize: me.tshirtSize || '',
      });
      setProfileLoaded(true);
    }
  }, [graphqlUrl, authUser]);

  const fetchFamilyData = useCallback(async () => {
    if (!authUser) return;
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { users { id firstName lastName email role profilePhotoUrl linkedChildren { id firstName lastName email role profilePhotoUrl } linkedParents { id firstName lastName email role profilePhotoUrl } } }`,
      }),
    });
    const result = await res.json();
    if (result.data?.users) {
      const me = result.data.users.find((u: any) => u.id === authUser.id);
      if (me) {
        setFamilyData({
          linkedChildren: me.linkedChildren || [],
          linkedParents: me.linkedParents || [],
        });
      }
      setAllUsers(result.data.users.map((u: any) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, role: u.role })));
    }
  }, [graphqlUrl, authUser]);

  useEffect(() => {
    fetchProfileData();
    fetchFamilyData();
  }, [fetchProfileData, fetchFamilyData]);

  const handleAddFamilyLink = async (childUserId: string) => {
    if (!childUserId || !authUser) return;
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation AddFamilyLink($parentUserId: String!, $childUserId: String!) {
          addFamilyLink(parentUserId: $parentUserId, childUserId: $childUserId) { id }
        }`,
        variables: { parentUserId: authUser.id, childUserId },
      }),
    });
    const result = await res.json();
    if (result.errors) {
      setMessage({ type: 'error', text: result.errors[0]?.message || 'Failed to link account' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setLinkChildUserId('');
    setMessage({ type: 'success', text: 'Youth account linked successfully!' });
    setTimeout(() => setMessage(null), 3000);
    fetchFamilyData();
  };

  const handleRemoveFamilyLink = async (childUserId: string) => {
    if (!authUser || !confirm('Remove this family link?')) return;
    const token = localStorage.getItem('token');
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation RemoveFamilyLink($parentUserId: String!, $childUserId: String!) {
          removeFamilyLink(parentUserId: $parentUserId, childUserId: $childUserId)
        }`,
        variables: { parentUserId: authUser.id, childUserId },
      }),
    });
    setMessage({ type: 'success', text: 'Family link removed.' });
    setTimeout(() => setMessage(null), 3000);
    fetchFamilyData();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: `mutation UpdateMyProfile($horseName: String, $project: String, $birthday: String, $tshirtSize: String) {
            updateMyProfile(horseName: $horseName, project: $project, birthday: $birthday, tshirtSize: $tshirtSize) {
              id horseName project birthday tshirtSize
            }
          }`,
          variables: {
            horseName: formData.horseName || null,
            project: formData.project || null,
            birthday: formData.birthday || null,
            tshirtSize: formData.tshirtSize || null,
          },
        }),
      });
      const result = await res.json();
      if (result.errors) {
        setMessage({ type: 'error', text: result.errors[0]?.message || 'Failed to update profile' });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match!' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters!' });
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: `mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
            changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
          }`,
          variables: {
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
          },
        }),
      });
      const result = await res.json();
      if (result.errors) {
        setMessage({ type: 'error', text: result.errors[0]?.message || 'Failed to change password' });
      } else {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setIsChangingPassword(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  if (!profileLoaded) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>
        <p className="text-gray-500 text-center py-12">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl" data-page="profile" data-version="1.0">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <p className="text-base font-medium text-gray-900 px-3 py-2">{formData.firstName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <p className="text-base font-medium text-gray-900 px-3 py-2">{formData.lastName}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="text-base font-medium text-gray-900 px-3 py-2">{formData.email}</p>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">4H Member Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horse Name</label>
                  <input
                    type="text"
                    name="horseName"
                    value={formData.horseName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Your horse's name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                  <input
                    type="text"
                    name="project"
                    value={formData.project}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Your 4H project"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
                  <input
                    type="date"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">T-Shirt Size</label>
                  <select
                    name="tshirtSize"
                    value={formData.tshirtSize}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {TSHIRT_OPTIONS.map(size => (
                      <option key={size} value={size}>
                        {size || '-- Select size --'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  fetchProfileData();
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">First Name</p>
                <p className="text-base font-medium text-gray-900">{formData.firstName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Name</p>
                <p className="text-base font-medium text-gray-900">{formData.lastName}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">Email Address</p>
              <p className="text-base font-medium text-gray-900">{formData.email}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Phone Number</p>
              <p className="text-base font-medium text-gray-900">{formData.phone || 'Not provided'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Role</p>
              <p className="text-base font-medium text-gray-900">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                  {ROLE_LABELS[formData.role] || formData.role}
                </span>
              </p>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">4H Member Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Horse Name</p>
                  <p className="text-base font-medium text-gray-900">{formData.horseName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Project</p>
                  <p className="text-base font-medium text-gray-900">{formData.project || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Birthday</p>
                  <p className="text-base font-medium text-gray-900">
                    {formData.birthday
                      ? new Date(formData.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">T-Shirt Size</p>
                  <p className="text-base font-medium text-gray-900">{formData.tshirtSize || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Family Section */}
      {authUser && (familyData.linkedChildren.length > 0 || familyData.linkedParents.length > 0 || authUser.role === 'PARENT' || authUser.role === 'ADULT_LEADER' || authUser.role === 'ADMIN') && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Family</h2>

          {familyData.linkedChildren.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Linked Youth Accounts</p>
              <div className="space-y-2">
                {familyData.linkedChildren.map(child => (
                  <div key={child.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img
                        src={child.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(child.firstName + ' ' + child.lastName)}&background=4f772d&color=fff&size=32`}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{child.firstName} {child.lastName}</p>
                        <p className="text-xs text-gray-500">{child.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFamilyLink(child.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Unlink
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {familyData.linkedParents.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Linked Parent Accounts</p>
              <div className="space-y-2">
                {familyData.linkedParents.map(parent => (
                  <div key={parent.id} className="flex items-center bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img
                        src={parent.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(parent.firstName + ' ' + parent.lastName)}&background=4f772d&color=fff&size=32`}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{parent.firstName} {parent.lastName}</p>
                        <p className="text-xs text-gray-500">{parent.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {authUser && (authUser.role === 'PARENT' || authUser.role === 'ADULT_LEADER' || authUser.role === 'ADMIN') && (
            <div className="flex items-center gap-2 mt-3">
              <select
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={linkChildUserId}
                onChange={e => setLinkChildUserId(e.target.value)}
              >
                <option value="">Link a youth account...</option>
                {allUsers
                  .filter(u => u.id !== authUser.id && !familyData.linkedChildren.some(c => c.id === u.id) && (u.role === 'YOUTH_MEMBER'))
                  .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                  .map(u => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
              </select>
              <button
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm whitespace-nowrap disabled:opacity-50"
                onClick={() => handleAddFamilyLink(linkChildUserId)}
                disabled={!linkChildUserId}
              >
                Link
              </button>
            </div>
          )}

          {familyData.linkedChildren.length === 0 && familyData.linkedParents.length === 0 && (
            <p className="text-sm text-gray-500">No family accounts linked yet.</p>
          )}
        </div>
      )}

      {/* Password Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Password & Security</h2>
            <p className="text-sm text-gray-600 mt-1">Keep your account secure with a strong password</p>
          </div>
          {!isChangingPassword && (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Change Password
            </button>
          )}
        </div>

        {isChangingPassword && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                minLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                minLength={8}
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Update Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
