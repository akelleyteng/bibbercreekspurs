import 'reflect-metadata';
import express, { Express, Request, Response } from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { buildSchema } from 'type-graphql';
import { DateTimeISOResolver } from 'graphql-scalars';
import db from './models/database';
import { logger } from './utils/logger';
import { getEnvVar } from './config/env';
import { AuthResolver } from './graphql/resolvers/Auth.resolver';

export async function createApp(includeGraphQL: boolean = false): Promise<Express> {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  }));

  // CORS configuration
  app.use(cors({
    origin: getEnvVar('FRONTEND_URL', 'http://localhost:5173'),
    credentials: true,
  }));

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // HTTP request logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    }));
  }

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api', limiter);

  // Health check endpoint
  app.get('/health', async (req: Request, res: Response) => {
    try {
      // Check database connection
      const dbHealth = await db.healthCheck();

      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbHealth ? 'connected' : 'disconnected',
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      });
    }
  });

  // Add GraphQL middleware if requested (for testing)
  if (includeGraphQL) {
    const schema = await buildSchema({
      resolvers: [AuthResolver],
      scalarsMap: [{ type: Date, scalar: DateTimeISOResolver }],
      validate: true, // Enable class-validator validation
    });

    const apolloServer = new ApolloServer({
      schema,
    });

    await apolloServer.start();

    app.use(
      '/graphql',
      cors<cors.CorsRequest>({
        origin: getEnvVar('FRONTEND_URL', 'http://localhost:5173'),
        credentials: true,
      }),
      express.json(),
      expressMiddleware(apolloServer, {
        context: async ({ req, res }) => ({ req, res }),
      })
    );

    // 404 handler (after GraphQL)
    app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    app.use((err: Error, req: Request, res: Response, next: any) => {
      logger.error('Server error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  return app;
}

export async function startServer(): Promise<http.Server> {
  const app = await createApp();
  const httpServer = http.createServer(app);

  // Build GraphQL schema
  const schema = await buildSchema({
    resolvers: [AuthResolver],
    scalarsMap: [{ type: Date, scalar: DateTimeISOResolver }],
    validate: true, // Enable class-validator validation
  });

  // Create Apollo Server
  const apolloServer = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await apolloServer.start();

  // Apply GraphQL middleware
  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin: getEnvVar('FRONTEND_URL', 'http://localhost:5173'),
      credentials: true,
    }),
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req, res }) => ({ req, res }),
    })
  );

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: any) => {
    logger.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Start server
  const PORT = parseInt(getEnvVar('PORT', '4000'), 10);

  return new Promise((resolve) => {
    const server = httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server ready at http://0.0.0.0:${PORT}`);
      logger.info(`📊 GraphQL endpoint: http://0.0.0.0:${PORT}/graphql`);
      resolve(server);
    });
  });
}

// Start server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

// Export for testing
export default { createApp, startServer };
