import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import routes from './routes';

export const createApp = () => {
  const app = express();

  // Security Middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  app.use(cors({
    origin: [clientUrl, 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
  }));

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static uploads directory for receipts
  const uploadDir = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadDir));

  // Mount API Routes
  app.use('/api', routes);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Global Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled Application Error:', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  });

  return app;
};
