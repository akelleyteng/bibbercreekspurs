import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/server';

describe('Server Integration Tests', () => {
  let app: Express;

  beforeAll(async () => {
    // Create app with GraphQL enabled for testing
    app = await createApp(true);
  });

  afterAll(async () => {
    // No cleanup needed
  });

  describe('Server Startup', () => {
    it('should create Express app successfully', async () => {
      expect(app).toBeDefined();
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return 200 OK with database status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('database');
      expect(response.body.status).toBe('ok');
    });

    it('should include timestamp in health check', async () => {
      const response = await request(app).get('/health');

      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('string');
    });
  });

  describe('GraphQL Endpoint', () => {
    it('should be accessible at /graphql', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: '{ __typename }',
        });

      // Should return 200 or 400 (not 404)
      expect(response.status).not.toBe(404);
      expect([200, 400]).toContain(response.status);
    });

    it('should respond to introspection query', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: `{
            __schema {
              queryType {
                name
              }
            }
          }`,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('__schema');
    });
  });

  describe('Security Middleware', () => {
    it('should set security headers', async () => {
      const response = await request(app).get('/health');

      // Helmet sets these headers
      expect(response.headers).toHaveProperty('x-dns-prefetch-control');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    it('should enable CORS for frontend origin', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5173');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
    });

    it('should handle errors gracefully', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({ query: 'invalid query' });

      // Should not crash, should return error response
      expect(response.status).toBeDefined();
      expect(response.status).not.toBe(404);
      expect([400, 500]).toContain(response.status);
    });
  });
});
