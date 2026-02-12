import request from 'supertest';
import { Express } from 'express';

describe('Server Integration Tests', () => {
  let app: Express;
  let server: any;

  beforeAll(async () => {
    // Will import and start server here
    // For now, tests will fail - that's expected in TDD!
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  describe('Server Startup', () => {
    it('should start server on port 4000', async () => {
      // Test will fail until we implement server.ts
      expect(server).toBeDefined();
      expect(server.listening).toBe(true);
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
      expect([400, 500]).toContain(response.status);
    });
  });
});
