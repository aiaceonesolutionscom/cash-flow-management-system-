import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import routes from './routes';
import { logger } from './utils/logger';

export const createApp = () => {
  const app = express();

  // Hide technology fingerprinting
  app.disable('x-powered-by');

  // OWASP ASVS V3 & V13 Security Headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Allows bundled SPA assets and styles
    frameguard: { action: "deny" },
    noSniff: true,
    xssFilter: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  app.use(cors({
    origin: [clientUrl, 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
  }));

  app.use(cookieParser());
  // Prevent DoS via oversized payload
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Mount API Routes
  app.use('/api', routes);

  // Serve Uploaded Receipts & Slips
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Serve Frontend Single-Page App (SPA) in Production / cPanel
  const clientDistPaths = [
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(__dirname, '../client/dist'),
  ];
  const staticPath = clientDistPaths.find((p) => fs.existsSync(p));

  if (staticPath) {
    app.use(express.static(staticPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
        return next();
      }
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  // Global Error Handler (Logs exact line, route, IP and stack trace to logs/error.log)
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error(`Application Error on ${req.method} ${req.originalUrl || req.url}`, err, req);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  });

  return app;
};
