# GraphQL Architecture

## Overview

The 4H Club website uses **GraphQL** instead of REST to provide better frontend/backend separation and more efficient data fetching.

## Why GraphQL?

**Advantages for this project:**
- ✅ **Single endpoint** (`/graphql`) instead of many REST endpoints
- ✅ **Strong typing** - GraphQL schema provides automatic type checking
- ✅ **Efficient data fetching** - Frontend requests exactly what it needs (no over/under-fetching)
- ✅ **Better developer experience** - GraphQL Playground for testing queries
- ✅ **Future-proof** - Easy to add subscriptions for real-time updates (social feed, notifications)
- ✅ **Self-documenting** - GraphQL introspection provides automatic API docs

## Architecture Stack

### Backend
- **Apollo Server v4** - Modern GraphQL server
- **TypeGraphQL** - TypeScript-first schema definition with decorators
- **DataLoader** - Batching and caching for efficient database queries
- **Express** - HTTP server (Apollo Server integrates with Express)

### Frontend
- **Apollo Client** - GraphQL client with caching and state management
- **React Hooks** - `useQuery`, `useMutation`, `useSubscription` (future)
- **Code Generation** - GraphQL Code Generator for type-safe queries

## GraphQL Schema Structure

### Queries (Read Operations)

```graphql
type Query {
  # Authentication
  me: User

  # Users
  users(page: Int, pageSize: Int, search: String): UserConnection!
  user(id: ID!): User
  officers: [User!]!

  # Social Feed
  posts(page: Int, pageSize: Int): PostConnection!
  post(id: ID!): Post

  # Events
  events(page: Int, pageSize: Int, visibility: Visibility): EventConnection!
  event(id: ID!): Event
  eventAttendees(eventId: ID!): [User!]!

  # Blog
  blogPosts(page: Int, pageSize: Int, visibility: Visibility): BlogPostConnection!
  blogPost(slug: String!): BlogPost

  # Content
  homeContent: [HomePageContent!]!
  sponsors: [Sponsor!]!
  testimonials: [Testimonial!]!

  # Integrations
  googleCalendar: CalendarData
  googleDriveFolder: [DriveFile!]!

  # Notifications
  notifications(unreadOnly: Boolean): [Notification!]!
}
```

### Mutations (Write Operations)

```graphql
type Mutation {
  # Authentication
  register(input: RegisterInput!): AuthPayload!
  login(input: LoginInput!): AuthPayload!
  refreshToken(refreshToken: String!): TokenPayload!
  forgotPassword(email: String!): Boolean!
  resetPassword(input: ResetPasswordInput!): Boolean!

  # User Management
  updateProfile(input: UpdateProfileInput!): User!
  changeUserRole(userId: ID!, role: Role!): User! @requireRole(role: ADMIN)

  # Social Feed
  createPost(input: CreatePostInput!): Post!
  updatePost(id: ID!, input: UpdatePostInput!): Post!
  deletePost(id: ID!): Boolean!
  createComment(postId: ID!, content: String!): Comment!
  deleteComment(id: ID!): Boolean!
  addReaction(postId: ID, commentId: ID, type: ReactionType!): Reaction!
  removeReaction(postId: ID, commentId: ID, type: ReactionType!): Boolean!

  # Events
  createEvent(input: CreateEventInput!): Event! @requireRole(role: OFFICER)
  updateEvent(id: ID!, input: UpdateEventInput!): Event! @requireRole(role: OFFICER)
  deleteEvent(id: ID!): Boolean! @requireRole(role: OFFICER)
  registerForEvent(eventId: ID!): EventRegistration!
  unregisterFromEvent(eventId: ID!): Boolean!

  # Blog
  createBlogPost(input: CreateBlogPostInput!): BlogPost!
  updateBlogPost(id: ID!, input: UpdateBlogPostInput!): BlogPost!
  deleteBlogPost(id: ID!): Boolean!

  # Admin Content
  updateHomeContent(section: HomeSectionType!, input: UpdateHomeContentInput!): HomePageContent! @requireRole(role: ADMIN)
  createSponsor(input: CreateSponsorInput!): Sponsor! @requireRole(role: ADMIN)
  updateSponsor(id: ID!, input: UpdateSponsorInput!): Sponsor! @requireRole(role: ADMIN)
  deleteSponsor(id: ID!): Boolean! @requireRole(role: ADMIN)
  createTestimonial(input: CreateTestimonialInput!): Testimonial! @requireRole(role: ADMIN)
  updateTestimonial(id: ID!, input: UpdateTestimonialInput!): Testimonial! @requireRole(role: ADMIN)
  deleteTestimonial(id: ID!): Boolean! @requireRole(role: ADMIN)

  # Notifications
  markNotificationRead(id: ID!): Notification!
  markAllNotificationsRead: Boolean!
}
```

### Subscriptions (Future - Real-time)

```graphql
type Subscription {
  # Social feed updates
  postAdded: Post!
  commentAdded(postId: ID!): Comment!

  # Notifications
  notificationReceived: Notification!

  # Events
  eventCreated: Event!
  eventUpdated(eventId: ID!): Event!
}
```

## Type Definitions

### Core Types

```graphql
type User {
  id: ID!
  email: String!
  firstName: String!
  lastName: String!
  fullName: String! # Computed field
  role: Role!
  profileImageUrl: String
  bio: String
  joinDate: DateTime!
  lastLogin: DateTime
  isActive: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Post {
  id: ID!
  author: User!
  content: String!
  visibility: Visibility!
  comments: [Comment!]!
  reactions: [ReactionSummary!]!
  userReaction: ReactionType # Current user's reaction
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Event {
  id: ID!
  title: String!
  description: String!
  startTime: DateTime!
  endTime: DateTime!
  location: String
  visibility: Visibility!
  creator: User!
  registrationCount: Int!
  userRegistrationStatus: RegistrationStatus # Current user's status
  googleCalendarId: String
  facebookEventId: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

type BlogPost {
  id: ID!
  title: String!
  slug: String!
  content: String!
  excerpt: String
  author: User!
  visibility: Visibility!
  featuredImageUrl: String
  publishedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### Enums

```graphql
enum Role {
  MEMBER
  OFFICER
  ADMIN
}

enum Visibility {
  PUBLIC
  MEMBER_ONLY
}

enum ReactionType {
  LIKE
  HEART
  CELEBRATE
  SUPPORT
}

enum RegistrationStatus {
  REGISTERED
  WAITLISTED
  CANCELLED
}
```

### Input Types

```graphql
input RegisterInput {
  email: String!
  password: String!
  firstName: String!
  lastName: String!
}

input LoginInput {
  email: String!
  password: String!
}

input CreatePostInput {
  content: String!
  visibility: Visibility
}

input CreateEventInput {
  title: String!
  description: String!
  startTime: DateTime!
  endTime: DateTime!
  location: String
  visibility: Visibility!
  publishToGoogleCalendar: Boolean
  publishToFacebook: Boolean
}

input CreateBlogPostInput {
  title: String!
  content: String!
  excerpt: String
  visibility: Visibility!
  featuredImageUrl: String
  publishedAt: DateTime
  publishToFacebook: Boolean
}
```

### Response Types

```graphql
type AuthPayload {
  user: User!
  accessToken: String!
  refreshToken: String!
  expiresIn: Int!
}

type TokenPayload {
  accessToken: String!
  expiresIn: Int!
}

# Pagination (Relay-style connections)
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

## Backend Implementation

### Directory Structure

```
packages/backend/src/
├── graphql/
│   ├── schema/              # GraphQL schema files
│   │   ├── user.schema.ts   # User queries, mutations, types
│   │   ├── auth.schema.ts   # Authentication
│   │   ├── post.schema.ts   # Social feed
│   │   ├── event.schema.ts  # Events
│   │   ├── blog.schema.ts   # Blog
│   │   └── index.ts         # Combine all schemas
│   ├── resolvers/           # Resolver functions
│   │   ├── user.resolver.ts
│   │   ├── auth.resolver.ts
│   │   ├── post.resolver.ts
│   │   ├── event.resolver.ts
│   │   └── blog.resolver.ts
│   ├── directives/          # Custom directives
│   │   ├── auth.directive.ts    # @requireAuth
│   │   └── role.directive.ts    # @requireRole
│   ├── dataloaders/         # DataLoader instances
│   │   ├── user.loader.ts
│   │   └── event.loader.ts
│   └── context.ts           # GraphQL context builder
├── services/                # Business logic (same as before)
├── models/                  # Database models
└── server.ts               # Apollo Server setup
```

### Example Resolver (TypeGraphQL)

```typescript
// graphql/resolvers/user.resolver.ts
import { Resolver, Query, Mutation, Arg, Ctx, Authorized } from 'type-graphql';
import { User } from '../schema/user.schema';
import { UserService } from '../../services/user.service';
import { Context } from '../context';

@Resolver(User)
export class UserResolver {
  constructor(private userService: UserService) {}

  @Query(() => User, { nullable: true })
  @Authorized()
  async me(@Ctx() ctx: Context): Promise<User | null> {
    return ctx.user || null;
  }

  @Query(() => [User])
  @Authorized()
  async users(
    @Arg('page', { defaultValue: 1 }) page: number,
    @Arg('pageSize', { defaultValue: 20 }) pageSize: number,
    @Arg('search', { nullable: true }) search?: string
  ): Promise<User[]> {
    return this.userService.getUsers({ page, pageSize, search });
  }

  @Query(() => User, { nullable: true })
  async user(@Arg('id') id: string): Promise<User | null> {
    return this.userService.getUserById(id);
  }
}
```

## Frontend Implementation

### Apollo Client Setup

```typescript
// frontend/src/lib/apollo.ts
import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql',
  credentials: 'include', // Include cookies for refresh token
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, extensions }) => {
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Handle token refresh
      }
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
```

### Example Query Hook

```typescript
// frontend/src/hooks/useUsers.ts
import { gql, useQuery } from '@apollo/client';

const GET_USERS = gql`
  query GetUsers($page: Int, $pageSize: Int, $search: String) {
    users(page: $page, pageSize: $pageSize, search: $search) {
      id
      firstName
      lastName
      email
      role
      profileImageUrl
    }
  }
`;

export function useUsers(page = 1, pageSize = 20, search?: string) {
  const { data, loading, error, refetch } = useQuery(GET_USERS, {
    variables: { page, pageSize, search },
  });

  return {
    users: data?.users || [],
    loading,
    error,
    refetch,
  };
}
```

### Example Mutation Hook

```typescript
// frontend/src/hooks/useCreatePost.ts
import { gql, useMutation } from '@apollo/client';

const CREATE_POST = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      content
      visibility
      author {
        id
        firstName
        lastName
      }
      createdAt
    }
  }
`;

export function useCreatePost() {
  const [createPost, { loading, error }] = useMutation(CREATE_POST, {
    // Refetch posts after creating
    refetchQueries: ['GetPosts'],
  });

  return { createPost, loading, error };
}
```

## Authentication Flow with GraphQL

1. **Login Mutation**:
   ```graphql
   mutation Login($input: LoginInput!) {
     login(input: $input) {
       user { id, email, firstName, lastName, role }
       accessToken
       refreshToken
       expiresIn
     }
   }
   ```

2. **Store tokens**:
   - Access token → localStorage (short-lived, 15 min)
   - Refresh token → HttpOnly cookie (long-lived, 7 days)

3. **Include access token** in every request via Authorization header

4. **Token refresh** when access token expires:
   ```graphql
   mutation RefreshToken($refreshToken: String!) {
     refreshToken(refreshToken: $refreshToken) {
       accessToken
       expiresIn
     }
   }
   ```

## Performance Optimizations

### DataLoader (N+1 Problem Prevention)

```typescript
// graphql/dataloaders/user.loader.ts
import DataLoader from 'dataloader';
import { User } from '../schema/user.schema';
import db from '../../models/database';

export function createUserLoader() {
  return new DataLoader<string, User>(async (userIds) => {
    const users = await db.query(
      'SELECT * FROM users WHERE id = ANY($1)',
      [userIds]
    );

    // Return users in same order as requested IDs
    const userMap = new Map(users.rows.map(u => [u.id, u]));
    return userIds.map(id => userMap.get(id)!);
  });
}
```

### Caching Strategy

Apollo Client automatically caches query results by type and ID:

```typescript
// Configure cache normalization
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        posts: {
          keyArgs: ['visibility'],
          merge(existing, incoming, { args }) {
            // Handle pagination merging
          },
        },
      },
    },
  },
});
```

## Testing GraphQL

### Backend Tests

```typescript
// Test resolvers
describe('UserResolver', () => {
  it('should return current user for me query', async () => {
    const result = await testServer.executeOperation({
      query: 'query { me { id email } }',
    }, {
      contextValue: { user: mockUser },
    });

    expect(result.data?.me).toEqual({ id: mockUser.id, email: mockUser.email });
  });
});
```

### Frontend Tests

```typescript
// Test with MockedProvider
import { MockedProvider } from '@apollo/client/testing';

const mocks = [
  {
    request: { query: GET_USERS },
    result: { data: { users: [mockUser1, mockUser2] } },
  },
];

render(
  <MockedProvider mocks={mocks}>
    <UserList />
  </MockedProvider>
);
```

## Benefits Summary

✅ **Type Safety**: End-to-end type safety from database → resolvers → frontend
✅ **Efficiency**: No over-fetching, DataLoader prevents N+1 queries
✅ **Developer Experience**: GraphQL Playground, introspection, auto-complete
✅ **Flexibility**: Frontend decides what data it needs
✅ **Future-proof**: Easy to add subscriptions for real-time features
✅ **Single Endpoint**: Simpler deployment and monitoring
✅ **Self-documenting**: Schema serves as API documentation
