import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { logger } from './utils/logger';

// Catch uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err: Error) => {
  logger.error('Fatal Uncaught Exception', err);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Promise Rejection', reason);
});

const PORT = process.env.PORT || 5000;
const app = createApp();

app.listen(PORT, () => {
  logger.info(`Cash Flow Server started on port ${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
  console.log(`🚀 Cash Flow Management Server running on http://localhost:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});
