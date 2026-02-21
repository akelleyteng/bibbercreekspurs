import { Visibility } from '@4hclub/shared';
import { format } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';

import BlogPostModal from '../components/BlogPostModal';

import SponsorModal from '../components/SponsorModal';
import TestimonialModal from '../components/TestimonialModal';
import { mockHomeContent, mockSponsors } from '../data/mockData';

interface OfficerRole {
  id: string;
  name: string;
  label: string;
  description: string;
  sortOrder: number;
}

interface OfficerData {
  id: string;
  position: string;
  termYear: string;
  holderUserId?: string;
  holderYouthMemberId?: string;
  holder?: { firstName: string; lastName: string; holderType: string; profilePhotoUrl?: string };
  label: string;
  description: string;
}

interface HolderOption {
  id: string;
  name: string;
  type: 'user' | 'youth';
}

interface AdminYouthMember {
  id: string;
  firstName: string;
  lastName: string;
  birthdate?: string;
  project?: string;
  horseNames?: string;
  userId?: string;
}

interface LinkedFamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  profilePhotoUrl?: string;
}

interface AdminMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  profilePhotoUrl?: string;
  lastLogin?: string;
  lastLoginDevice?: string;
  postCount: number;
  commentCount: number;
  blogPostCount: number;
  createdAt?: string;
  youthMembers?: AdminYouthMember[];
  linkedChildren?: LinkedFamilyMember[];
  linkedParents?: LinkedFamilyMember[];
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const ROLE_OPTIONS = [
  { value: 'PARENT', label: 'Parent' },
  { value: 'ADULT_LEADER', label: 'Adult Leader' },
  { value: 'YOUTH_MEMBER', label: 'Youth Member' },
  { value: 'ADMIN', label: 'Admin' },
];


interface TestimonialData {
  id: string;
  authorName: string;
  authorRole?: string;
  content: string;
  imageUrl?: string;
  isActive: boolean;
}

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  visibility: string;
  featuredImageUrl?: string;
  publishedAt?: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'home' | 'members' | 'blog' | 'sponsors' | 'testimonials' | 'officers'>('home');
  const [officers, setOfficers] = useState<OfficerData[]>([]);
  const [officerRoles, setOfficerRoles] = useState<OfficerRole[]>([]);
  const [termYear, setTermYear] = useState(() => {
    const now = new Date();
    const year = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}-${year + 1}`;
  });
  const [holderOptions, setHolderOptions] = useState<HolderOption[]>([]);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ name: '', label: '', description: '' });
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editRoleForm, setEditRoleForm] = useState({ label: '', description: '' });
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [editingBlogPostId, setEditingBlogPostId] = useState<string | null>(null);
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [editingTestimonialId, setEditingTestimonialId] = useState<string | null>(null);
  const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPostData[]>([]);
  const [adminMembers, setAdminMembers] = useState<AdminMember[]>([]);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<Partial<AdminMember>>({});
  const [memberSearch, setMemberSearch] = useState('');
  const [editingYouthId, setEditingYouthId] = useState<string | null>(null);
  const [youthForm, setYouthForm] = useState<Partial<AdminYouthMember>>({});
  const [addingYouthForMemberId, setAddingYouthForMemberId] = useState<string | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState<Partial<AdminMember>>({ role: 'PARENT' });
  const [resetPasswordForm, setResetPasswordForm] = useState<{ password: string; forceReset: boolean }>({ password: '', forceReset: true });
  const [linkChildUserId, setLinkChildUserId] = useState('');
  const [linkYouthToUserId, setLinkYouthToUserId] = useState('');
  const [pendingMembers, setPendingMembers] = useState<AdminMember[]>([]);
  const [decliningMemberId, setDecliningMemberId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [officerError, setOfficerError] = useState<string | null>(null);

  const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

  const fetchTestimonials = useCallback(async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { testimonials(activeOnly: false) { id authorName authorRole content imageUrl isActive } }`,
      }),
    });
    const result = await res.json();
    if (result.data?.testimonials) {
      setTestimonials(result.data.testimonials);
    }
  }, [graphqlUrl]);

  const fetchBlogPosts = useCallback(async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { blogPosts(publicOnly: false) { id title slug content excerpt visibility featuredImageUrl publishedAt author { id firstName lastName } } }`,
      }),
    });
    const result = await res.json();
    if (result.data?.blogPosts) {
      setBlogPosts(result.data.blogPosts);
    }
  }, [graphqlUrl]);

  const fetchOfficers = useCallback(async (year: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query($termYear: String!) { officerPositions(termYear: $termYear) { id position termYear holderUserId holderYouthMemberId holder { firstName lastName holderType profilePhotoUrl } label description } }`,
        variables: { termYear: year },
      }),
    });
    const result = await res.json();
    if (result.data?.officerPositions) {
      setOfficers(result.data.officerPositions);
    }
  }, [graphqlUrl]);

  const fetchOfficerRoles = useCallback(async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { officerRoles { id name label description sortOrder } }`,
      }),
    });
    const result = await res.json();
    if (result.data?.officerRoles) {
      setOfficerRoles(result.data.officerRoles);
    }
  }, [graphqlUrl]);

  const fetchHolderOptions = useCallback(async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { users { id firstName lastName } allYouthMembers { id firstName lastName } }`,
      }),
    });
    const result = await res.json();
    if (result.data) {
      const options: HolderOption[] = [];
      if (result.data.users) {
        for (const user of result.data.users) {
          options.push({ id: user.id, name: `${user.firstName} ${user.lastName}`, type: 'user' });
        }
      }
      if (result.data.allYouthMembers) {
        for (const ym of result.data.allYouthMembers) {
          options.push({ id: ym.id, name: `${ym.firstName} ${ym.lastName} (Youth)`, type: 'youth' });
        }
      }
      options.sort((a, b) => a.name.localeCompare(b.name));
      setHolderOptions(options);
    }
  }, [graphqlUrl]);

  const fetchMembers = useCallback(async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { users { id firstName lastName email role phone address emergencyContact emergencyPhone profilePhotoUrl lastLogin lastLoginDevice postCount commentCount blogPostCount youthMembers { id firstName lastName birthdate project horseNames userId } linkedChildren { id firstName lastName email role profilePhotoUrl } linkedParents { id firstName lastName email role profilePhotoUrl } } }`,
      }),
    });
    const result = await res.json();
    if (result.data?.users) {
      setAdminMembers(result.data.users);
    }
  }, [graphqlUrl]);

  const fetchPendingMembers = useCallback(async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { pendingUsers { id firstName lastName email role createdAt } }`,
      }),
    });
    const result = await res.json();
    if (result.data?.pendingUsers) {
      setPendingMembers(result.data.pendingUsers);
    }
  }, [graphqlUrl]);

  const handleApproveUser = async (id: string) => {
    const token = localStorage.getItem('token');
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation AdminApproveUser($id: String!) { adminApproveUser(id: $id) { id } }`,
        variables: { id },
      }),
    });
    fetchPendingMembers();
    fetchMembers();
  };

  const handleDeclineUser = async (id: string, reason: string) => {
    const token = localStorage.getItem('token');
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation AdminDeclineUser($id: String!, $reason: String) { adminDeclineUser(id: $id, reason: $reason) { id } }`,
        variables: { id, reason: reason || null },
      }),
    });
    setDecliningMemberId(null);
    setDeclineReason('');
    fetchPendingMembers();
  };

  useEffect(() => {
    fetchTestimonials();
    fetchBlogPosts();
    fetchOfficers(termYear);
    fetchOfficerRoles();
    fetchHolderOptions();
    fetchMembers();
    fetchPendingMembers();
  }, [fetchTestimonials, fetchBlogPosts, fetchOfficers, fetchOfficerRoles, fetchHolderOptions, fetchMembers, fetchPendingMembers, termYear]);

  // Sponsor handlers
  const handleCreateSponsor = (data: any) => {
    console.log('Creating sponsor:', data);
    alert('Sponsor added! (This is a prototype - no backend yet)');
  };

  const handleEditSponsor = (sponsorId: string) => {
    setEditingSponsorId(sponsorId);
    setIsSponsorModalOpen(true);
  };

  const handleSaveSponsor = (data: any) => {
    if (editingSponsorId) {
      console.log('Updating sponsor:', editingSponsorId, data);
      alert('Sponsor updated! (This is a prototype - no backend yet)');
    } else {
      handleCreateSponsor(data);
    }
    setEditingSponsorId(null);
  };

  const handleDeleteSponsor = (sponsorId: string) => {
    if (confirm('Are you sure you want to delete this sponsor?')) {
      console.log('Deleting sponsor:', sponsorId);
      alert('Sponsor deleted! (This is a prototype - no backend yet)');
    }
  };

  // Testimonial handlers
  const handleEditTestimonial = (testimonialId: string) => {
    setEditingTestimonialId(testimonialId);
    setIsTestimonialModalOpen(true);
  };

  const handleSaveTestimonial = async (data: any) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    if (editingTestimonialId) {
      await fetch(graphqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `mutation UpdateTestimonial($id: String!, $input: UpdateTestimonialInput!) {
            updateTestimonial(id: $id, input: $input) { id }
          }`,
          variables: {
            id: editingTestimonialId,
            input: {
              authorName: data.authorName,
              authorRole: data.authorRole || null,
              content: data.content,
              imageUrl: data.imageUrl || null,
            },
          },
        }),
      });
    } else {
      await fetch(graphqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `mutation CreateTestimonial($input: CreateTestimonialInput!) {
            createTestimonial(input: $input) { id }
          }`,
          variables: {
            input: {
              authorName: data.authorName,
              authorRole: data.authorRole || null,
              content: data.content,
              imageUrl: data.imageUrl || null,
            },
          },
        }),
      });
    }

    setEditingTestimonialId(null);
    fetchTestimonials();
  };

  const handleDeleteTestimonial = async (testimonialId: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;

    const token = localStorage.getItem('token');
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation DeleteTestimonial($id: String!) {
          deleteTestimonial(id: $id)
        }`,
        variables: { id: testimonialId },
      }),
    });

    fetchTestimonials();
  };

  // Officer handlers
  const handleSetOfficer = async (position: string, holderId: string, holderType: 'user' | 'youth') => {
    const token = localStorage.getItem('token');
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation SetOfficer($position: String!, $termYear: String!, $holderUserId: String, $holderYouthMemberId: String) {
          setOfficer(position: $position, termYear: $termYear, holderUserId: $holderUserId, holderYouthMemberId: $holderYouthMemberId) { id }
        }`,
        variables: {
          position,
          termYear,
          holderUserId: holderType === 'user' ? holderId : null,
          holderYouthMemberId: holderType === 'youth' ? holderId : null,
        },
      }),
    });
    fetchOfficers(termYear);
  };

  const handleRemoveOfficer = async (position: string) => {
    if (!confirm('Remove this officer assignment?')) return;
    const token = localStorage.getItem('token');
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation RemoveOfficer($position: String!, $termYear: String!) {
          removeOfficer(position: $position, termYear: $termYear)
        }`,
        variables: { position, termYear },
      }),
    });
    fetchOfficers(termYear);
  };

  // Role management handlers
  const handleCreateRole = async () => {
    if (!newRoleForm.name || !newRoleForm.label) return;
    setOfficerError(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: `mutation CreateOfficerRole($name: String!, $label: String!, $description: String!, $sortOrder: Int!) {
            createOfficerRole(name: $name, label: $label, description: $description, sortOrder: $sortOrder) { id }
          }`,
          variables: {
            name: newRoleForm.name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
            label: newRoleForm.label,
            description: newRoleForm.description,
            sortOrder: officerRoles.length + 1,
          },
        }),
      });
      const result = await res.json();
      if (result.errors?.length) {
        setOfficerError(result.errors[0].message);
        return;
      }
      setIsAddingRole(false);
      setNewRoleForm({ name: '', label: '', description: '' });
      fetchOfficerRoles();
    } catch {
      setOfficerError('Network error — please try again.');
    }
  };

  const handleUpdateRole = async (roleId: string) => {
    setOfficerError(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: `mutation UpdateOfficerRole($id: String!, $label: String, $description: String) {
            updateOfficerRole(id: $id, label: $label, description: $description) { id }
          }`,
          variables: {
            id: roleId,
            label: editRoleForm.label,
            description: editRoleForm.description,
          },
        }),
      });
      const result = await res.json();
      if (result.errors?.length) {
        setOfficerError(result.errors[0].message);
        return;
      }
      setEditingRoleId(null);
      fetchOfficerRoles();
    } catch {
      setOfficerError('Network error — please try again.');
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    const hasAssignments = officers.some(o => o.position === roleName);
    const msg = hasAssignments
      ? `This role has assignments in the current term. Deleting it will remove all assignments across all terms. Continue?`
      : `Delete this officer role? This cannot be undone.`;
    if (!confirm(msg)) return;
    setOfficerError(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: `mutation DeleteOfficerRole($id: String!) { deleteOfficerRole(id: $id) }`,
          variables: { id: roleId },
        }),
      });
      const result = await res.json();
      if (result.errors?.length) {
        setOfficerError(result.errors[0].message);
        return;
      }
      fetchOfficerRoles();
      fetchOfficers(termYear);
    } catch {
      setOfficerError('Network error — please try again.');
    }
  };

  // Member handlers
  const handleEditMember = (member: AdminMember) => {
    setEditingMemberId(member.id);
    setMemberForm({ ...member });
    setEditingYouthId(null);
    setAddingYouthForMemberId(null);
    setResetPasswordForm({ password: '', forceReset: true });
  };

  const handleCancelEditMember = () => {
    setEditingMemberId(null);
    setMemberForm({});
    setEditingYouthId(null);
    setYouthForm({});
    setAddingYouthForMemberId(null);
    setResetPasswordForm({ password: '', forceReset: true });
  };

  const handleSaveMember = async () => {
    if (!editingMemberId || !memberForm) return;
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation AdminUpdateUser($id: String!, $firstName: String, $lastName: String, $email: String, $role: String, $phone: String, $address: String, $emergencyContact: String, $emergencyPhone: String) {
          adminUpdateUser(id: $id, firstName: $firstName, lastName: $lastName, email: $email, role: $role, phone: $phone, address: $address, emergencyContact: $emergencyContact, emergencyPhone: $emergencyPhone) { id }
        }`,
        variables: {
          id: editingMemberId,
          firstName: memberForm.firstName,
          lastName: memberForm.lastName,
          email: memberForm.email,
          role: memberForm.role,
          phone: memberForm.phone || '',
          address: memberForm.address || '',
          emergencyContact: memberForm.emergencyContact || '',
          emergencyPhone: memberForm.emergencyPhone || '',
        },
      }),
    });
    const result = await res.json();
    if (result.errors) {
      alert(`Error: ${result.errors[0]?.message || 'Unknown error'}`);
      return;
    }
    setEditingMemberId(null);
    setMemberForm({});
    fetchMembers();
    fetchHolderOptions();
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;
    const token = localStorage.getItem('token');
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation AdminDeleteUser($id: String!) { adminDeleteUser(id: $id) }`,
        variables: { id },
      }),
    });
    fetchMembers();
    fetchHolderOptions();
  };

  const handleCreateMember = async () => {
    if (!newMemberForm.firstName || !newMemberForm.lastName || !newMemberForm.email) {
      alert('First name, last name, and email are required.');
      return;
    }
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation AdminCreateUser($firstName: String!, $lastName: String!, $email: String!, $role: String, $phone: String, $address: String, $emergencyContact: String, $emergencyPhone: String) {
          adminCreateUser(firstName: $firstName, lastName: $lastName, email: $email, role: $role, phone: $phone, address: $address, emergencyContact: $emergencyContact, emergencyPhone: $emergencyPhone) { id }
        }`,
        variables: {
          firstName: newMemberForm.firstName,
          lastName: newMemberForm.lastName,
          email: newMemberForm.email,
          role: newMemberForm.role || 'PARENT',
          phone: newMemberForm.phone || null,
          address: newMemberForm.address || null,
          emergencyContact: newMemberForm.emergencyContact || null,
          emergencyPhone: newMemberForm.emergencyPhone || null,
        },
      }),
    });
    const result = await res.json();
    if (result.errors) {
      alert(`Error: ${result.errors[0]?.message || 'Unknown error'}`);
      return;
    }
    setIsAddingMember(false);
    setNewMemberForm({ role: 'PARENT' });
    fetchMembers();
    fetchHolderOptions();
  };

  const handleSaveYouth = async (parentUserId: string) => {
    const token = localStorage.getItem('token');
    const isNew = addingYouthForMemberId === parentUserId;

    if (isNew) {
      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: `mutation AdminCreateYouthMember($parentUserId: String!, $firstName: String!, $lastName: String!, $birthdate: String, $project: String, $horseNames: String) {
            adminCreateYouthMember(parentUserId: $parentUserId, firstName: $firstName, lastName: $lastName, birthdate: $birthdate, project: $project, horseNames: $horseNames) { id }
          }`,
          variables: {
            parentUserId,
            firstName: youthForm.firstName || '',
            lastName: youthForm.lastName || '',
            birthdate: youthForm.birthdate || null,
            project: youthForm.project || null,
            horseNames: youthForm.horseNames || null,
          },
        }),
      });
      const result = await res.json();
      if (result.errors) {
        alert(`Error: ${result.errors[0]?.message || 'Unknown error'}`);
        return;
      }
    } else if (editingYouthId) {
      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: `mutation AdminUpdateYouthMember($id: String!, $firstName: String, $lastName: String, $birthdate: String, $project: String, $horseNames: String) {
            adminUpdateYouthMember(id: $id, firstName: $firstName, lastName: $lastName, birthdate: $birthdate, project: $project, horseNames: $horseNames) { id }
          }`,
          variables: {
            id: editingYouthId,
            firstName: youthForm.firstName,
            lastName: youthForm.lastName,
            birthdate: youthForm.birthdate || null,
            project: youthForm.project || null,
            horseNames: youthForm.horseNames || null,
          },
        }),
      });
      const result = await res.json();
      if (result.errors) {
        alert(`Error: ${result.errors[0]?.message || 'Unknown error'}`);
        return;
      }
    }
    setEditingYouthId(null);
    setAddingYouthForMemberId(null);
    setYouthForm({});
    fetchMembers();
    fetchHolderOptions();
  };

  const handleDeleteYouth = async (id: string, name: string) => {
    if (!confirm(`Remove youth member ${name}?`)) return;
    const token = localStorage.getItem('token');
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation AdminDeleteYouthMember($id: String!) { adminDeleteYouthMember(id: $id) }`,
        variables: { id },
      }),
    });
    fetchMembers();
    fetchHolderOptions();
  };

  const handleResetPassword = async (userId: string) => {
    if (!resetPasswordForm.password) {
      alert('Please enter a new password.');
      return;
    }
    if (resetPasswordForm.password.length < 8) {
      alert('Password must be at least 8 characters.');
      return;
    }
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation AdminResetPassword($id: String!, $newPassword: String!, $forceResetOnLogin: Boolean!) {
          adminResetPassword(id: $id, newPassword: $newPassword, forceResetOnLogin: $forceResetOnLogin)
        }`,
        variables: {
          id: userId,
          newPassword: resetPasswordForm.password,
          forceResetOnLogin: resetPasswordForm.forceReset,
        },
      }),
    });
    const result = await res.json();
    if (result.errors) {
      alert(`Error: ${result.errors[0]?.message || 'Unknown error'}`);
      return;
    }
    alert('Password has been reset successfully.');
    setResetPasswordForm({ password: '', forceReset: true });
  };

  // Family link handlers
  const handleAddFamilyLink = async (parentUserId: string, childUserId: string) => {
    if (!childUserId) return;
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
        variables: { parentUserId, childUserId },
      }),
    });
    const result = await res.json();
    if (result.errors) {
      alert(`Error: ${result.errors[0]?.message || 'Unknown error'}`);
      return;
    }
    setLinkChildUserId('');
    fetchMembers();
  };

  const handleRemoveFamilyLink = async (parentUserId: string, childUserId: string) => {
    if (!confirm('Remove this family link?')) return;
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
        variables: { parentUserId, childUserId },
      }),
    });
    fetchMembers();
  };

  const handleLinkYouthToUser = async (youthMemberId: string, userId: string) => {
    if (!userId) return;
    const token = localStorage.getItem('token');
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation LinkYouthMemberToUser($youthMemberId: String!, $userId: String!) {
          linkYouthMemberToUser(youthMemberId: $youthMemberId, userId: $userId)
        }`,
        variables: { youthMemberId, userId },
      }),
    });
    const result = await res.json();
    if (result.errors) {
      alert(`Error: ${result.errors[0]?.message || 'Unknown error'}`);
      return;
    }
    setLinkYouthToUserId('');
    fetchMembers();
  };

  const handleUnlinkYouthFromUser = async (youthMemberId: string) => {
    if (!confirm('Unlink this youth member from their user account?')) return;
    const token = localStorage.getItem('token');
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation UnlinkYouthMemberFromUser($youthMemberId: String!) {
          unlinkYouthMemberFromUser(youthMemberId: $youthMemberId)
        }`,
        variables: { youthMemberId },
      }),
    });
    fetchMembers();
  };

  // Blog handlers
  const handleEditBlogPost = (postId: string) => {
    setEditingBlogPostId(postId);
    setIsBlogModalOpen(true);
  };

  const handleSaveBlogPost = async (data: any) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    if (editingBlogPostId) {
      await fetch(graphqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `mutation UpdateBlogPost($id: String!, $input: UpdateBlogPostInput!) {
            updateBlogPost(id: $id, input: $input) { id }
          }`,
          variables: {
            id: editingBlogPostId,
            input: {
              title: data.title,
              content: data.content,
              excerpt: data.excerpt || null,
              visibility: data.visibility,
              featuredImageUrl: data.featuredImageUrl || null,
              publishedAt: data.publishedAt || null,
            },
          },
        }),
      });
    } else {
      await fetch(graphqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `mutation CreateBlogPost($input: CreateBlogPostInput!) {
            createBlogPost(input: $input) { id }
          }`,
          variables: {
            input: {
              title: data.title,
              content: data.content,
              excerpt: data.excerpt || null,
              visibility: data.visibility,
              featuredImageUrl: data.featuredImageUrl || null,
              publishedAt: data.publishedAt || null,
            },
          },
        }),
      });
    }

    setEditingBlogPostId(null);
    fetchBlogPosts();
  };

  const handleDeleteBlogPost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;

    const token = localStorage.getItem('token');
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `mutation DeleteBlogPost($id: String!) {
          deleteBlogPost(id: $id)
        }`,
        variables: { id: postId },
      }),
    });

    fetchBlogPosts();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Panel</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {['home', 'members', 'blog', 'sponsors', 'testimonials', 'officers'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Home Content */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Mission Section</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <input
                  type="text"
                  className="input mb-3"
                  placeholder="Title"
                  defaultValue={mockHomeContent.mission.title}
                />
                <textarea
                  className="input"
                  rows={6}
                  placeholder="Mission content"
                  defaultValue={mockHomeContent.mission.content}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mission Image
                </label>
                <div className="mb-3">
                  <img
                    src={mockHomeContent.mission.imageUrl}
                    alt="Mission section preview"
                    className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                  />
                </div>
                <input
                  type="text"
                  className="input mb-2"
                  placeholder="Image URL"
                  defaultValue={mockHomeContent.mission.imageUrl}
                />
                <div className="flex gap-2">
                  <label className="btn-secondary text-sm cursor-pointer flex-1 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          alert('In production, this would upload to cloud storage. For now, use the Image URL field above.');
                        }
                      }}
                    />
                    📁 Upload Image
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Upload a new image or paste an image URL above
                </p>
              </div>
            </div>
            <button className="btn-primary mt-4">Save Changes</button>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">About / Join Section</h3>
            <input
              type="text"
              className="input mb-3"
              placeholder="Title"
              defaultValue={mockHomeContent.about.title}
            />
            <textarea
              className="input"
              rows={4}
              placeholder="Content"
              defaultValue={mockHomeContent.about.content}
            />
            <button className="btn-primary mt-4">Save Changes</button>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Activities Section Image</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Preview
                </label>
                <img
                  src={mockHomeContent.activitiesImageUrl}
                  alt="Activities section preview"
                  className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL
                </label>
                <input
                  type="text"
                  className="input mb-2"
                  placeholder="Image URL"
                  defaultValue={mockHomeContent.activitiesImageUrl}
                />
                <div className="flex gap-2 mb-4">
                  <label className="btn-secondary text-sm cursor-pointer flex-1 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          alert('In production, this would upload to cloud storage. For now, use the Image URL field above.');
                        }
                      }}
                    />
                    📁 Upload Image
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  This image appears in the "Hands-On Learning" section on the home page
                </p>
              </div>
            </div>
            <button className="btn-primary mt-4">Save Changes</button>
          </div>
        </div>
      )}

      {/* Members */}
      {activeTab === 'members' && (
        <div>
          {/* Pending Approval Section */}
          {pendingMembers.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-amber-700">
                Pending Approval ({pendingMembers.length})
              </h3>
              <div className="space-y-3">
                {pendingMembers.map(member => (
                  <div key={member.id} className="card border-2 border-amber-200 bg-amber-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {member.firstName} {member.lastName}
                        </h4>
                        <p className="text-sm text-gray-600">{member.email}</p>
                        <span className="text-xs text-gray-500">
                          {ROLE_OPTIONS.find(r => r.value === member.role)?.label || member.role} &middot;
                          Registered {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {decliningMemberId === member.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Reason (optional)"
                              className="input text-sm w-48"
                              value={declineReason}
                              onChange={e => setDeclineReason(e.target.value)}
                            />
                            <button
                              className="btn-secondary text-sm text-red-600"
                              onClick={() => handleDeclineUser(member.id, declineReason)}
                            >
                              Confirm Decline
                            </button>
                            <button
                              className="btn-secondary text-sm"
                              onClick={() => { setDecliningMemberId(null); setDeclineReason(''); }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              className="btn-primary text-sm"
                              onClick={() => handleApproveUser(member.id)}
                            >
                              Approve
                            </button>
                            <button
                              className="btn-secondary text-sm text-red-600"
                              onClick={() => setDecliningMemberId(member.id)}
                            >
                              Decline
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Manage Members</h3>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search members..."
                className="input w-64"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
              <button onClick={() => { setIsAddingMember(true); setNewMemberForm({ role: 'PARENT' }); }} className="btn-primary whitespace-nowrap">
                + Add Member
              </button>
            </div>
          </div>

          {isAddingMember && (
            <div className="card mb-6 border-2 border-primary-200">
              <h4 className="font-semibold text-gray-900 mb-4">New Member</h4>
              <p className="text-sm text-gray-500 mb-4">The member will be created with a temporary password and prompted to change it on first login.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                  <input className="input" value={newMemberForm.firstName || ''} onChange={e => setNewMemberForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                  <input className="input" value={newMemberForm.lastName || ''} onChange={e => setNewMemberForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                  <input className="input" type="email" value={newMemberForm.email || ''} onChange={e => setNewMemberForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                  <select className="input" value={newMemberForm.role || 'PARENT'} onChange={e => setNewMemberForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input className="input" value={newMemberForm.phone || ''} onChange={e => setNewMemberForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                  <input className="input" value={newMemberForm.address || ''} onChange={e => setNewMemberForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Emergency Contact</label>
                  <input className="input" value={newMemberForm.emergencyContact || ''} onChange={e => setNewMemberForm(f => ({ ...f, emergencyContact: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Emergency Phone</label>
                  <input className="input" value={newMemberForm.emergencyPhone || ''} onChange={e => setNewMemberForm(f => ({ ...f, emergencyPhone: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary" onClick={handleCreateMember}>Create Member</button>
                <button className="btn-secondary" onClick={() => { setIsAddingMember(false); setNewMemberForm({ role: 'PARENT' }); }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {adminMembers
              .filter(m =>
                !memberSearch ||
                `${m.firstName} ${m.lastName}`.toLowerCase().includes(memberSearch.toLowerCase()) ||
                m.email.toLowerCase().includes(memberSearch.toLowerCase())
              )
              .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
              .map((member) => {
                const isEditing = editingMemberId === member.id;
                return (
                  <div key={member.id} className="card">
                    {!isEditing ? (
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <img
                            src={member.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.firstName + ' ' + member.lastName)}&background=4f772d&color=fff&size=48`}
                            alt=""
                            className="w-12 h-12 rounded-full flex-shrink-0"
                          />
                          <div>
                            <h4 className="font-semibold text-gray-900">{member.firstName} {member.lastName}</h4>
                            <p className="text-sm text-gray-500">{member.email}</p>
                            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded font-medium ${
                              member.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                              member.role === 'ADULT_LEADER' ? 'bg-purple-100 text-purple-800' :
                              member.role === 'YOUTH_MEMBER' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {ROLE_OPTIONS.find(r => r.value === member.role)?.label || member.role}
                            </span>
                            {member.phone && <p className="text-sm text-gray-600 mt-1">{member.phone}</p>}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                              <span title={member.lastLogin ? format(new Date(member.lastLogin), 'MMM d, yyyy h:mm a') : undefined}>
                                Last login: {member.lastLogin ? timeAgo(member.lastLogin) : 'Never'}
                              </span>
                              {member.lastLoginDevice && <span>{member.lastLoginDevice}</span>}
                              <span>{member.postCount} posts · {member.commentCount} comments · {member.blogPostCount} blog articles</span>
                            </div>
                            {member.youthMembers && member.youthMembers.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-500 uppercase">Youth Members:</p>
                                {member.youthMembers.map(ym => (
                                  <span key={ym.id} className="inline-block text-sm text-gray-700 mr-3">{ym.firstName} {ym.lastName}</span>
                                ))}
                              </div>
                            )}
                            {member.linkedChildren && member.linkedChildren.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-500 uppercase">Linked Children:</p>
                                {member.linkedChildren.map(c => (
                                  <span key={c.id} className="inline-block text-sm text-gray-700 mr-3">{c.firstName} {c.lastName}</span>
                                ))}
                              </div>
                            )}
                            {member.linkedParents && member.linkedParents.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-500 uppercase">Linked Parents:</p>
                                {member.linkedParents.map(p => (
                                  <span key={p.id} className="inline-block text-sm text-gray-700 mr-3">{p.firstName} {p.lastName}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button onClick={() => handleEditMember(member)} className="btn-secondary text-sm">Edit</button>
                          <button onClick={() => handleDeleteMember(member.id, `${member.firstName} ${member.lastName}`)} className="btn-secondary text-sm text-red-600">Delete</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                            <input className="input" value={memberForm.firstName || ''} onChange={e => setMemberForm(f => ({ ...f, firstName: e.target.value }))} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                            <input className="input" value={memberForm.lastName || ''} onChange={e => setMemberForm(f => ({ ...f, lastName: e.target.value }))} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                            <input className="input" type="email" value={memberForm.email || ''} onChange={e => setMemberForm(f => ({ ...f, email: e.target.value }))} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                            <select className="input" value={memberForm.role || ''} onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))}>
                              {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                            <input className="input" value={memberForm.phone || ''} onChange={e => setMemberForm(f => ({ ...f, phone: e.target.value }))} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                            <input className="input" value={memberForm.address || ''} onChange={e => setMemberForm(f => ({ ...f, address: e.target.value }))} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Emergency Contact</label>
                            <input className="input" value={memberForm.emergencyContact || ''} onChange={e => setMemberForm(f => ({ ...f, emergencyContact: e.target.value }))} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Emergency Phone</label>
                            <input className="input" value={memberForm.emergencyPhone || ''} onChange={e => setMemberForm(f => ({ ...f, emergencyPhone: e.target.value }))} />
                          </div>
                        </div>

                        {/* Youth Members section */}
                        <div className="border-t pt-4 mt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-semibold text-gray-700">Youth Members</h5>
                            {addingYouthForMemberId !== member.id && (
                              <button
                                className="text-sm text-primary-600 hover:text-primary-700"
                                onClick={() => {
                                  setAddingYouthForMemberId(member.id);
                                  setEditingYouthId(null);
                                  setYouthForm({});
                                }}
                              >
                                + Add Youth Member
                              </button>
                            )}
                          </div>
                          {member.youthMembers?.map(ym => (
                            <div key={ym.id} className="mb-3">
                              {editingYouthId === ym.id ? (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                                      <input className="input text-sm" value={youthForm.firstName || ''} onChange={e => setYouthForm(f => ({ ...f, firstName: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                                      <input className="input text-sm" value={youthForm.lastName || ''} onChange={e => setYouthForm(f => ({ ...f, lastName: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Birthdate</label>
                                      <input className="input text-sm" type="date" value={youthForm.birthdate || ''} onChange={e => setYouthForm(f => ({ ...f, birthdate: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
                                      <input className="input text-sm" value={youthForm.project || ''} onChange={e => setYouthForm(f => ({ ...f, project: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Horse Names</label>
                                      <input className="input text-sm" value={youthForm.horseNames || ''} onChange={e => setYouthForm(f => ({ ...f, horseNames: e.target.value }))} />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button className="btn-primary text-sm" onClick={() => handleSaveYouth(member.id)}>Save</button>
                                    <button className="btn-secondary text-sm" onClick={() => { setEditingYouthId(null); setYouthForm({}); }}>Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                  <span className="text-sm text-gray-800">{ym.firstName} {ym.lastName}</span>
                                  <div className="flex gap-2">
                                    <button
                                      className="text-xs text-primary-600 hover:underline"
                                      onClick={() => {
                                        setEditingYouthId(ym.id);
                                        setAddingYouthForMemberId(null);
                                        setYouthForm({
                                          firstName: ym.firstName,
                                          lastName: ym.lastName,
                                          birthdate: ym.birthdate ? ym.birthdate.split('T')[0] : '',
                                          project: ym.project || '',
                                          horseNames: ym.horseNames || '',
                                        });
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="text-xs text-red-600 hover:underline"
                                      onClick={() => handleDeleteYouth(ym.id, `${ym.firstName} ${ym.lastName}`)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {addingYouthForMemberId === member.id && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                                  <input className="input text-sm" value={youthForm.firstName || ''} onChange={e => setYouthForm(f => ({ ...f, firstName: e.target.value }))} />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                                  <input className="input text-sm" value={youthForm.lastName || ''} onChange={e => setYouthForm(f => ({ ...f, lastName: e.target.value }))} />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Birthdate</label>
                                  <input className="input text-sm" type="date" value={youthForm.birthdate || ''} onChange={e => setYouthForm(f => ({ ...f, birthdate: e.target.value }))} />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
                                  <input className="input text-sm" value={youthForm.project || ''} onChange={e => setYouthForm(f => ({ ...f, project: e.target.value }))} />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Horse Names</label>
                                  <input className="input text-sm" value={youthForm.horseNames || ''} onChange={e => setYouthForm(f => ({ ...f, horseNames: e.target.value }))} />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button className="btn-primary text-sm" onClick={() => handleSaveYouth(member.id)}>Add</button>
                                <button className="btn-secondary text-sm" onClick={() => { setAddingYouthForMemberId(null); setYouthForm({}); }}>Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Family Links */}
                        <div className="border-t pt-4 mt-4">
                          <h5 className="text-sm font-semibold text-gray-700 mb-3">Family Links</h5>

                          {/* Linked Children */}
                          {member.linkedChildren && member.linkedChildren.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Linked Child Accounts</p>
                              {member.linkedChildren.map(child => (
                                <div key={child.id} className="flex items-center justify-between bg-gray-50 p-2 rounded mb-1">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={child.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(child.firstName + ' ' + child.lastName)}&background=4f772d&color=fff&size=24`}
                                      alt=""
                                      className="w-6 h-6 rounded-full"
                                    />
                                    <span className="text-sm text-gray-800">{child.firstName} {child.lastName}</span>
                                    <span className="text-xs text-gray-500">({child.email})</span>
                                  </div>
                                  <button
                                    className="text-xs text-red-600 hover:underline"
                                    onClick={() => handleRemoveFamilyLink(member.id, child.id)}
                                  >
                                    Unlink
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Linked Parents */}
                          {member.linkedParents && member.linkedParents.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Linked Parent Accounts</p>
                              {member.linkedParents.map(parent => (
                                <div key={parent.id} className="flex items-center justify-between bg-gray-50 p-2 rounded mb-1">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={parent.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(parent.firstName + ' ' + parent.lastName)}&background=4f772d&color=fff&size=24`}
                                      alt=""
                                      className="w-6 h-6 rounded-full"
                                    />
                                    <span className="text-sm text-gray-800">{parent.firstName} {parent.lastName}</span>
                                    <span className="text-xs text-gray-500">({parent.email})</span>
                                  </div>
                                  <button
                                    className="text-xs text-red-600 hover:underline"
                                    onClick={() => handleRemoveFamilyLink(parent.id, member.id)}
                                  >
                                    Unlink
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Link a child account */}
                          <div className="flex items-center gap-2 mb-3">
                            <select
                              className="input text-sm flex-1"
                              value={linkChildUserId}
                              onChange={e => setLinkChildUserId(e.target.value)}
                            >
                              <option value="">Link a child account...</option>
                              {adminMembers
                                .filter(m => m.id !== member.id && !member.linkedChildren?.some(c => c.id === m.id))
                                .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                                .map(m => (
                                  <option key={m.id} value={m.id}>
                                    {m.firstName} {m.lastName} ({ROLE_OPTIONS.find(r => r.value === m.role)?.label || m.role})
                                  </option>
                                ))}
                            </select>
                            <button
                              className="btn-primary text-sm whitespace-nowrap"
                              onClick={() => handleAddFamilyLink(member.id, linkChildUserId)}
                              disabled={!linkChildUserId}
                            >
                              Link Child
                            </button>
                          </div>

                          {/* Youth member → account linking */}
                          {member.youthMembers && member.youthMembers.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Youth Member Account Links</p>
                              {member.youthMembers.map(ym => {
                                const linkedUser = ym.userId ? adminMembers.find(m => m.id === ym.userId) : null;
                                return (
                                  <div key={ym.id} className="flex items-center justify-between bg-blue-50 p-2 rounded mb-1">
                                    <span className="text-sm text-gray-800">{ym.firstName} {ym.lastName}</span>
                                    {linkedUser ? (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-600">Linked to: {linkedUser.firstName} {linkedUser.lastName}</span>
                                        <button
                                          className="text-xs text-red-600 hover:underline"
                                          onClick={() => handleUnlinkYouthFromUser(ym.id)}
                                        >
                                          Unlink
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <select
                                          className="input text-xs w-48"
                                          value={linkYouthToUserId}
                                          onChange={e => setLinkYouthToUserId(e.target.value)}
                                        >
                                          <option value="">Link to account...</option>
                                          {adminMembers
                                            .filter(m => m.id !== member.id)
                                            .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                                            .map(m => (
                                              <option key={m.id} value={m.id}>
                                                {m.firstName} {m.lastName}
                                              </option>
                                            ))}
                                        </select>
                                        <button
                                          className="text-xs text-primary-600 hover:underline whitespace-nowrap"
                                          onClick={() => handleLinkYouthToUser(ym.id, linkYouthToUserId)}
                                          disabled={!linkYouthToUserId}
                                        >
                                          Link
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Activity Tracking */}
                        <div className="border-t pt-4 mt-4">
                          <h5 className="text-sm font-semibold text-gray-700 mb-3">Activity</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                              <p className="text-2xl font-bold text-gray-900">{member.postCount}</p>
                              <p className="text-xs text-gray-500">Posts</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                              <p className="text-2xl font-bold text-gray-900">{member.commentCount}</p>
                              <p className="text-xs text-gray-500">Comments</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                              <p className="text-2xl font-bold text-gray-900">{member.blogPostCount}</p>
                              <p className="text-xs text-gray-500">Blog Articles</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                              <p className="text-sm font-semibold text-gray-900">{member.lastLogin ? timeAgo(member.lastLogin) : 'Never'}</p>
                              <p className="text-xs text-gray-500">Last Login</p>
                              {member.lastLoginDevice && <p className="text-xs text-gray-400 mt-0.5">{member.lastLoginDevice}</p>}
                            </div>
                          </div>
                        </div>

                        {/* Password Reset */}
                        <div className="border-t pt-4 mt-4">
                          <h5 className="text-sm font-semibold text-gray-700 mb-3">Reset Password</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
                              <input
                                className="input"
                                type="password"
                                placeholder="Enter new password"
                                value={resetPasswordForm.password}
                                onChange={e => setResetPasswordForm(f => ({ ...f, password: e.target.value }))}
                              />
                            </div>
                            <div className="flex items-end">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={resetPasswordForm.forceReset}
                                  onChange={e => setResetPasswordForm(f => ({ ...f, forceReset: e.target.checked }))}
                                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-gray-700">Require password change on next login</span>
                              </label>
                            </div>
                          </div>
                          <button
                            className="btn-secondary text-sm"
                            onClick={() => handleResetPassword(member.id)}
                          >
                            Reset Password
                          </button>
                        </div>

                        <div className="flex gap-2 mt-4 pt-4 border-t">
                          <button className="btn-primary" onClick={handleSaveMember}>Save Member</button>
                          <button className="btn-secondary" onClick={handleCancelEditMember}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
          {adminMembers.length === 0 && (
            <p className="text-gray-500 text-center py-8">No members found.</p>
          )}
        </div>
      )}

      {/* Blog */}
      {activeTab === 'blog' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Manage Blog Posts</h3>
            <button onClick={() => setIsBlogModalOpen(true)} className="btn-primary">
              + New Post
            </button>
          </div>
          {blogPosts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No blog posts yet. Create one above.</p>
          ) : (
            <div className="space-y-4">
              {blogPosts.map((post) => (
                <div key={post.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-lg">{post.title}</h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          post.publishedAt
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {post.publishedAt ? 'Published' : 'Draft'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          post.visibility === 'PUBLIC'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {post.visibility === 'PUBLIC' ? 'Public' : 'Members'}
                        </span>
                      </div>
                      {post.excerpt && (
                        <p className="text-sm text-gray-600 mb-2">{post.excerpt}</p>
                      )}
                      <div className="text-sm text-gray-500">
                        <span>By {post.author.firstName} {post.author.lastName}</span>
                        {post.publishedAt && (
                          <span className="ml-4">
                            Published {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                          </span>
                        )}
                        <span className="ml-4">Slug: /{post.slug}</span>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => handleEditBlogPost(post.id)}
                        className="btn-secondary text-sm whitespace-nowrap"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBlogPost(post.id)}
                        className="btn-secondary text-sm text-red-600 whitespace-nowrap"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sponsor Modal */}
      <SponsorModal
        isOpen={isSponsorModalOpen}
        onClose={() => {
          setIsSponsorModalOpen(false);
          setEditingSponsorId(null);
        }}
        onSave={handleSaveSponsor}
        mode={editingSponsorId ? 'edit' : 'create'}
      />

      {/* Testimonial Modal */}
      <TestimonialModal
        isOpen={isTestimonialModalOpen}
        onClose={() => {
          setIsTestimonialModalOpen(false);
          setEditingTestimonialId(null);
        }}
        onSave={handleSaveTestimonial}
        mode={editingTestimonialId ? 'edit' : 'create'}
        initialData={editingTestimonialId ? testimonials.find((t) => t.id === editingTestimonialId) : undefined}
      />

      {/* Blog Post Modal */}
      <BlogPostModal
        isOpen={isBlogModalOpen}
        onClose={() => {
          setIsBlogModalOpen(false);
          setEditingBlogPostId(null);
        }}
        onSave={handleSaveBlogPost}
        mode={editingBlogPostId ? 'edit' : 'create'}
        initialData={editingBlogPostId ? (() => {
          const bp = blogPosts.find((p) => p.id === editingBlogPostId);
          if (!bp) return undefined;
          // Format publishedAt as datetime-local string (YYYY-MM-DDTHH:mm)
          let publishedAt = '';
          if (bp.publishedAt) {
            try { publishedAt = format(new Date(bp.publishedAt), "yyyy-MM-dd'T'HH:mm"); } catch { /* ignore */ }
          }
          return {
            title: bp.title,
            content: bp.content,
            excerpt: bp.excerpt || '',
            visibility: bp.visibility as Visibility,
            featuredImageUrl: bp.featuredImageUrl || '',
            publishedAt,
          };
        })() : undefined}
      />

      {/* Sponsors */}
      {activeTab === 'sponsors' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Manage Sponsors</h3>
            <button onClick={() => setIsSponsorModalOpen(true)} className="btn-primary">
              + Add Sponsor
            </button>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {mockSponsors.map((sponsor) => (
              <div key={sponsor.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <img src={sponsor.logoUrl} alt={sponsor.name} className="h-12" />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditSponsor(sponsor.id)}
                      className="btn-secondary text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSponsor(sponsor.id)}
                      className="btn-secondary text-sm text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="font-semibold">{sponsor.name}</p>
                <p className="text-sm text-gray-600 mt-1">{sponsor.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Officers */}
      {activeTab === 'officers' && (
        <div>
          {/* Add Role Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Officer Roles</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Term Year:</label>
                  <select
                    className="input w-auto"
                    value={termYear}
                    onChange={(e) => {
                      setTermYear(e.target.value);
                      fetchOfficers(e.target.value);
                    }}
                  >
                    {(() => {
                      const now = new Date();
                      const currentYear = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
                      const years = [];
                      for (let y = currentYear + 1; y >= currentYear - 3; y--) {
                        years.push(`${y}-${y + 1}`);
                      }
                      return years.map(y => <option key={y} value={y}>{y}</option>);
                    })()}
                  </select>
                </div>
                {!isAddingRole && (
                  <button onClick={() => setIsAddingRole(true)} className="btn-primary text-sm">
                    + Add Role
                  </button>
                )}
              </div>
            </div>

            {isAddingRole && (
              <div className="card mb-4 border-2 border-primary-200">
                <h4 className="font-semibold mb-3">New Officer Role</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                    <input
                      className="input"
                      placeholder="e.g. Parliamentarian"
                      value={newRoleForm.label}
                      onChange={(e) => setNewRoleForm(f => ({
                        ...f,
                        label: e.target.value,
                        name: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
                      }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">Key: {newRoleForm.name || '...'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      className="input"
                      placeholder="What does this officer do?"
                      value={newRoleForm.description}
                      onChange={(e) => setNewRoleForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreateRole} className="btn-primary text-sm" disabled={!newRoleForm.label}>Save</button>
                  <button onClick={() => { setIsAddingRole(false); setNewRoleForm({ name: '', label: '', description: '' }); }} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            )}

            {officerError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {officerError}
              </div>
            )}
          </div>

          {/* Officer Assignment Cards */}
          <div className="space-y-4">
            {officerRoles.map((role) => {
              const assigned = officers.find(o => o.position === role.name);
              return (
                <div key={role.name} className="card">
                  {editingRoleId === role.id ? (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Edit Role</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                          <input
                            className="input"
                            value={editRoleForm.label}
                            onChange={(e) => setEditRoleForm(f => ({ ...f, label: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <input
                            className="input"
                            value={editRoleForm.description}
                            onChange={(e) => setEditRoleForm(f => ({ ...f, description: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateRole(role.id)} className="btn-primary text-sm">Save</button>
                        <button onClick={() => setEditingRoleId(null)} className="btn-secondary text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{role.label}</h4>
                      <p className="text-sm text-gray-500">{role.description}</p>
                      {assigned?.holder ? (
                        <div className="mt-2 flex items-center gap-2">
                          <img
                            src={assigned.holder.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(assigned.holder.firstName + ' ' + assigned.holder.lastName)}&background=4f772d&color=fff&size=32`}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                          <span className="text-sm font-medium text-gray-900">
                            {assigned.holder.firstName} {assigned.holder.lastName}
                          </span>
                          {assigned.holder.holderType === 'youth' && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Youth</span>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-400 italic">Vacant</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <select
                        className="input w-auto text-sm"
                        value=""
                        onChange={(e) => {
                          const [type, id] = e.target.value.split(':');
                          if (type && id) {
                            handleSetOfficer(role.name, id, type as 'user' | 'youth');
                          }
                        }}
                      >
                        <option value="">Assign...</option>
                        {holderOptions.map((opt) => (
                          <option key={`${opt.type}:${opt.id}`} value={`${opt.type}:${opt.id}`}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                      {assigned?.holder && (
                        <button
                          onClick={() => handleRemoveOfficer(role.name)}
                          className="btn-secondary text-sm text-red-600"
                        >
                          Remove
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingRoleId(role.id);
                          setEditRoleForm({ label: role.label, description: role.description });
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                        title="Edit role"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id, role.name)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                        title="Delete role"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Testimonials */}
      {activeTab === 'testimonials' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Manage Testimonials</h3>
            <button onClick={() => setIsTestimonialModalOpen(true)} className="btn-primary">
              + Add Testimonial
            </button>
          </div>
          {testimonials.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No testimonials yet. Add one above.</p>
          ) : (
            <div className="space-y-4">
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className={`card ${!testimonial.isActive ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      {testimonial.imageUrl && (
                        <img
                          src={testimonial.imageUrl}
                          alt={testimonial.authorName}
                          className="w-12 h-12 rounded-full mr-4"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{testimonial.authorName}</p>
                          {!testimonial.isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Hidden
                            </span>
                          )}
                        </div>
                        {testimonial.authorRole && (
                          <p className="text-sm text-gray-500">{testimonial.authorRole}</p>
                        )}
                        <p className="text-gray-700 mt-2 italic">"{testimonial.content}"</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditTestimonial(testimonial.id)}
                        className="btn-secondary text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTestimonial(testimonial.id)}
                        className="btn-secondary text-sm text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
