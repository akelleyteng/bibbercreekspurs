import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';
import MemberProfileFields, { MemberProfileData } from '../components/MemberProfileFields';

const ROLE_LABELS: Record<string, string> = {
  PARENT: 'Parent',
  ADULT_LEADER: 'Adult Leader',
  YOUTH_MEMBER: 'Youth Member',
  ADMIN: 'Admin',
};

const HORSE_EXP_LABELS: Record<string, string> = {
  none: 'No Experience',
  some: 'Some Experience',
  regular: 'Regular Rider',
  advanced: 'Advanced',
};

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

interface ProfileData extends MemberProfileData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    horseName: '',
    horseExperience: '',
    project: '',
    birthday: '',
    tshirtSize: '',
    profilePhotoUrl: '',
    horsePhotoUrl: '',
    avatarChoice: 'initials',
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

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchProfileData = useCallback(async () => {
    if (!authUser) return;
    const result = await authFetch(
      `query { me { id email firstName lastName role phone address emergencyContact emergencyPhone horseName horseExperience project birthday tshirtSize profilePhotoUrl horsePhotoUrl avatarChoice } }`
    );
    if (result.data?.me) {
      const me = result.data.me;
      setFormData({
        firstName: me.firstName || '',
        lastName: me.lastName || '',
        email: me.email || '',
        role: me.role || '',
        phone: me.phone || '',
        address: me.address || '',
        emergencyContact: me.emergencyContact || '',
        emergencyPhone: me.emergencyPhone || '',
        horseName: me.horseName || '',
        horseExperience: me.horseExperience || '',
        project: me.project || '',
        birthday: me.birthday ? me.birthday.split('T')[0] : '',
        tshirtSize: me.tshirtSize || '',
        profilePhotoUrl: me.profilePhotoUrl || '',
        horsePhotoUrl: me.horsePhotoUrl || '',
        avatarChoice: me.avatarChoice || 'initials',
      });
      setProfileLoaded(true);
    }
  }, [authUser]);

  const fetchFamilyData = useCallback(async () => {
    if (!authUser) return;
    const result = await authFetch(`query { users { id firstName lastName email role profilePhotoUrl linkedChildren { id firstName lastName email role profilePhotoUrl } linkedParents { id firstName lastName email role profilePhotoUrl } } }`);
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
  }, [authUser]);

  useEffect(() => {
    fetchProfileData();
    fetchFamilyData();
  }, [fetchProfileData, fetchFamilyData]);

  const handleAddFamilyLink = async (childUserId: string) => {
    if (!childUserId || !authUser) return;
    const result = await authFetch(
      `mutation AddFamilyLink($parentUserId: String!, $childUserId: String!) {
        addFamilyLink(parentUserId: $parentUserId, childUserId: $childUserId) { id }
      }`,
      { parentUserId: authUser.id, childUserId },
    );
    if (result.errors) {
      showMessage(result.errors[0]?.message || 'Failed to link account', 'error');
      return;
    }
    setLinkChildUserId('');
    showMessage('Youth account linked successfully!', 'success');
    fetchFamilyData();
  };

  const handleRemoveFamilyLink = async (childUserId: string) => {
    if (!authUser || !confirm('Remove this family link?')) return;
    await authFetch(
      `mutation RemoveFamilyLink($parentUserId: String!, $childUserId: String!) {
        removeFamilyLink(parentUserId: $parentUserId, childUserId: $childUserId)
      }`,
      { parentUserId: authUser.id, childUserId },
    );
    showMessage('Family link removed.', 'success');
    fetchFamilyData();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await authFetch(
        `mutation UpdateMyProfile($phone: String, $address: String, $emergencyContact: String, $emergencyPhone: String, $horseName: String, $horseExperience: String, $project: String, $birthday: String, $tshirtSize: String, $avatarChoice: String) {
          updateMyProfile(phone: $phone, address: $address, emergencyContact: $emergencyContact, emergencyPhone: $emergencyPhone, horseName: $horseName, horseExperience: $horseExperience, project: $project, birthday: $birthday, tshirtSize: $tshirtSize, avatarChoice: $avatarChoice) {
            id phone address emergencyContact emergencyPhone horseName horseExperience project birthday tshirtSize avatarChoice
          }
        }`,
        {
          phone: formData.phone || null,
          address: formData.address || null,
          emergencyContact: formData.emergencyContact || null,
          emergencyPhone: formData.emergencyPhone || null,
          horseName: formData.horseName || null,
          horseExperience: formData.horseExperience || null,
          project: formData.project || null,
          birthday: formData.birthday || null,
          tshirtSize: formData.tshirtSize || null,
          avatarChoice: formData.avatarChoice,
        },
      );
      if (result.errors) {
        showMessage(result.errors[0]?.message || 'Failed to update profile', 'error');
      } else {
        showMessage('Profile updated successfully!', 'success');
        setIsEditing(false);
      }
    } catch {
      showMessage('An error occurred. Please try again.', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('New passwords do not match!', 'error');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showMessage('Password must be at least 8 characters!', 'error');
      return;
    }

    try {
      const result = await authFetch(
        `mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
          changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
        }`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
      );
      if (result.errors) {
        showMessage(result.errors[0]?.message || 'Failed to change password', 'error');
      } else {
        showMessage('Password changed successfully!', 'success');
        setIsChangingPassword(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch {
      showMessage('An error occurred. Please try again.', 'error');
    }
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
            {/* Read-only identity fields */}
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

            {/* Shared editable fields */}
            <MemberProfileFields
              data={formData}
              onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
              onMessage={showMessage}
            />

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
              <p className="text-sm text-gray-600">Role</p>
              <p className="text-base font-medium text-gray-900">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                  {ROLE_LABELS[formData.role] || formData.role}
                </span>
              </p>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="text-base font-medium text-gray-900">{formData.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="text-base font-medium text-gray-900">{formData.address || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Emergency Contact</p>
                <p className="text-base font-medium text-gray-900">{formData.emergencyContact || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Emergency Phone</p>
                <p className="text-base font-medium text-gray-900">{formData.emergencyPhone || 'Not provided'}</p>
              </div>
            </div>

            {/* 4H Info */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">4H Member Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Horse Name</p>
                  <p className="text-base font-medium text-gray-900">{formData.horseName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Horse Experience</p>
                  <p className="text-base font-medium text-gray-900">{HORSE_EXP_LABELS[formData.horseExperience || ''] || formData.horseExperience || 'Not provided'}</p>
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

            {/* Photos & Avatar (view mode) */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Photos & Avatar</h3>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Profile</p>
                  {formData.profilePhotoUrl ? (
                    <img src={formData.profilePhotoUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">None</div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Horse</p>
                  {formData.horsePhotoUrl ? (
                    <img src={formData.horsePhotoUrl} alt="Horse" className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">None</div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Avatar</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{formData.avatarChoice || 'Initials'}</p>
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
