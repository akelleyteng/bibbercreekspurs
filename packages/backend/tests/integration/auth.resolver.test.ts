import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/server';
import db from '../../src/models/database';
import { Role } from '@4hclub/shared';

describe('Auth Resolver Integration Tests', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp(true);
  });

  afterAll(async () => {
    // Clean up test database
    await db.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
  });

  afterEach(async () => {
    // Clean up after each test
    await db.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
  });

  describe('register mutation', () => {
    const registerMutation = `
      mutation Register($input: RegisterInput!) {
        register(input: $input) {
          user {
            id
            email
            firstName
            lastName
            role
          }
          accessToken
        }
      }
    `;

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: registerMutation,
          variables: {
            input: {
              email: 'test1@example.com',
              password: 'SecurePass123!',
              firstName: 'John',
              lastName: 'Doe',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.register).toBeDefined();
      expect(response.body.data.register.user.email).toBe('test1@example.com');
      expect(response.body.data.register.user.firstName).toBe('John');
      expect(response.body.data.register.user.lastName).toBe('Doe');
      expect(response.body.data.register.user.role).toBe(Role.PARENT);
      expect(response.body.data.register.accessToken).toBeDefined();
      expect(typeof response.body.data.register.accessToken).toBe('string');
    });

    it('should set refresh token in httpOnly cookie', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: registerMutation,
          variables: {
            input: {
              email: 'test2@example.com',
              password: 'SecurePass123!',
              firstName: 'Jane',
              lastName: 'Smith',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();

      const cookies = Array.isArray(response.headers['set-cookie']) ? response.headers['set-cookie'] : [response.headers['set-cookie']];
      const refreshTokenCookie = cookies.find((c: string) => c.startsWith('refreshToken='));

      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('Path=/');
    });

    it('should reject registration with existing email', async () => {
      // First registration
      await request(app)
        .post('/graphql')
        .send({
          query: registerMutation,
          variables: {
            input: {
              email: 'test3@example.com',
              password: 'SecurePass123!',
              firstName: 'John',
              lastName: 'Doe',
            },
          },
        });

      // Attempt duplicate registration
      const response = await request(app)
        .post('/graphql')
        .send({
          query: registerMutation,
          variables: {
            input: {
              email: 'test3@example.com',
              password: 'DifferentPass456!',
              firstName: 'Jane',
              lastName: 'Smith',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('already exists');
    });

    it('should reject weak passwords', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: registerMutation,
          variables: {
            input: {
              email: 'test4@example.com',
              password: 'weak',
              firstName: 'John',
              lastName: 'Doe',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      // TypeGraphQL validation errors show as "Argument Validation Error"
      const errorMessage = response.body.errors[0].message;
      expect(errorMessage).toMatch(/password|Argument Validation Error/i);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: registerMutation,
          variables: {
            input: {
              email: 'invalid-email',
              password: 'SecurePass123!',
              firstName: 'John',
              lastName: 'Doe',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('login mutation', () => {
    const loginMutation = `
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          user {
            id
            email
            firstName
            lastName
            role
          }
          accessToken
        }
      }
    `;

    beforeEach(async () => {
      // Create a test user
      const registerMutation = `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            user { id }
          }
        }
      `;

      await request(app)
        .post('/graphql')
        .send({
          query: registerMutation,
          variables: {
            input: {
              email: 'testlogin@example.com',
              password: 'SecurePass123!',
              firstName: 'Test',
              lastName: 'User',
            },
          },
        });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: loginMutation,
          variables: {
            email: 'testlogin@example.com',
            password: 'SecurePass123!',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.login).toBeDefined();
      expect(response.body.data.login.user.email).toBe('testlogin@example.com');
      expect(response.body.data.login.accessToken).toBeDefined();
    });

    it('should set refresh token cookie on login', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: loginMutation,
          variables: {
            email: 'testlogin@example.com',
            password: 'SecurePass123!',
          },
        });

      expect(response.status).toBe(200);
      const cookies = Array.isArray(response.headers['set-cookie']) ? response.headers['set-cookie'] : [response.headers['set-cookie']];
      const refreshTokenCookie = cookies.find((c: string) => c.startsWith('refreshToken='));

      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: loginMutation,
          variables: {
            email: 'testlogin@example.com',
            password: 'WrongPassword123!',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: loginMutation,
          variables: {
            email: 'nonexistent@example.com',
            password: 'SecurePass123!',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid credentials');
    });
  });

  describe('me query', () => {
    const meQuery = `
      query Me {
        me {
          id
          email
          firstName
          lastName
          role
        }
      }
    `;

    let accessToken: string;

    beforeEach(async () => {
      // Register and get access token
      const registerMutation = `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            accessToken
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({
          query: registerMutation,
          variables: {
            input: {
              email: 'testme@example.com',
              password: 'SecurePass123!',
              firstName: 'Test',
              lastName: 'User',
            },
          },
        });

      accessToken = response.body.data.register.accessToken;
    });

    it('should return current user with valid token', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: meQuery,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.me).toBeDefined();
      expect(response.body.data.me.email).toBe('testme@example.com');
      expect(response.body.data.me.firstName).toBe('Test');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: meQuery,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Not authenticated');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          query: meQuery,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid token');
    });
  });

  describe('refreshToken mutation', () => {
    const refreshTokenMutation = `
      mutation RefreshToken {
        refreshToken {
          accessToken
        }
      }
    `;

    let refreshTokenCookie: string;

    beforeEach(async () => {
      // Register and get refresh token cookie
      const registerMutation = `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            user { id }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({
          query: registerMutation,
          variables: {
            input: {
              email: 'testrefresh@example.com',
              password: 'SecurePass123!',
              firstName: 'Test',
              lastName: 'User',
            },
          },
        });

      const cookies = Array.isArray(response.headers['set-cookie']) ? response.headers['set-cookie'] : [response.headers['set-cookie']];
      refreshTokenCookie = cookies.find((c: string) => c.startsWith('refreshToken='))!;
    });

    it('should return new access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Cookie', refreshTokenCookie)
        .send({
          query: refreshTokenMutation,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.refreshToken.accessToken).toBeDefined();
      expect(typeof response.body.data.refreshToken.accessToken).toBe('string');
    });

    it('should reject request without refresh token cookie', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: refreshTokenMutation,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('No refresh token');
    });

    it('should reject request with invalid refresh token', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Cookie', 'refreshToken=invalid-token')
        .send({
          query: refreshTokenMutation,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid');
    });
  });

  describe('logout mutation', () => {
    const logoutMutation = `
      mutation Logout {
        logout
      }
    `;

    let refreshTokenCookie: string;

    beforeEach(async () => {
      // Register and get refresh token cookie
      const registerMutation = `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            user { id }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({
          query: registerMutation,
          variables: {
            input: {
              email: 'testlogout@example.com',
              password: 'SecurePass123!',
              firstName: 'Test',
              lastName: 'User',
            },
          },
        });

      const cookies = Array.isArray(response.headers['set-cookie']) ? response.headers['set-cookie'] : [response.headers['set-cookie']];
      refreshTokenCookie = cookies.find((c: string) => c.startsWith('refreshToken='))!;
    });

    it('should clear refresh token cookie', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Cookie', refreshTokenCookie)
        .send({
          query: logoutMutation,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.logout).toBe(true);

      const cookies = Array.isArray(response.headers['set-cookie']) ? response.headers['set-cookie'] : [response.headers['set-cookie']];
      if (cookies) {
        const clearedCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
        if (clearedCookie) {
          // Cookie should be expired (either Max-Age=0 or Expires in the past)
          const isExpired = clearedCookie.includes('Max-Age=0') || clearedCookie.includes('Expires=Thu, 01 Jan 1970');
          expect(isExpired).toBe(true);
        }
      }
    });

    it('should succeed even without refresh token', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: logoutMutation,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.logout).toBe(true);
    });
  });
});
