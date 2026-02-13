import { startServer } from './server';
import { logger } from './utils/logger';

// Start the server
startServer().catch((error) => {
  // Write to stderr directly — Winston may not flush before process.exit
  console.error('FATAL: Failed to start server:', error);
  logger.error('Failed to start server:', error);
  process.exit(1);
});
