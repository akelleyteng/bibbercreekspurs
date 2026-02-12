import { startServer } from './server';
import { logger } from './utils/logger';

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
