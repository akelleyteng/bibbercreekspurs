import { Role, Visibility, ReactionType } from '../types';

// Mock Users
export const mockUsers = [
  {
    id: '1',
    email: 'admin@bibbercreekspurs4h.org',
    firstName: 'Admin',
    lastName: 'User',
    role: Role.ADMIN,
    profileImageUrl: 'https://ui-avatars.com/api/?name=Admin+User&background=22c55e&color=fff',
    bio: 'Club administrator and organizer',
    joinDate: new Date('2020-01-15'),
    isActive: true,
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    email: 'sarah.johnson@example.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: Role.OFFICER,
    profileImageUrl: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=3b82f6&color=fff',
    bio: 'Passionate about animal science and community service',
    joinDate: new Date('2021-03-20'),
    isActive: true,
    createdAt: new Date('2021-03-20'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    email: 'mike.chen@example.com',
    firstName: 'Mike',
    lastName: 'Chen',
    role: Role.MEMBER,
    profileImageUrl: 'https://ui-avatars.com/api/?name=Mike+Chen&background=8b5cf6&color=fff',
    bio: 'Love robotics and technology projects!',
    joinDate: new Date('2022-09-10'),
    isActive: true,
    createdAt: new Date('2022-09-10'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '4',
    email: 'emma.davis@example.com',
    firstName: 'Emma',
    lastName: 'Davis',
    role: Role.OFFICER,
    profileImageUrl: 'https://ui-avatars.com/api/?name=Emma+Davis&background=ec4899&color=fff',
    bio: 'Horse enthusiast and photography lover',
    joinDate: new Date('2021-06-15'),
    isActive: true,
    createdAt: new Date('2021-06-15'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '5',
    email: 'alex.martinez@example.com',
    firstName: 'Alex',
    lastName: 'Martinez',
    role: Role.MEMBER,
    profileImageUrl: 'https://ui-avatars.com/api/?name=Alex+Martinez&background=f59e0b&color=fff',
    bio: 'Gardening and sustainable agriculture projects',
    joinDate: new Date('2023-01-05'),
    isActive: true,
    createdAt: new Date('2023-01-05'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Mock Events
export const mockEvents = [
  {
    id: '1',
    title: 'County Fair Preparation Workshop',
    description: 'Get your projects ready for the upcoming county fair! We\'ll cover presentation skills, display setup, and last-minute preparations.',
    startTime: new Date('2026-03-15T14:00:00'),
    endTime: new Date('2026-03-15T16:00:00'),
    location: 'Community Center - Main Hall',
    visibility: Visibility.PUBLIC,
    eventType: 'internal' as const,
    creator: mockUsers[0],
    registrationCount: 23,
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-02-01'),
  },
  {
    id: '2',
    title: 'Animal Care Training',
    description: 'Members-only training session on proper animal care, health monitoring, and record keeping.',
    startTime: new Date('2026-03-20T10:00:00'),
    endTime: new Date('2026-03-20T12:00:00'),
    location: 'Johnson Farm, 123 Rural Route',
    visibility: Visibility.MEMBER_ONLY,
    eventType: 'internal' as const,
    creator: mockUsers[1],
    registrationCount: 15,
    createdAt: new Date('2026-02-05'),
    updatedAt: new Date('2026-02-05'),
  },
  {
    id: '3',
    title: 'State 4-H Conference 2026',
    description: 'Annual state conference with workshops, competitions, and networking. Registration required through the state 4-H website.',
    startTime: new Date('2026-04-10T09:00:00'),
    endTime: new Date('2026-04-12T17:00:00'),
    location: 'State Convention Center, Capital City',
    visibility: Visibility.PUBLIC,
    eventType: 'external' as const,
    externalRegistrationUrl: 'https://state4h.org/conference-2026',
    creator: mockUsers[3],
    registrationCount: 8,
    createdAt: new Date('2026-02-10'),
    updatedAt: new Date('2026-02-10'),
  },
];

// Mock Blog Posts
export const mockBlogPosts = [
  {
    id: '1',
    title: 'Reflections on Our First Year',
    slug: 'reflections-on-our-first-year',
    content: 'What an amazing year it has been! From learning new skills to making lasting friendships, 4-H has truly changed my life...',
    excerpt: 'A member shares their journey through their first year in 4-H.',
    author: mockUsers[2],
    visibility: Visibility.PUBLIC,
    featuredImageUrl: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=800',
    publishedAt: new Date('2026-02-01'),
    createdAt: new Date('2026-01-28'),
    updatedAt: new Date('2026-01-28'),
  },
  {
    id: '2',
    title: 'Tips for Successful Project Presentations',
    slug: 'tips-for-successful-project-presentations',
    content: 'Presenting your project can be nerve-wracking, but with these tips, you\'ll be confident and prepared...',
    excerpt: 'Learn how to ace your project presentations at the county fair.',
    author: mockUsers[1],
    visibility: Visibility.PUBLIC,
    featuredImageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800',
    publishedAt: new Date('2026-02-08'),
    createdAt: new Date('2026-02-07'),
    updatedAt: new Date('2026-02-07'),
  },
];

// Mock Social Posts
export const mockPosts = [
  {
    id: '1',
    author: mockUsers[1],
    content: 'So excited for the County Fair Preparation Workshop this weekend! Who else is coming? 🎉',
    visibility: Visibility.MEMBER_ONLY,
    comments: [
      {
        id: '1',
        postId: '1',
        author: mockUsers[2],
        content: 'I\'ll be there! Can\'t wait to get some tips on my presentation.',
        createdAt: new Date('2026-02-11T10:30:00'),
        updatedAt: new Date('2026-02-11T10:30:00'),
      },
      {
        id: '2',
        postId: '1',
        author: mockUsers[4],
        content: 'Count me in! This will be my first fair presentation.',
        createdAt: new Date('2026-02-11T11:15:00'),
        updatedAt: new Date('2026-02-11T11:15:00'),
      },
    ],
    reactions: [
      { reactionType: ReactionType.LIKE, count: 5 },
      { reactionType: ReactionType.HEART, count: 3 },
    ],
    createdAt: new Date('2026-02-11T09:00:00'),
    updatedAt: new Date('2026-02-11T09:00:00'),
  },
  {
    id: '2',
    author: mockUsers[4],
    content: 'Just finished planting my garden for my agriculture project! The tomatoes are already sprouting 🌱',
    visibility: Visibility.MEMBER_ONLY,
    comments: [],
    reactions: [
      { reactionType: ReactionType.LIKE, count: 8 },
      { reactionType: ReactionType.CELEBRATE, count: 4 },
    ],
    createdAt: new Date('2026-02-10T15:30:00'),
    updatedAt: new Date('2026-02-10T15:30:00'),
  },
];

// Mock Sponsors
export const mockSponsors = [
  {
    id: '1',
    name: 'Local Farm Supply',
    logoUrl: 'https://via.placeholder.com/200x100?text=Local+Farm+Supply',
    websiteUrl: 'https://example.com',
    description: 'Supporting youth agriculture since 1985',
    orderIndex: 1,
    isActive: true,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
  },
  {
    id: '2',
    name: 'Community Bank',
    logoUrl: 'https://via.placeholder.com/200x100?text=Community+Bank',
    websiteUrl: 'https://example.com',
    description: 'Proud supporter of local youth programs',
    orderIndex: 2,
    isActive: true,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
  },
];

// Mock Testimonials
export const mockTestimonials = [
  {
    id: '1',
    authorName: 'Jennifer Smith',
    authorRole: 'Parent',
    content: '4-H has been an amazing experience for my daughter. She has gained confidence, learned leadership skills, and made wonderful friends.',
    imageUrl: 'https://ui-avatars.com/api/?name=Jennifer+Smith&background=random',
    orderIndex: 1,
    isActive: true,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
  },
  {
    id: '2',
    authorName: 'David Thompson',
    authorRole: 'Alumni Member',
    content: 'The skills I learned in 4-H prepared me for college and my career. I\'m grateful for the opportunities and mentorship I received.',
    imageUrl: 'https://ui-avatars.com/api/?name=David+Thompson&background=random',
    orderIndex: 2,
    isActive: true,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
  },
];

// Mock Home Page Content
export const mockHomeContent = {
  mission: {
    title: 'Our Mission',
    content: 'Bibber Creek Spurs 4-H is a dedicated local chapter of the 4-H youth program, specializing in project horse. Our focus is on fostering a love for horses, teaching valuable horsemanship skills, and providing a platform for young horse enthusiasts to grow and develop. Join us in our passion for horses and the joy they bring to our lives. We also now have a horseless horse option, for youths who are interested in learning about and being around horses but don\'t own/lease a horse.',
    imageUrl: '/images/horsekiss.avif',
  },
  about: {
    title: 'Join Our Club',
    content: 'Our group has one club meeting per month, and an indoor/outdoor ride once a month depending on the weather. We also host and participate in many community and volunteer options. Contact us to learn more and to join the club - either as a youth member or as an adult volunteer. 4H - To Make the Best Better!',
  },
  activitiesImageUrl: '/images/clubride.avif',
};

// Mock current user (for authenticated views)
export const mockCurrentUser = mockUsers[0]; // Admin user for testing all features
