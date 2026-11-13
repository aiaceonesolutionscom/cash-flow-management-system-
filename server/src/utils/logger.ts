import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'logs');
const ERROR_LOG_PATH = path.join(LOGS_DIR, 'error.log');
const APP_LOG_PATH = path.join(LOGS_DIR, 'app.log');
const MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// Ensure logs directory exists
const ensureLogDir = () => {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
};

// Rotate log file if exceeds max size
const rotateIfNeeded = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size >= MAX_LOG_SIZE_BYTES) {
        const oldPath = `${filePath}.old`;
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
        fs.renameSync(filePath, oldPath);
      }
    }
  } catch (err) {
    console.error('Failed to rotate log file:', err);
  }
};

const formatTimestamp = () => new Date().toISOString();

export const logger = {
  info: (message: string, meta?: any) => {
    ensureLogDir();
    rotateIfNeeded(APP_LOG_PATH);
    const logLine = `[${formatTimestamp()}] [INFO] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}\n`;
    console.log(`ℹ️ [INFO] ${message}`, meta || '');
    try {
      fs.appendFileSync(APP_LOG_PATH, logLine, 'utf8');
    } catch (e) {
      console.error('Failed to write to app.log', e);
    }
  },

  warn: (message: string, meta?: any) => {
    ensureLogDir();
    rotateIfNeeded(APP_LOG_PATH);
    const logLine = `[${formatTimestamp()}] [WARN] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}\n`;
    console.warn(`⚠️ [WARN] ${message}`, meta || '');
    try {
      fs.appendFileSync(APP_LOG_PATH, logLine, 'utf8');
    } catch (e) {
      console.error('Failed to write to app.log', e);
    }
  },

  error: (message: string, error?: any, req?: any) => {
    ensureLogDir();
    rotateIfNeeded(ERROR_LOG_PATH);

    const timestamp = formatTimestamp();
    let errorDetails: { message: string; stack?: string };
    if (error instanceof Error) {
      errorDetails = { message: error.message, stack: error.stack };
    } else if (error && typeof error === 'object') {
      errorDetails = {
        message: error.message || JSON.stringify(error),
        stack: error.stack
      };
    } else {
      errorDetails = { message: error ? String(error) : message };
    }

    const reqDetails = req ? {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.connection?.remoteAddress,
      userId: req.user?.id || 'anonymous',
      params: req.params,
      query: req.query,
      body: req.body ? sanitizeBody(req.body) : undefined
    } : undefined;

    const entry = {
      timestamp,
      level: 'ERROR',
      message,
      error: errorDetails,
      request: reqDetails
    };

    const logLine = JSON.stringify(entry) + '\n';
    console.error(`❌ [ERROR ${timestamp}] ${message}:`, errorDetails.message);
    if (errorDetails.stack) {
      console.error(errorDetails.stack);
    }

    try {
      fs.appendFileSync(ERROR_LOG_PATH, logLine, 'utf8');
    } catch (e) {
      console.error('Failed to write to error.log', e);
    }
  },

  getRecentErrors: (maxLines = 100): Array<any> => {
    ensureLogDir();
    if (!fs.existsSync(ERROR_LOG_PATH)) {
      return [];
    }

    try {
      const content = fs.readFileSync(ERROR_LOG_PATH, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      const recent = lines.slice(-maxLines).reverse();

      return recent.map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return {
            timestamp: formatTimestamp(),
            level: 'ERROR',
            message: line,
            error: { message: line }
          };
        }
      });
    } catch (err) {
      console.error('Failed to read error.log', err);
      return [];
    }
  },

  clearErrors: () => {
    ensureLogDir();
    try {
      if (fs.existsSync(ERROR_LOG_PATH)) {
        fs.writeFileSync(ERROR_LOG_PATH, '', 'utf8');
      }
      return true;
    } catch (err) {
      console.error('Failed to clear error.log', err);
      return false;
    }
  },

  getErrorLogPath: () => ERROR_LOG_PATH,

  getLogStats: () => {
    ensureLogDir();
    let errorSize = 0;
    let appSize = 0;
    let errorModified: Date | null = null;

    if (fs.existsSync(ERROR_LOG_PATH)) {
      const s = fs.statSync(ERROR_LOG_PATH);
      errorSize = s.size;
      errorModified = s.mtime;
    }
    if (fs.existsSync(APP_LOG_PATH)) {
      appSize = fs.statSync(APP_LOG_PATH).size;
    }

    return {
      errorLogSize: (errorSize / 1024).toFixed(2) + ' KB',
      appLogSize: (appSize / 1024).toFixed(2) + ' KB',
      lastErrorTime: errorModified
    };
  }
};

// Mask sensitive credentials from request body logs
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const clone = { ...body };
  const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'cookie'];
  for (const k of Object.keys(clone)) {
    if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
      clone[k] = '***REDACTED***';
    } else if (typeof clone[k] === 'object') {
      clone[k] = sanitizeBody(clone[k]);
    }
  }
  return clone;
}
